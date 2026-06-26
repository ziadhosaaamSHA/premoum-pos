const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("premiumDesktop", {
  getSetupStatus: () => ipcRenderer.invoke("desktop:get-setup-status"),
  saveDatabaseUrl: (databaseUrl) => ipcRenderer.invoke("desktop:save-database-url", databaseUrl),
  retrySetup: () => ipcRenderer.invoke("desktop:retry-setup"),
  openPostgresDownload: () => ipcRenderer.invoke("desktop:open-postgres-download"),
});
