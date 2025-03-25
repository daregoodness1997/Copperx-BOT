import * as dotenv from "dotenv";

export class EnvConfig {
  static load(): void {
    dotenv.config();
    console.log("Environment variables loaded...", Date.now());
  }

  static get telegramToken(): string {
    return this.ensureEnv("TELEGRAM_TOKEN");
  }

  static get copperxApiKey(): string {
    return this.ensureEnv("COPPERX_API_KEY");
  }

  static get copperxApiUrl(): string {
    return this.ensureEnv("COPPERX_API_URL");
  }

  static get pusherKey(): string {
    return this.ensureEnv("PUSHER_KEY");
  }

  static get pusherCluster(): string {
    return this.ensureEnv("PUSHER_CLUSTER");
  }

  static get redisUrl(): string {
    return this.ensureEnv("REDIS_URL");
  }
  static get redisUsername(): string {
    return this.ensureEnv("REDIS_USERNAME");
  }
  static get redisPassword(): string {
    return this.ensureEnv("REDIS_PASSWORD");
  }
  static get redisPort(): string {
    return this.ensureEnv("REDIS_PORT");
  }
  static get appPort(): string {
    return this.ensureEnv("APP_PORT");
  }

  private static ensureEnv(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing environment variable: ${key}`);
    return value;
  }
}
