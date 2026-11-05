import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktop', {
  openFile: () => ipcRenderer.invoke('desktop:open-file'),
  saveFile: (name: string, content: string) => ipcRenderer.invoke('desktop:save-file', name, content),
  getAppDataPath: () => ipcRenderer.invoke('desktop:get-app-data-path'),
  getGearsUrl: () => ipcRenderer.invoke('desktop:gears-url'),
  hostSumo: () => ipcRenderer.invoke('desktop:sumo-host'),
  hostCompetition: () => ipcRenderer.invoke('desktop:competition-host'),
  joinCompetition: (code:string,address:string) => ipcRenderer.invoke('desktop:competition-join',code,address),
  joinSumo: (code:string,address?:string) => ipcRenderer.invoke('desktop:sumo-join',code,address),
});
