#!/usr/bin/env node
// Tiny deploy-webhook server — listens on the Docker bridge interface only.
// Containers can trigger it; it is not exposed to the internet.
// Auth: secret token in query param (?token=...), set via UPDATE_WEBHOOK_SECRET.

import { createServer } from "node:http";
import { spawn }        from "node:child_process";
import { parse }        from "node:url";

const SECRET = process.env.UPDATE_WEBHOOK_SECRET;
const PORT   = parseInt(process.env.UPDATE_WEBHOOK_PORT   || "7071", 10);
const HOST   = process.env.UPDATE_WEBHOOK_BIND_HOST || "172.18.0.1";
const SCRIPT = process.env.UPDATE_SCRIPT_PATH       || "/opt/tesla-carview/deploy/update.sh";

if (!SECRET) { console.error("UPDATE_WEBHOOK_SECRET required"); process.exit(1); }

createServer((req, res) => {
  const { pathname, query } = parse(req.url, true);

  if (req.method === "GET" && pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true })); return;
  }

  if (req.method !== "POST" || pathname !== "/deploy") {
    res.writeHead(404); res.end(); return;
  }

  if (query.token !== SECRET) {
    console.warn("Unauthorized deploy attempt from", req.socket.remoteAddress);
    res.writeHead(403); res.end("Forbidden"); return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, message: "Update gestartet" }));

  console.log(new Date().toISOString(), "-> update.sh gestartet");
  const proc = spawn("bash", [SCRIPT], { detached: true, stdio: "ignore" });
  proc.unref();

}).listen(PORT, HOST, () => {
  console.log("Update webhook listening on http://" + HOST + ":" + PORT);
});
