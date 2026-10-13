// Builds the Next.js app as a standalone server and assembles everything the Tauri
// installer ships into desktop/dist/app, plus the Node runtime used as the sidecar.
// Run with: npm run desktop:prepare  (Tauri calls it via beforeBuildCommand)
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "desktop", "dist", "app");
const skipBuild = process.argv.includes("--skip-build");

function copy(from, to) {
  fs.cpSync(path.join(root, from), path.join(out, to ?? from), { recursive: true, dereference: true });
}

// Turbopack links external packages as .next/node_modules/<name>-<hash> symlinks.
// Installers do not carry symlinks, so replace each one with a real copy of its target.
function materializeSymlinks(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = path.resolve(path.dirname(full), fs.readlinkSync(full));
      fs.rmSync(full);
      fs.cpSync(target, full, { recursive: true, dereference: true });
    } else if (entry.isDirectory()) {
      materializeSymlinks(full);
    }
  }
}

if (!skipBuild) {
  execSync("npx next build", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_OUTPUT: "standalone" },
  });
}

const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("Missing .next/standalone/server.js. Run without --skip-build first.");
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(standalone, out, { recursive: true, verbatimSymlinks: true });
materializeSymlinks(out);
// Never ship a developer's local env file inside the installer.
for (const f of fs.readdirSync(out)) if (f.startsWith(".env")) fs.rmSync(path.join(out, f));

copy(".next/static");
copy("public");
copy("seeds");
copy("supabase/migrations");
copy("scripts/setup-db.mjs");
copy("desktop/launcher.mjs", "launcher.mjs");
copy("desktop/exit-with-parent.cjs", "exit-with-parent.cjs");
// The launcher and setup script run outside Next.js, so their packages are not traced.
for (const pkg of ["@electric-sql/pglite", "@electric-sql/pglite-socket", "postgres", "bcryptjs"]) {
  copy(path.join("node_modules", pkg));
}

// Tauri bundles the sidecar as binaries/node-<target triple>[.exe].
const triple =
  process.env.TAURI_ENV_TARGET_TRIPLE ||
  execSync("rustc -vV").toString().match(/host: (\S+)/)?.[1];
if (!triple) throw new Error("Could not detect the Rust target triple.");
const binDir = path.join(root, "src-tauri", "binaries");
fs.mkdirSync(binDir, { recursive: true });
const ext = triple.includes("windows") ? ".exe" : "";
fs.copyFileSync(process.execPath, path.join(binDir, `node-${triple}${ext}`));

console.log(`Desktop bundle ready in ${path.relative(root, out)} (sidecar node-${triple}${ext})`);
