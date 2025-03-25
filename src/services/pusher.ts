import Pusher from "pusher-js";
import axios from "axios";
import { Telegraf } from "telegraf";
import { Logger } from "../utils/logger";

export class PusherService {
  private client: Pusher;

  constructor(
    private bot: Telegraf,
    private pusherKey: string,
    private pusherCluster: string,
    private copperxApiUrl: string
  ) {
    this.client = new Pusher(pusherKey, {
      cluster: pusherCluster,
      // Add authorizer for private channels
      authorizer: (channel) => ({
        authorize: async (socketId, callback) => {
          try {
            const response = await axios.post(
              `${this.copperxApiUrl}/api/notifications/auth`,
              {
                socket_id: socketId,
                channel_name: channel.name,
              },
              {
                headers: { Authorization: `Bearer ${this.token}` }, // Token must be available here
              }
            );
            Logger.info("Pusher auth response:", response.data);
            callback(null, response.data); // Pass auth data to Pusher
          } catch (error: any) {
            Logger.error("Pusher authorization error:", {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
            });
            callback(error, null); // Pass error to Pusher
          }
        },
      }),
    });
  }

  private token: string | undefined; // Store token for authorization

  async setup(
    userId: string,
    token: string,
    organizationId: string
  ): Promise<void> {
    if (!token || !organizationId) {
      Logger.error("Invalid Pusher setup parameters:", {
        userId,
        token,
        organizationId,
      });
      await this.bot.telegram.sendMessage(
        userId,
        "Failed to set up notifications due to invalid credentials."
      );
      return;
    }

    this.token = token; // Store token for authorizer

    const channelName = `private-org-${organizationId}`;
    const channel = this.client.subscribe(channelName);
    Logger.info(`Attempting to subscribe to ${channelName}`);

    // Handle subscription events
    channel.bind("pusher:subscription_succeeded", () => {
      Logger.info(`Successfully subscribed to ${channelName}`);
      this.bot.telegram.sendMessage(
        userId,
        "Successfully subscribed to notifications!"
      );
    });

    channel.bind("pusher:subscription_error", (error: any) => {
      Logger.error("Pusher subscription error:", error);
      this.bot.telegram.sendMessage(
        userId,
        "Failed to subscribe to notifications."
      );
    });

    channel.bind("deposit", (data: any) => {
      this.bot.telegram.sendMessage(
        userId,
        `💰 *New Deposit*: ${data.amount} USDC on Solana`
      );
    });

    // Ensure Pusher is connected before proceeding
    if (this.client.connection.state !== "connected") {
      this.client.connection.bind("connected", () => {
        Logger.info("Pusher client connected");
      });
      this.client.connection.bind("error", (error: any) => {
        Logger.error("Pusher connection error:", error);
        this.bot.telegram.sendMessage(
          userId,
          "Failed to connect to notification service."
        );
      });
    }
  }
}
