/* =========================================================
   MarkLiveEdit — modules/collab.js
   Feature 12: Collaborative Editing via PeerJS (WebRTC)
   ========================================================= */

(function () {
  "use strict";

  var peer = null;
  var connections = [];
  var roomId = null;
  var isHost = false;
  var syncTimer = null;
  var SYNC_DELAY = 500;
  var ignoreNextInput = false;

  function generateRoomId() {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var id = "";
    for (var i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "mle-" + id;
  }

  function updateCollabUI() {
    var statusEl = document.getElementById("collab-status");
    var createSection = document.getElementById("collab-create");
    var joinSection = document.getElementById("collab-join");
    var activeSection = document.getElementById("collab-active");
    var roomIdDisplay = document.getElementById("collab-room-id");
    var peerCountEl = document.getElementById("collab-peer-count");

    if (roomId) {
      createSection.hidden = true;
      joinSection.hidden = true;
      activeSection.hidden = false;
      roomIdDisplay.textContent = roomId;
      peerCountEl.textContent = connections.length + " peer" + (connections.length !== 1 ? "s" : "");
      statusEl.textContent = "Connected";
      statusEl.className = "collab-status connected";
    } else {
      createSection.hidden = false;
      joinSection.hidden = false;
      activeSection.hidden = true;
      statusEl.textContent = "Disconnected";
      statusEl.className = "collab-status";
    }
  }

  function broadcastContent() {
    if (connections.length === 0) return;
    var editor = document.getElementById("editor");
    var data = {
      type: "content",
      content: editor.value,
      cursor: editor.selectionStart
    };
    connections.forEach(function (conn) {
      try { conn.send(data); } catch (_) {}
    });
  }

  function scheduleBroadcast() {
    if (ignoreNextInput) {
      ignoreNextInput = false;
      return;
    }
    clearTimeout(syncTimer);
    syncTimer = setTimeout(broadcastContent, SYNC_DELAY);
  }

  function handleIncomingData(data) {
    if (data.type === "content") {
      var editor = document.getElementById("editor");
      var currentPos = editor.selectionStart;
      ignoreNextInput = true;
      editor.value = data.content;
      // Try to preserve cursor position
      editor.selectionStart = editor.selectionEnd = Math.min(currentPos, data.content.length);
      MLE.renderPreview();
      MLE.updateStats();
      MLE.saveContent();
    }
  }

  function setupConnection(conn) {
    connections.push(conn);
    updateCollabUI();

    conn.on("data", handleIncomingData);

    conn.on("close", function () {
      connections = connections.filter(function (c) { return c !== conn; });
      updateCollabUI();
      MLE.showToast("Peer disconnected", "warning");
    });

    conn.on("error", function () {
      connections = connections.filter(function (c) { return c !== conn; });
      updateCollabUI();
    });

    // Send current content to new peer
    setTimeout(function () {
      var editor = document.getElementById("editor");
      conn.send({ type: "content", content: editor.value, cursor: 0 });
    }, 500);
  }

  function createRoom() {
    if (typeof Peer === "undefined") {
      MLE.showToast("PeerJS library not loaded", "error");
      return;
    }

    roomId = generateRoomId();
    isHost = true;

    peer = new Peer(roomId);
    peer.on("open", function (id) {
      MLE.showToast("Room created: " + id, "success");
      updateCollabUI();

      // Listen for incoming connections
      peer.on("connection", function (conn) {
        conn.on("open", function () {
          setupConnection(conn);
          MLE.showToast("Peer connected!", "success");
        });
      });
    });

    peer.on("error", function (err) {
      MLE.showToast("Connection error: " + err.type, "error");
      disconnect();
    });

    // Bind editor input for broadcasting
    document.getElementById("editor").addEventListener("input", scheduleBroadcast);
  }

  function joinRoom() {
    if (typeof Peer === "undefined") {
      MLE.showToast("PeerJS library not loaded", "error");
      return;
    }

    var input = document.getElementById("collab-join-input");
    var targetId = input.value.trim();
    if (!targetId) {
      MLE.showToast("Enter a room ID", "error");
      return;
    }

    roomId = targetId;
    isHost = false;

    peer = new Peer();
    peer.on("open", function () {
      var conn = peer.connect(targetId, { reliable: true });
      conn.on("open", function () {
        setupConnection(conn);
        MLE.showToast("Connected to room!", "success");
      });
      conn.on("error", function () {
        MLE.showToast("Failed to connect", "error");
        disconnect();
      });
    });

    peer.on("error", function (err) {
      MLE.showToast("Connection error: " + err.type, "error");
      disconnect();
    });

    // Bind editor input for broadcasting
    document.getElementById("editor").addEventListener("input", scheduleBroadcast);
  }

  function disconnect() {
    connections.forEach(function (conn) {
      try { conn.close(); } catch (_) {}
    });
    connections = [];

    if (peer) {
      try { peer.destroy(); } catch (_) {}
      peer = null;
    }

    roomId = null;
    isHost = false;
    clearTimeout(syncTimer);
    updateCollabUI();
    MLE.showToast("Disconnected", "success");
  }

  function copyRoomId() {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(function () {
      MLE.showToast("Room ID copied", "success");
    }).catch(function () {
      MLE.showToast("Could not copy", "error");
    });
  }

  function bindCollab() {
    var collabBtn = document.getElementById("collab-btn");
    var collabPanel = document.getElementById("collab-panel");
    var collabClose = document.getElementById("collab-close");
    var createBtn = document.getElementById("collab-create-btn");
    var joinBtn = document.getElementById("collab-join-btn");
    var disconnectBtn = document.getElementById("collab-disconnect-btn");
    var copyIdBtn = document.getElementById("collab-copy-id");

    if (collabBtn) {
      collabBtn.addEventListener("click", function () {
        MLE.togglePanel(collabPanel);
      });
    }
    if (collabClose) {
      collabClose.addEventListener("click", function () { collabPanel.hidden = true; });
    }
    if (createBtn) createBtn.addEventListener("click", createRoom);
    if (joinBtn) joinBtn.addEventListener("click", joinRoom);
    if (disconnectBtn) disconnectBtn.addEventListener("click", disconnect);
    if (copyIdBtn) copyIdBtn.addEventListener("click", copyRoomId);

    // Cleanup on page unload
    window.addEventListener("beforeunload", function () {
      if (peer) {
        connections.forEach(function (c) { try { c.close(); } catch (_) {} });
        try { peer.destroy(); } catch (_) {}
      }
    });
  }

  window.MLE = window.MLE || {};
  window.MLE.bindCollab = bindCollab;
})();
