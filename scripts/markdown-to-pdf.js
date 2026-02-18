#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 64;
const MARGIN_LEFT = 64;
const MARGIN_RIGHT = 64;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function stripInlineMarkdown(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "[image: $1]")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1");
}

function estimateTextWidth(text, fontSize, mono) {
  const widthFactor = mono ? 0.6 : 0.52;
  return text.length * fontSize * widthFactor;
}

function wrapText(text, maxWidth, fontSize, mono) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const words = normalized.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateTextWidth(candidate, fontSize, mono) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (estimateTextWidth(word, fontSize, mono) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const next = `${chunk}${char}`;
      if (estimateTextWidth(next, fontSize, mono) <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function parseBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  let inCode = false;
  let codeLanguage = "";
  let codeLines = [];

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (inCode) {
      if (/^```/.test(trimmed)) {
        blocks.push({ type: "code", language: codeLanguage, lines: codeLines });
        inCode = false;
        codeLanguage = "";
        codeLines = [];
      } else {
        codeLines.push(line.replace(/\t/g, "    "));
      }
      index += 1;
      continue;
    }

    if (trimmed === "") {
      blocks.push({ type: "blank" });
      index += 1;
      continue;
    }

    const codeFence = trimmed.match(/^```([\w-]+)?\s*$/);
    if (codeFence) {
      inCode = true;
      codeLanguage = codeFence[1] || "";
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim()
      });
      index += 1;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s*[-*+]\s+(.*)$/);
        if (!match) break;
        items.push({ ordered: false, text: match[1].trim() });
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s*(\d+)\.\s+(.*)$/);
        if (!match) break;
        items.push({ ordered: true, index: Number(match[1]), text: match[2].trim() });
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index];
      const nextTrimmed = nextLine.trim();
      if (
        nextTrimmed === "" ||
        /^```/.test(nextTrimmed) ||
        /^(#{1,6})\s+/.test(nextLine) ||
        /^\s*[-*+]\s+/.test(nextLine) ||
        /^\s*\d+\.\s+/.test(nextLine)
      ) {
        break;
      }
      paragraph.push(nextTrimmed);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  if (inCode) {
    blocks.push({ type: "code", language: codeLanguage, lines: codeLines });
  }

  return blocks;
}

function buildPdfFromCommands(pageCommands) {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const monoFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

  const pageEntries = pageCommands.map((commands) => {
    const stream = commands.join("\n");
    const contentId = addObject(
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
    );
    const pageId = addObject("");
    return { contentId, pageId };
  });

  const pagesId = addObject("");

  for (const page of pageEntries) {
    objects[page.pageId - 1] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R /F3 ${monoFontId} 0 R >> >> ` +
      `/Contents ${page.contentId} 0 R >>`;
  }

  const kids = pageEntries.map((page) => `${page.pageId} 0 R`).join(" ");
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids}] /Count ${pageEntries.length} >>`;

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let output = "%PDF-1.4\n%AXRA\n";
  const offsets = [0];

  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(output, "utf8"));
    output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(output, "utf8");
  output += `xref\n0 ${objects.length + 1}\n`;
  output += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    output += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  output += `startxref\n${xrefOffset}\n%%EOF\n`;

  return output;
}

function convertMarkdownToPdf(inputPath, outputPath) {
  const markdown = fs.readFileSync(inputPath, "utf8");
  const blocks = parseBlocks(markdown);
  const pages = [[]];
  let currentPage = 0;
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;

  const fontName = {
    regular: "F1",
    bold: "F2",
    mono: "F3"
  };

  const ensureSpace = (heightNeeded) => {
    if (cursorY - heightNeeded < MARGIN_BOTTOM) {
      pages.push([]);
      currentPage = pages.length - 1;
      cursorY = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const drawLine = (text, options = {}) => {
    const {
      font = "regular",
      size = 12,
      indent = 0
    } = options;
    const lineHeight = size * 1.35;
    ensureSpace(lineHeight);
    const x = MARGIN_LEFT + indent;
    const y = cursorY;
    pages[currentPage].push(
      `BT /${fontName[font]} ${size.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(
        text
      )}) Tj ET`
    );
    cursorY -= lineHeight;
  };

  const addSpacing = (value) => {
    cursorY -= value;
    if (cursorY < MARGIN_BOTTOM) {
      pages.push([]);
      currentPage = pages.length - 1;
      cursorY = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const renderWrapped = (text, options = {}) => {
    const {
      font = "regular",
      size = 12,
      indent = 0
    } = options;
    const mono = font === "mono";
    const lines = wrapText(stripInlineMarkdown(text), CONTENT_WIDTH - indent, size, mono);
    for (const line of lines) {
      drawLine(line, { font, size, indent });
    }
  };

  for (const block of blocks) {
    if (block.type === "blank") {
      addSpacing(6);
      continue;
    }

    if (block.type === "heading") {
      const headingSizes = { 1: 28, 2: 22, 3: 18, 4: 15, 5: 13, 6: 12 };
      const size = headingSizes[block.level] || 12;
      renderWrapped(block.text, { font: "bold", size });
      addSpacing(block.level <= 2 ? 10 : 6);
      continue;
    }

    if (block.type === "paragraph") {
      renderWrapped(block.text, { font: "regular", size: 12 });
      addSpacing(8);
      continue;
    }

    if (block.type === "list") {
      for (let i = 0; i < block.items.length; i += 1) {
        const item = block.items[i];
        const marker = item.ordered ? `${item.index}. ` : "- ";
        const markerWidth = estimateTextWidth(marker, 12, false);
        const wrapped = wrapText(
          stripInlineMarkdown(item.text),
          CONTENT_WIDTH - 18 - markerWidth,
          12,
          false
        );
        if (wrapped.length > 0) {
          drawLine(`${marker}${wrapped[0]}`, { font: "regular", size: 12, indent: 18 });
          for (let j = 1; j < wrapped.length; j += 1) {
            drawLine(wrapped[j], { font: "regular", size: 12, indent: 18 + markerWidth });
          }
        }
        addSpacing(2);
      }
      addSpacing(6);
      continue;
    }

    if (block.type === "code") {
      if (block.language) {
        drawLine(`Code (${block.language}):`, { font: "bold", size: 10, indent: 8 });
      }
      for (const codeLine of block.lines) {
        const wrapped = wrapText(codeLine || " ", CONTENT_WIDTH - 16, 10, true);
        for (const segment of wrapped) {
          drawLine(segment, { font: "mono", size: 10, indent: 16 });
        }
      }
      addSpacing(8);
    }
  }

  if (pages.length === 0 || pages[0].length === 0) {
    pages[0] = [
      `BT /F1 12 Tf 1 0 0 1 ${MARGIN_LEFT.toFixed(2)} ${(PAGE_HEIGHT - MARGIN_TOP).toFixed(
        2
      )} Tm ( ) Tj ET`
    ];
  }

  const pdfContent = buildPdfFromCommands(pages);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pdfContent, "utf8");
}

function runCli() {
  const inputArg = process.argv[2];
  const outputArg = process.argv[3];

  if (!inputArg || !outputArg) {
    console.error("Usage: node scripts/markdown-to-pdf.js <input.md> <output.pdf>");
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputPath = path.resolve(process.cwd(), outputArg);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  convertMarkdownToPdf(inputPath, outputPath);
  console.log(`PDF written to ${outputPath}`);
}

if (require.main === module) {
  runCli();
}

module.exports = { convertMarkdownToPdf };
