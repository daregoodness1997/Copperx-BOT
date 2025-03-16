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
      EnvConfig.pusherKey,
      EnvConfig.pusherCluster,
      EnvConfig.copperxApiUrl
    );
    this.sessionManager = new SessionManager();
    this.wizard = new BotWizard(this.bot, this.copperx, this.sessionManager);
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
    process.once("SIGINT", () => this.bot.stop("SIGINT"));
    process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
  }

  // Inject bot into PusherService for messaging (temporary workaround)
  setupPusher(userId: string, token: string, organizationId: string): void {
    this.pusher.setup(userId, token, organizationId);
    // Ideally, PusherService should have a method to set a message sender
    // For now, we'll leave it as a log in PusherService
  }
}
