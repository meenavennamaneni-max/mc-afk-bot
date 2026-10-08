const express = require("express");
const bedrock = require("bedrock-protocol");

const app = express();
const PORT = process.env.PORT || 10000;

// =========================
// CONFIG
// =========================

const HOST = process.env.MC_HOST;
const MC_PORT = Number(process.env.MC_PORT || 19132);
const USERNAME = process.env.MC_USERNAME;

const RECONNECT_DELAY = 10000;

// =========================
// RENDER WEB SERVER
// =========================

app.get("/", (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Bedrock AFK Bot</title>
      </head>
      <body>
        <h1>🟢 Bedrock AFK Bot</h1>
        <p>Bot service is running.</p>
        <p>Server: ${HOST || "Not configured"}</p>
        <p>Username: ${USERNAME || "Not configured"}</p>
      </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    bot: botConnected ? "connected" : "disconnected"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// =========================
// BOT
// =========================

let client = null;
let botConnected = false;
let reconnectTimer = null;

function connectBot() {
  if (!HOST || !USERNAME) {
    console.error("❌ MC_HOST or MC_USERNAME is missing.");
    return;
  }

  console.log(`🎮 Connecting to ${HOST}:${MC_PORT}...`);

  try {
    client = bedrock.createClient({
      host: HOST,
      port: MC_PORT,
      username: USERNAME,

      // Microsoft/Xbox authentication
      offline: false,

      // Keeps authentication/profile data in the
      // location supplied by the library.
      profilesFolder: "./profiles"
    });

    client.on("join", () => {
      botConnected = true;
      console.log("✅ Bot authenticated and joined the server.");
    });

    client.on("spawn", () => {
      botConnected = true;
      console.log("🟢 Bot spawned successfully.");
    });

    client.on("text", (packet) => {
      console.log(
        `[CHAT] ${packet.source_name || "Server"}: ${packet.message || ""}`
      );
    });

    client.on("kick", (reason) => {
      console.log("⚠️ Bot was kicked:", reason);
      botConnected = false;
    });

    client.on("close", () => {
      console.log("🔴 Connection closed.");
      botConnected = false;
      scheduleReconnect();
    });

    client.on("error", (error) => {
      console.error("❌ Bot error:", error.message || error);
      botConnected = false;
    });

  } catch (error) {
    console.error("❌ Connection failed:", error);
    botConnected = false;
    scheduleReconnect();
  }
}

// =========================
// AUTO RECONNECT
// =========================

function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (!botConnected) {
      connectBot();
    }
  }, RECONNECT_DELAY);
}

// =========================
// START
// =========================

console.log("🚀 Starting Bedrock AFK bot...");

setTimeout(() => {
  connectBot();
}, 2000);

// Prevent unexpected crashes from killing the service.
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});
