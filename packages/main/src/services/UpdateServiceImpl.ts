import { autoUpdater } from "electron-updater";
import { inject, injectable } from "inversify";
import { LoggerService, type UpdateService } from "../interfaces";
import { TYPES } from "../types";
import isDev from "electron-is-dev";

@injectable()
export default class UpdateServiceImpl implements UpdateService {
  constructor(
    @inject(TYPES.LoggerService) private readonly logger: LoggerService
  ) {}

  async init(): Promise<void> {
    if (isDev) return;

    try {
      autoUpdater.disableWebInstaller = true;
      autoUpdater.logger = this.logger.logger;
      await autoUpdater.checkForUpdatesAndNotify({
        title: "自动更新完成",
        body: "下次重启时将会自动安装",
      });
    } catch (e) {
      this.logger.info("update error", e);
    }
  }
}
