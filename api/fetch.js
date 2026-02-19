/* =========================================================
   MarkLiveEdit — api/fetch.js
   Vercel serverless proxy: fetches a URL and returns its HTML
   ========================================================= */

const http = require("http");
const https = require("https");
const { URL } = require("url");

// Private IP ranges to block (SSRF protection)
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
  /^::1$/,
  /^localhost$/i,
];

function isPrivateHost(hostname) {
  return PRIVATE_RANGES.some(function (re) {
    return re.test(hostname);
  });
}

function fetchUrl(urlStr, redirectCount) {
  if (redirectCount === undefined) redirectCount = 0;
  if (redirectCount > 5) {
    return Promise.reject(new Error("Too many redirects"));
  }

  return new Promise(function (resolve, reject) {
    var parsed;
    try {
      parsed = new URL(urlStr);
    } catch (_) {
      return reject(new Error("Invalid URL"));
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return reject(new Error("Only http and https URLs are supported"));
    }

    if (isPrivateHost(parsed.hostname)) {
      return reject(new Error("Private/internal URLs are not allowed"));
    }

    var client = parsed.protocol === "https:" ? https : http;
    var req = client.get(
      urlStr,
      {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MarkLiveEdit/1.0; +https://markdown.useaxra.com)",
          Accept: "text/html,application/xhtml+xml,*/*",
        },
      },
      function (res) {
        // Handle redirects
        if (
          [301, 302, 303, 307, 308].indexOf(res.statusCode) !== -1 &&
          res.headers.location
        ) {
          var next;
          try {
            next = new URL(res.headers.location, urlStr).href;
          } catch (_) {
            return reject(new Error("Invalid redirect URL"));
          }
          res.resume();
          return fetchUrl(next, redirectCount + 1).then(resolve, reject);
        }

        if (res.statusCode < 200 || res.statusCode >= 400) {
          res.resume();
          return reject(
            new Error("Upstream returned status " + res.statusCode)
          );
        }

        var chunks = [];
        var totalSize = 0;
        var MAX_SIZE = 5 * 1024 * 1024; // 5MB

        res.on("data", function (chunk) {
          totalSize += chunk.length;
          if (totalSize > MAX_SIZE) {
            res.destroy();
            return reject(new Error("Response too large (max 5MB)"));
          }
          chunks.push(chunk);
        });

        res.on("end", function () {
          resolve(Buffer.concat(chunks).toString("utf-8"));
        });

        res.on("error", reject);
      }
    );

    req.on("timeout", function () {
      req.destroy();
      reject(new Error("Request timed out (10s)"));
    });

    req.on("error", function (err) {
      reject(new Error("Failed to fetch: " + err.message));
    });
  });
}

function extractTitle(html) {
  var match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match
    ? match[1].replace(/\s+/g, " ").trim()
    : "";
}

module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  var url = req.query && req.query.url;
  if (!url) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  // Basic URL validation
  var parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return res
      .status(400)
      .json({ error: "Only http and https URLs are supported" });
  }

  if (isPrivateHost(parsed.hostname)) {
    return res
      .status(403)
      .json({ error: "Private/internal URLs are not allowed" });
  }

  fetchUrl(url)
    .then(function (html) {
      var title = extractTitle(html);
      res.status(200).json({ html: html, title: title });
    })
    .catch(function (err) {
      res.status(502).json({ error: err.message || "Failed to fetch URL" });
    });
};
