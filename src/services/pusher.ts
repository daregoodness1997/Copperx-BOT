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
    this.client = new Pusher(pusherKey, { cluster: pusherCluster });
  }

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

    const channelName = `private-org-${organizationId}`;
    const channel = this.client.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", () =>
      Logger.info(`Subscribed to ${channelName}`)
    );
    channel.bind("pusher:subscription_error", (error: any) => {
      Logger.error("Pusher subscription error:", error);
      this.bot.telegram.sendMessage(
        userId,
        "Failed to subscribe to notifications."
      );
    });
    channel.bind("deposit", (data: any) =>
      this.bot.telegram.sendMessage(
        userId,
        `💰 *New Deposit*: ${data.amount} USDC on Solana`
      )
    );

    // Authorize the channel
    try {
      const socketId = this.client.connection.socket_id;
      if (!socketId) {
        Logger.error("Pusher socket ID not available yet.");
        await this.bot.telegram.sendMessage(
          userId,
          "Notification setup failed: Pusher not ready."
        );
        return;
      }

      Logger.info("Authorizing Pusher channel:", {
        socketId,
        channelName,
        token,
      });
      const response = await axios.post(
        `${this.copperxApiUrl}/api/notifications/auth`,
        {
          socket_id: socketId,
          channel_name: channelName,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Logger.info("Pusher auth response:", response.data);
    } catch (error: any) {
      Logger.error("Pusher authorization error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      await this.bot.telegram.sendMessage(
        userId,
        "Failed to authorize notifications."
      );
    }
  }
}
