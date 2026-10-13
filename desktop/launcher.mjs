// Desktop entry point, started by the Tauri shell as a Node sidecar.
// 1. Opens the embedded PGlite database in the per-user data folder.
// 2. Serves it on a local Postgres socket so the app's postgres.js code runs unchanged.
// 3. Runs migrations (and the demo seed on a brand-new database).
// 4. Starts the Next.js standalone server and prints "SORA_READY <url>" for the shell.
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const appDir = import.meta.dirname;
const dataDir = path.resolve(process.env.SORA_DATA_DIR || path.join(appDir, "..", ".desktop-data"));
const dbDir = path.join(dataDir, "db");
const uploadsDir = path.join(dataDir, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

function log(...args) {
  console.log("[sora]", ...args);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function sessionSecret() {
  const file = path.join(dataDir, "session-secret");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: appDir, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${args.join(" ")} exited with ${code}`))));
  });
}

const isNewDatabase = !fs.existsSync(path.join(dbDir, "PG_VERSION"));
log(`data folder: ${dataDir}${isNewDatabase ? " (new)" : ""}`);

const db = await PGlite.create({ dataDir: dbDir, extensions: { pgcrypto } });
const dbPort = await freePort();
const dbServer = new PGLiteSocketServer({ db, host: "127.0.0.1", port: dbPort });
await dbServer.start();

const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${dbPort}/postgres`,
  DB_POOL_MAX: "1",
  SESSION_SECRET: process.env.SESSION_SECRET || sessionSecret(),
  TZ: process.env.TZ || "Asia/Makassar",
  IMAGE_DRIVER: "local",
  UPLOADS_DIR: uploadsDir,
  HOSTNAME: "127.0.0.1",
};

await run(process.execPath, [path.join(appDir, "scripts", "setup-db.mjs")], {
  ...env,
  SETUP_MIGRATE_ONLY: isNewDatabase ? "0" : "1",
});

const appPort = Number(process.env.PORT) || (await freePort());
const server = spawn(process.execPath, ["--require", path.join(appDir, "exit-with-parent.cjs"), path.join(appDir, "server.js")], {
  cwd: appDir,
  env: { ...env, PORT: String(appPort) },
  stdio: ["ignore", "pipe", "inherit", "ipc"],
});

const url = `http://127.0.0.1:${appPort}`;
let ready = false;
server.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (!ready && /Ready|started server|Local:/i.test(String(chunk))) {
    ready = true;
    console.log(`SORA_READY ${url}`);
  }
});

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  server.kill();
  await dbServer.stop().catch(() => {});
  // Closing PGlite flushes its files, so a clean exit never leaves the database half-written.
  await db.close().catch(() => {});
  log("stopped");
  process.exit(code);
}

server.on("exit", (code) => {
  if (!stopping) {
    log(`app server exited with ${code}`);
    shutdown(code ?? 1);
  }
});
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
// The Tauri shell writes "quit" (or closes stdin) on exit; signals are unreliable on Windows.
process.stdin.on("data", (chunk) => {
  if (String(chunk).includes("quit")) shutdown(0);
});
process.stdin.on("end", () => shutdown(0));
