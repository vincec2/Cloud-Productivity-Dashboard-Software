// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = process.env.NODE_ENV === "development";

const DEV_DATA_FILENAME = "cloud-productivity-data.dev.json";
const PROD_DATA_FILENAME = "cloud-productivity-data.json";

function getDataFilePath() {
  if (isDev) {
    return path.join(process.cwd(), DEV_DATA_FILENAME);
  } else {
    const userDataPath = app.getPath("userData");
    return path.join(userDataPath, PROD_DATA_FILENAME);
  }
}

function ensureDataFileExists() {
  const dataFile = getDataFilePath();
  if (!fs.existsSync(dataFile)) {
    const initialData = { projects: [] };
    fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

function readDataFile() {
  ensureDataFileExists();
  const dataFile = getDataFilePath();
  const raw = fs.readFileSync(dataFile, "utf-8");
  return JSON.parse(raw);
}

function writeDataFile(data) {
  const dataFile = getDataFilePath();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf-8");
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("data:load", () => {
  return readDataFile();
});

ipcMain.handle("data:save", (event, newData) => {
  writeDataFile(newData);
  return { ok: true };
});

// UPDATED: open-file dialog + read file as base64 data URL
ipcMain.handle("ui:chooseBackground", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select Background Image",
    properties: ["openFile"],
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg"]
      }
    ]
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { canceled: true, filePath: null, dataUrl: null };
  }

  const filePath = filePaths[0];

  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let mime = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") {
      mime = "image/jpeg";
    }

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    return { canceled: false, filePath, dataUrl };
  } catch (err) {
    console.error("Failed to read background image:", err);
    return { canceled: true, filePath: null, dataUrl: null };
  }
});

ipcMain.handle("choose-alarm-sound", async () => {
  const result = await dialog.showOpenDialog({
    title: "Choose alarm sound",
    properties: ["openFile"],
    filters: [
      { name: "Audio files", extensions: ["mp3", "wav"] },
    ],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();

  const mime =
    ext === ".wav"
      ? "audio/wav"
      : ext === ".mp3"
      ? "audio/mpeg"
      : "application/octet-stream";

  const buffer = await fs.promises.readFile(filePath);
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  return {
    canceled: false,
    filePath,
    dataUrl,
  };
});


app.on("ready", () => {
  ensureDataFileExists();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
