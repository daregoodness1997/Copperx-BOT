import { createClient, RedisClientType } from "redis";
import { EnvConfig } from "../config/env";
import { Logger } from "../utils/logger";

export interface SessionData {
  token?: string;
  expires?: number;
  organizationId?: string;
  hasSeenGreeting?: boolean;
  wizard?: WizardState;
}

export interface WizardState {
  step: string;
  data: { [key: string]: any };
}

export class SessionManager {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({ url: EnvConfig.redisUrl });
    this.client.on("error", (err) => Logger.error("Redis Client Error", err));
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      Logger.info("Connected to Redis");
    } catch (err) {
      Logger.error("Failed to connect to Redis:", err);
      throw err;
    }
  }

  async get(userId: string): Promise<SessionData> {
    const data = await this.client.get(`session:${userId}`);
    return data ? JSON.parse(data) : {};
  }

  async set(userId: string, data: Partial<SessionData>): Promise<void> {
    const current = await this.get(userId);
    const updated = { ...current, ...data };
    await this.client.set(`session:${userId}`, JSON.stringify(updated), {
      EX: 86400, // Set TTL to 24 hours (adjust as needed)
    });
  }

  async isValid(userId: string): Promise<boolean> {
    const session = await this.get(userId);
    const isValid = !!(
      session.token &&
      session.expires &&
      session.expires > Date.now()
    );
    Logger.info("Checking session validity:", { userId, session, isValid });
    return isValid;
  }

  async clearWizard(userId: string): Promise<void> {
    const session = await this.get(userId);
    if (session.wizard) {
      delete session.wizard;
      await this.client.set(`session:${userId}`, JSON.stringify(session));
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    Logger.info("Disconnected from Redis");
  }
}
