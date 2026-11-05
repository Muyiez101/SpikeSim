import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { startGearsServer } from './gears-server';
import { appPolicy, gearsPolicy, lanAssetPolicy } from './content-security';
import {startLanServer,discoverRoom,localJoinUrl} from './lan-server';

const currentDir = __dirname;
const windowIcon = path.join(currentDir, '..', process.env.VITE_DEV_SERVER_URL ? 'public' : 'dist', 'brand', process.platform === 'win32' ? 'icon.ico' : 'icon-256.png');
const maxFileBytes = 2_000_000;
let lan:Awaited<ReturnType<typeof startLanServer>>|undefined;
let startingLan:Promise<Awaited<ReturnType<typeof startLanServer>>>|undefined;
const matchOrigins = new Set<string>();
async function openMatch(origin:string,code:string,mode:'sumo'|'competition'='sumo'){
  matchOrigins.add(origin);
  const matchWindow=new BrowserWindow({width:1440,height:1000,minWidth:1024,minHeight:640,title:'SpikeSim',icon:windowIcon,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  matchWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  matchWindow.webContents.on('will-navigate',event=>event.preventDefault());
  await matchWindow.loadURL(`${origin}/?${mode}=${encodeURIComponent(code)}`);
}

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'SpikeSim',
    icon: windowIcon,
    backgroundColor: '#f6f8fc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(currentDir, 'preload.js'),
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    await window.loadURL(devUrl);
  } else {
    await window.loadFile(path.join(currentDir, '..', 'dist', 'index.html'));
  }
};

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  const gears = await startGearsServer(path.join(currentDir, '..', process.env.VITE_DEV_SERVER_URL ? 'public' : 'dist', 'gears'));
  app.on('before-quit', () => gears.close());
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const url = new URL(details.url);
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [url.origin === gears.origin ? gearsPolicy :
          matchOrigins.has(url.origin) ? lanAssetPolicy(url.pathname) : appPolicy],
      },
    });
  });

  ipcMain.handle('desktop:open-file', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters:[{name:'Robot projects',extensions:['rlproj','llsp3','sb3']}] });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const info = await fs.stat(filePath);
    const archive = /\.(llsp3|sb3)$/i.test(filePath);
    if (!info.isFile() || info.size > (archive ? 10_000_000 : maxFileBytes)) throw new Error('Unsupported file size');
    const encoding = archive ? 'base64' : 'utf8';
    return { name:path.basename(filePath), content:(await fs.readFile(filePath)).toString(encoding), encoding };
  });

  ipcMain.handle('desktop:save-file', async (_event, name: string, content: string) => {
    if (typeof name !== 'string' || name.length > 200 || typeof content !== 'string'
      || content.length > maxFileBytes || Buffer.byteLength(content, 'utf8') > maxFileBytes) {
      throw new Error('Invalid file data');
    }
    const result = await dialog.showSaveDialog({ defaultPath: path.basename(name) });
    if (result.canceled || !result.filePath) return false;
    await fs.writeFile(result.filePath, content, 'utf8');
    return true;
  });

  ipcMain.handle('desktop:get-app-data-path', () => app.getPath('userData'));
  ipcMain.handle('desktop:gears-url', () => gears.origin + '/');
  const trusted=(event:Electron.IpcMainInvokeEvent)=>{
    const url=event.senderFrame?.url??'';
    if(event.senderFrame!==event.sender.mainFrame||!(process.env.VITE_DEV_SERVER_URL?url.startsWith(process.env.VITE_DEV_SERVER_URL+'/'):url.startsWith('file:')))throw Error('Unavailable');
  };
  ipcMain.handle('desktop:sumo-host',async event=>{
    trusted(event);
    startingLan??=startLanServer({root:path.join(currentDir,'..','dist'),workerPath:path.join(currentDir,'match-worker.js'),competitionFile:path.join(app.getPath('userData'),'classroom','sessions.json')}).catch(error=>{startingLan=undefined;throw error;});
    lan=await startingLan;await openMatch(lan.origin,'host');
  });
  ipcMain.handle('desktop:sumo-join',async(event,code:unknown,address:unknown)=>{
    trusted(event);if(typeof code!=='string'||!/^[A-Z2-9]{6}$/.test(code)||address!==undefined&&typeof address!=='string')throw Error('Invalid invitation');
    const origin=address?localJoinUrl(address as string):await discoverRoom(code);
    const result=await fetch(`${origin}/api/sumo/info`,{signal:AbortSignal.timeout(3000)});if(!result.ok||(await result.json()).available!==true)throw Error('Host unavailable');
    await openMatch(origin,code);
  });
  ipcMain.handle('desktop:competition-host',async event=>{
    trusted(event);
    startingLan??=startLanServer({root:path.join(currentDir,'..','dist'),workerPath:path.join(currentDir,'match-worker.js'),competitionFile:path.join(app.getPath('userData'),'classroom','sessions.json')}).catch(error=>{startingLan=undefined;throw error;});
    lan=await startingLan;await openMatch(lan.origin,'host','competition');
  });
  ipcMain.handle('desktop:competition-join',async(event,code:unknown,address:unknown)=>{
    trusted(event);if(typeof code!=='string'||!/^[A-HJ-NP-Z2-9]{6}$/.test(code)||typeof address!=='string')throw Error('Invalid invitation');
    await openMatch(localJoinUrl(address),code,'competition');
  });
  app.on('before-quit',()=>{void lan?.close();});
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
