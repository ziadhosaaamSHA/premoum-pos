const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const dns = require("node:dns").promises;
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const PRODUCT_NAME = "Premium POS";
const DEFAULT_DATABASE_URL = "postgresql://127.0.0.1:5432/premium_pos?schema=public";
const UPDATE_CHECK_HOST = process.env.PREMIUM_POS_UPDATE_HOST || "github.com";

let mainWindow = null;
let setupWindow = null;
let serverProcess = null;
let serverUrl = process.env.ELECTRON_START_URL || null;
let setupStatus = {
  online: false,
  databaseOk: false,
  databaseUrl: "",
  message: "جارٍ الفحص...",
};

function appendDesktopLog(scope, value) {
  const text = String(value || "").trimEnd();
  if (!text) return;

  try {
    const logPath = path.join(app.getPath("userData"), "desktop.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const timestamp = new Date().toISOString();
    const lines = text.split(/\r?\n/).map((line) => `[${timestamp}] ${scope} ${line}`);
    fs.appendFileSync(logPath, `${lines.join("\n")}\n`);
  } catch {
    // Logging must never block app startup.
  }
}

function describeError(error) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error || "Unknown error");
}

function appRoot() {
  return app.getAppPath();
}

function userConfigPath() {
  return path.join(app.getPath("userData"), "desktop-config.json");
}

function cleanUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
}

function isPostgresUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "postgresql:" || parsed.protocol === "postgres:";
  } catch {
    return false;
  }
}

function maskDatabaseUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.password) parsed.password = "****";
    return parsed.toString();
  } catch {
    return value ? "configured" : "";
  }
}

function readDesktopConfig() {
  const configPath = userConfigPath();
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

function writeDesktopConfig(config) {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(userConfigPath(), JSON.stringify(config, null, 2));
}

function getDatabaseUrl() {
  const envUrl = cleanUrl(process.env.PREMIUM_POS_DATABASE_URL || process.env.DATABASE_URL);
  if (envUrl) return envUrl;
  const config = readDesktopConfig();
  return cleanUrl(config.databaseUrl) || DEFAULT_DATABASE_URL;
}

async function hasInternetConnection() {
  try {
    await dns.lookup(UPDATE_CHECK_HOST);
    return true;
  } catch {
    return false;
  }
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function waitForHttp(url, timeoutMs = 30000) {
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
        setTimeout(attempt, 350);
      });

      request.setTimeout(1500, () => {
        request.destroy();
      });
    };

    attempt();
  });
}

function loadPgClient() {
  try {
    return require("pg").Client;
  } catch {
    const standalonePg = path.join(appRoot(), ".next", "standalone", "node_modules", "pg");
    return require(standalonePg).Client;
  }
}

async function checkDatabase(databaseUrl) {
  const Client = loadPgClient();
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query("select 1");
    return true;
  } finally {
    await client.end().catch(() => undefined);
  }
}

function runNodeScript(scriptPath, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: appRoot(),
      env: {
        ...process.env,
        ...env,
        ELECTRON_RUN_AS_NODE: "1",
      },
      stdio: "pipe",
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
        return;
      }
      reject(new Error(output || `Command failed with exit code ${code}`));
    });
  });
}

async function runPrismaMigrations(databaseUrl) {
  const schemaPath = path.join(appRoot(), "prisma", "schema.prisma");
  const prismaCli = path.join(appRoot(), "node_modules", "prisma", "build", "index.js");

  if (!fs.existsSync(schemaPath) || !fs.existsSync(prismaCli)) {
    return;
  }

  await runNodeScript(prismaCli, ["migrate", "deploy", "--schema", schemaPath], {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  });
}

async function ensureDatabaseReady(databaseUrl) {
  if (!isPostgresUrl(databaseUrl)) {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
  }
  await checkDatabase(databaseUrl);
  await runPrismaMigrations(databaseUrl);
  await checkDatabase(databaseUrl);
}

function standaloneServerPath() {
  return path.join(appRoot(), ".next", "standalone", "server.js");
}

async function startNextServer(databaseUrl) {
  if (serverUrl) return serverUrl;

  const serverPath = standaloneServerPath();
  if (!fs.existsSync(serverPath)) {
    throw new Error("Desktop server build is missing. Run npm run desktop:build:next first.");
  }

  const port = await getFreePort();
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    ELECTRON_RUN_AS_NODE: "1",
  };

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    env,
    stdio: "pipe",
  });

  serverProcess.stdout.on("data", (chunk) => {
    if (!app.isPackaged) {
      process.stdout.write(`[next] ${chunk}`);
      return;
    }
    appendDesktopLog("[next]", chunk);
  });
  serverProcess.stderr.on("data", (chunk) => {
    if (!app.isPackaged) {
      process.stderr.write(`[next] ${chunk}`);
      return;
    }
    appendDesktopLog("[next:err]", chunk);
  });
  serverProcess.on("exit", (code, signal) => {
    appendDesktopLog("[next]", `server exited code=${code ?? "null"} signal=${signal ?? "null"}`);
    serverProcess = null;
  });

  serverUrl = `http://127.0.0.1:${port}`;
  await waitForHttp(`${serverUrl}/login`);
  return serverUrl;
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1180,
    minHeight: 720,
    title: PRODUCT_NAME,
    backgroundColor: "#f7f3ee",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(url);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 760,
    height: 640,
    minWidth: 680,
    minHeight: 560,
    title: `${PRODUCT_NAME} Setup`,
    backgroundColor: "#f7f3ee",
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  setupWindow.loadFile(path.join(__dirname, "setup.html"));
  setupWindow.on("closed", () => {
    setupWindow = null;
  });
}

async function checkForUpdatesWhenOnline() {
  if (!app.isPackaged) return;

  const online = await hasInternetConnection();
  if (!online) return;

  let autoUpdater;
  try {
    autoUpdater = require("electron-updater").autoUpdater;
  } catch {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.on("update-available", async (info) => {
    const result = await dialog.showMessageBox({
      type: "info",
      buttons: ["Download update", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update available",
      message: `${PRODUCT_NAME} ${info.version} is available.`,
      detail: "Download it now? If you skip it, the app will continue working offline with the installed version.",
    });
    if (result.response === 0) {
      await autoUpdater.downloadUpdate();
    }
  });
  autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox({
      type: "info",
      buttons: ["Restart and install", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update ready",
      message: "The update has been downloaded.",
    });
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.checkForUpdates().catch(() => undefined);
}

async function bootApplication() {
  const databaseUrl = getDatabaseUrl();
  const online = await hasInternetConnection();
  setupStatus = {
    online,
    databaseOk: false,
    databaseUrl: maskDatabaseUrl(databaseUrl),
    message: "Checking local database...",
  };

  try {
    await ensureDatabaseReady(databaseUrl);
    setupStatus = {
      online,
      databaseOk: true,
      databaseUrl: maskDatabaseUrl(databaseUrl),
      message: "Database is ready.",
    };
    const url = await startNextServer(databaseUrl);
    createMainWindow(url);
    checkForUpdatesWhenOnline();
  } catch (error) {
    appendDesktopLog("[boot]", describeError(error));
    setupStatus = {
      online,
      databaseOk: false,
      databaseUrl: maskDatabaseUrl(databaseUrl),
      message:
        error instanceof Error && error.message
          ? error.message
          : "Database setup failed.",
    };
    createSetupWindow();
  }
}

function registerIpc() {
  ipcMain.handle("desktop:get-setup-status", async () => setupStatus);
  ipcMain.handle("desktop:open-postgres-download", async () => {
    await shell.openExternal("https://www.postgresql.org/download/");
  });
  ipcMain.handle("desktop:retry-setup", async () => {
    if (setupWindow) setupWindow.close();
    await bootApplication();
    return setupStatus;
  });
  ipcMain.handle("desktop:save-database-url", async (_event, databaseUrl) => {
    const normalized = cleanUrl(databaseUrl);
    if (!isPostgresUrl(normalized)) {
      throw new Error("Use a PostgreSQL URL that starts with postgresql:// or postgres://");
    }

    setupStatus = {
      online: await hasInternetConnection(),
      databaseOk: false,
      databaseUrl: maskDatabaseUrl(normalized),
      message: "Checking database...",
    };

    await ensureDatabaseReady(normalized);
    writeDesktopConfig({ databaseUrl: normalized });

    setupStatus = {
      online: await hasInternetConnection(),
      databaseOk: true,
      databaseUrl: maskDatabaseUrl(normalized),
      message: "Database is ready.",
    };

    if (setupWindow) setupWindow.close();
    const url = await startNextServer(normalized);
    createMainWindow(url);
    checkForUpdatesWhenOnline();
    return setupStatus;
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const target = mainWindow || setupWindow;
    if (!target) return;
    if (target.isMinimized()) target.restore();
    target.focus();
  });

  app.whenReady().then(() => {
    registerIpc();
    bootApplication();
  });
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
