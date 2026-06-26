import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const standaloneRoot = path.join(root, ".next", "standalone");

function materializeSymlinks(targetRoot) {
  if (!existsSync(targetRoot)) return;

  for (const entry of readdirSync(targetRoot)) {
    const entryPath = path.join(targetRoot, entry);
    const stats = lstatSync(entryPath);

    if (stats.isSymbolicLink()) {
      const realTarget = realpathSync(entryPath);
      rmSync(entryPath, { recursive: true, force: true });
      cpSync(realTarget, entryPath, { recursive: true, dereference: true });
      continue;
    }

    if (stats.isDirectory()) {
      materializeSymlinks(entryPath);
    }
  }
}

if (existsSync(standaloneRoot)) {
  rmSync(standaloneRoot, { recursive: true, force: true });
}

const result = spawnSync(npx, ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_STANDALONE: "true",
  },
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const standaloneNextDir = path.join(standaloneRoot, ".next");
const standalonePublicDir = path.join(standaloneRoot, "public");

mkdirSync(standaloneNextDir, { recursive: true });

const staticSource = path.join(root, ".next", "static");
const staticTarget = path.join(standaloneNextDir, "static");
if (existsSync(staticTarget)) rmSync(staticTarget, { recursive: true, force: true });
if (existsSync(staticSource)) cpSync(staticSource, staticTarget, { recursive: true });

if (existsSync(standalonePublicDir)) rmSync(standalonePublicDir, { recursive: true, force: true });
if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), standalonePublicDir, { recursive: true });
}

materializeSymlinks(path.join(standaloneNextDir, "node_modules"));
