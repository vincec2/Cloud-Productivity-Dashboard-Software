// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  loadData: async () => {
    return await ipcRenderer.invoke("data:load");
  },
  saveData: async (data) => {
    return await ipcRenderer.invoke("data:save", data);
  },
  chooseBackground: async () => {
    return await ipcRenderer.invoke("ui:chooseBackground");
  },
  chooseAlarmSound: () => ipcRenderer.invoke("choose-alarm-sound"),
});
