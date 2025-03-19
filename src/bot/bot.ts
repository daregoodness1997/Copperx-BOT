import { Telegraf } from "telegraf";
import { EnvConfig } from "../config/env";
import { CopperxService } from "../services/copperx";
import { PusherService } from "../services/pusher";
import { SessionManager } from "./session";
import { BotWizard } from "./wizard";
import { Logger } from "../utils/logger";

export class CopperxBot {
  private bot: Telegraf;
  private copperx: CopperxService;
  private pusher: PusherService;
  private sessionManager: SessionManager;
  private wizard: BotWizard;

  constructor() {
    EnvConfig.load();
    this.bot = new Telegraf(EnvConfig.telegramToken, { handlerTimeout: 90000 });
    this.copperx = new CopperxService(
      EnvConfig.copperxApiKey,
      EnvConfig.copperxApiUrl
    );
    this.pusher = new PusherService(
      this.bot,
      EnvConfig.pusherKey,
      EnvConfig.pusherCluster,
      EnvConfig.copperxApiUrl
    );
    this.sessionManager = new SessionManager();
    this.wizard = new BotWizard(
      this.bot,
      this.copperx,
      this.sessionManager,
      this.pusher
    );
  }

  async launch(): Promise<void> {
    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      try {
        await this.bot.launch();
        Logger.info("Bot launched successfully...", Date.now());
        return;
      } catch (error) {
        Logger.error(`Launch attempt ${i + 1} failed:`, error);
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 2000));
      }
    }
    Logger.error("Failed to launch bot after all attempts.");
    process.exit(1);
  }

  setupShutdown(): void {
    process.once("SIGINT", async () => {
      await this.sessionManager.disconnect();
      this.bot.stop("SIGINT");
    });
    process.once("SIGTERM", async () => {
      await this.sessionManager.disconnect();
      this.bot.stop("SIGTERM");
    });
  }
}
