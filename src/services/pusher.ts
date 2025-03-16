import Pusher from "pusher-js";
import axios from "axios";
import { Logger } from "../utils/logger";

export class PusherService {
  private client: Pusher;

  constructor(
    private pusherKey: string,
    private pusherCluster: string,
    private copperxApiUrl: string
  ) {
    this.client = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authorizer: (channel) => ({
        authorize: async (socketId, callback) => {
          try {
            const response = await axios.post(
              `${this.copperxApiUrl}/api/notifications/auth`,
              { socket_id: socketId, channel_name: channel.name },
              { headers: { Authorization: `Bearer ${this.token}` } }
            );
            callback(null, response.data);
          } catch (error: any) {
            Logger.error("Pusher authorization error:", error);
            callback(error, null);
          }
        },
      }),
    });
  }

  private token: string = "";
  private userId: string = "";

  setup(userId: string, token: string, organizationId: string): void {
    this.userId = userId;
    this.token = token;
    const channel = this.client.subscribe(`private-org-${organizationId}`);
    channel.bind("pusher:subscription_succeeded", () =>
      Logger.info(`Subscribed to private-org-${organizationId}`)
    );
    channel.bind("pusher:subscription_error", (error: any) =>
      this.sendMessage("Failed to subscribe to notifications.")
    );
    channel.bind("deposit", (data: any) =>
      this.sendMessage(`💰 *New Deposit*: ${data.amount} USDC on Solana`)
    );
  }

  private async sendMessage(message: string): Promise<void> {
    // This assumes access to bot instance; we'll inject it later
    // For now, log it
    Logger.info(`Sending message to ${this.userId}: ${message}`);
  }
}
