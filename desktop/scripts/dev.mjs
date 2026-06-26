import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const electron = process.platform === "win32"
  ? path.join(root, "node_modules", ".bin", "electron.cmd")
  : path.join(root, "node_modules", ".bin", "electron");

function waitForHttp(url, timeoutMs = 60000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(attempt, 500);
      });

      request.setTimeout(1500, () => request.destroy());
    };

    attempt();
  });
}

const next = spawn(npm, ["run", "dev"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT || "3000",
  },
});

const shutdown = () => {
  next.kill();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await waitForHttp(`http://127.0.0.1:${process.env.PORT || "3000"}/login`);

const desktop = spawn(electron, ["."], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    ELECTRON_START_URL: `http://127.0.0.1:${process.env.PORT || "3000"}`,
  },
});

desktop.on("exit", (code) => {
  next.kill();
  process.exit(code || 0);
});
