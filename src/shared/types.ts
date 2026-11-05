export type Screen = 'home' | 'missions' | 'learn' | 'builder' | 'play' | 'projects' | 'settings' | 'sumo' | 'classroom';
export type Theme = 'light' | 'dark';
export type TextSize = 'small' | 'medium' | 'large';
export type ViewMode = '3d' | '2d';
export type PreviewStatus = 'ready' | 'running' | 'paused' | 'complete';
export interface Preferences {
  theme: Theme;
  textSize: TextSize;
  reducedMotion: boolean;
  sound: boolean;
}
export interface FileResult { name: string; content: string; encoding?: 'utf8' | 'base64' }
export interface DesktopBridge {
  openFile(): Promise<FileResult | null>;
  saveFile(name: string, content: string): Promise<boolean>;
  getAppDataPath(): Promise<string>;
  getGearsUrl(): Promise<string>;
  hostSumo(): Promise<void>;
  hostCompetition(): Promise<void>;
  joinCompetition(code:string,address:string): Promise<void>;
  joinSumo(code:string,address?:string): Promise<void>;
}
declare global { interface Window { desktop?: DesktopBridge } }
