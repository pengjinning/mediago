import { type BrowserWindow } from "electron";
import { ElectronLog } from "electron-log";
import Store from "electron-store";
import { Favorite } from "entity/Favorite";
import { Video } from "entity/Video";
import EventEmitter from "events";
import { AppStore } from "main";
import { DataSource, EntityManager, UpdateResult, DeleteResult } from "typeorm";

export interface MainWindowService extends BrowserWindow {
  init: () => void;
}

export interface App {
  init: () => void;
}

export interface IpcHandlerService {
  init: () => void;
}

export interface ProtocolService {
  create: () => void;
}

export interface UpdateService {
  init: () => void;
}

export interface DatabaseService {
  manager: EntityManager;
  appDataSource: DataSource;
  init: () => void;
}

export type Controller = Record<string | symbol, any>;

export interface LoggerService {
  logger: ElectronLog;
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

export interface StoreService extends Store<AppStore> {
  init: () => void;
  setProxy: (
    useProxy: boolean,
    proxy: string,
    isInit?: boolean
  ) => Promise<void>;
}

export interface DownloadItem {
  name: string;
  url: string;
}

export enum DownloadFilter {
  list = "list",
  done = "done",
}

export interface DownloadItemPagination {
  current?: number;
  pageSize?: number;
  filter?: DownloadFilter;
}

export interface VideoResponse {
  total: number;
  list: DownloadItem[];
}

export interface VideoRepository {
  addVideo: (video: DownloadItem) => Promise<Video>;
  findVideos: (pagiantion: DownloadItemPagination) => Promise<VideoResponse>;
  findVideo: (id: number) => Promise<Video | null>;
  changeVideoStatus: (
    id: number | number[],
    status: DownloadStatus
  ) => Promise<UpdateResult>;
  findWattingAndDownloadingVideos: () => Promise<Video[]>;
  deleteDownloadItem: (id: number) => Promise<DeleteResult>;
}

export interface FavoriteRepository {
  findFavorites: () => Promise<Favorite[]>;
  addFavorite: (favorite: Favorite) => Promise<Favorite>;
  removeFavorite: (url: string) => Promise<void>;
}

export interface WebviewService {
  webContents: Electron.WebContents;
  init: () => void;
  getBounds: () => Electron.Rectangle;
  setAutoResize: (options: Electron.AutoResizeOptions) => void;
  setBackgroundColor: (color: string) => void;
  setBounds: (bounds: Electron.Rectangle) => void;
  loadURL: (url?: string) => void;
  goBack: () => Promise<boolean>;
  reload: () => Promise<void>;
  goHome: () => Promise<void>;
}

export enum DownloadStatus {
  Ready = "ready",
  Watting = "watting",
  Downloading = "downloading",
  Stopped = "stopped",
  Success = "success",
  Failed = "failed",
}

export interface DownloadService extends EventEmitter {
  addTask: (task: Task) => Promise<void>;
  stopTask: (id: number) => Promise<void>;
}

export type Task = {
  id: number;
  params: string[];
  process: (...args: any[]) => Promise<void>;
};

export interface DownloadProgress {
  id: number;
  cur: string;
  total: string;
  speed: string;
}