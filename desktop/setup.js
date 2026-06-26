const onlineEl = document.getElementById("online");
const databaseEl = document.getElementById("database");
const databaseUrlEl = document.getElementById("database-url");
const messageEl = document.getElementById("message");
const inputEl = document.getElementById("database-input");
const errorEl = document.getElementById("error");
const saveButton = document.getElementById("save");
const retryButton = document.getElementById("retry");
const postgresButton = document.getElementById("postgres");

function setBusy(busy) {
  saveButton.disabled = busy;
  retryButton.disabled = busy;
  postgresButton.disabled = busy;
}

function renderStatus(status) {
  onlineEl.textContent = status.online ? "متصل" : "غير متصل";
  databaseEl.textContent = status.databaseOk ? "جاهزة" : "تحتاج إعداد";
  databaseUrlEl.textContent = status.databaseUrl || "-";
  messageEl.textContent = status.message || "-";
}

async function refreshStatus() {
  errorEl.textContent = "";
  const status = await window.premiumDesktop.getSetupStatus();
  renderStatus(status);
}

saveButton.addEventListener("click", async () => {
  setBusy(true);
  errorEl.textContent = "";
  try {
    const status = await window.premiumDesktop.saveDatabaseUrl(inputEl.value);
    renderStatus(status);
  } catch (error) {
    errorEl.textContent = error?.message || "تعذر حفظ الإعدادات";
  } finally {
    setBusy(false);
  }
});

retryButton.addEventListener("click", async () => {
  setBusy(true);
  errorEl.textContent = "";
  try {
    const status = await window.premiumDesktop.retrySetup();
    renderStatus(status);
  } catch (error) {
    errorEl.textContent = error?.message || "تعذر إعادة المحاولة";
  } finally {
    setBusy(false);
  }
});

postgresButton.addEventListener("click", async () => {
  await window.premiumDesktop.openPostgresDownload();
});

refreshStatus();
