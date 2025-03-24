import { Telegraf, Markup, Context } from "telegraf";
import { Update, Message } from "telegraf/typings/core/types/typegram";
import { CopperxService } from "../services/copperx";
import { PusherService } from "../services/pusher";
import { SessionManager } from "./session";
import { Logger } from "../utils/logger";

interface Wallet {
  walletAddress: string;
  walletType: string;
  id: string;
  isDefault?: boolean;
}
interface WalletBalance {
  walletId: string;
  balances: {
    decimals: number;
    balance: string;
    symbol: string;
    address: string;
  }[];
}

interface Session {
  token: string;
  wizard?: {
    step: string;
    data: {
      selectedWalletId: string | null;
    };
  };
}

// Type definitions based on the response payload
interface TransactionHistoryResponse {
  page: number;
  limit: number;
  count: number;
  hasMore: boolean;
  data: Transaction[];
}

interface Transaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  status: string;
  customerId: string;
  customer: Customer;
  type: string;
  sourceCountry: string;
  destinationCountry: string;
  destinationCurrency: string;
  amount: string;
  currency: string;
  amountSubtotal: string;
  totalFee: string;
  feePercentage: string;
  feeCurrency: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  sourceOfFundsFile?: string;
  note?: string;
  purposeCode: string;
  sourceOfFunds: string;
  recipientRelationship: string;
  sourceAccountId: string;
  destinationAccountId: string;
  paymentUrl?: string;
  mode: string;
  isThirdPartyPayment: boolean;
  transactions: InnerTransaction[];
  destinationAccount: Account;
  sourceAccount: Account;
  senderDisplayName: string;
}

interface Customer {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  businessName: string;
  email: string;
  country: string;
}

interface InnerTransaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  type: string;
  providerCode: string;
  kycId: string;
  transferId: string;
  status: string;
  externalStatus: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  totalFee: string;
  feeCurrency: string;
  transactionHash: string;
  depositAccount: Account;
  externalTransactionId: string;
  externalCustomerId: string;
  depositUrl: string;
}

interface Account {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  country: string;
  network: string;
  accountId: string;
  walletAddress?: string;
  bankName?: string;
  bankAddress?: string;
  bankRoutingNumber?: string;
  bankAccountNumber?: string;
  bankDepositMessage?: string;
  wireMessage?: string;
  payeeEmail?: string;
  payeeOrganizationId?: string;
  payeeId?: string;
  payeeDisplayName?: string;
}

// Type alias for matched context in regex actions
type MatchedContext<C extends Context, T extends Update> = C & {
  match: RegExpExecArray;
};

export class BotWizard {
  constructor(
    private bot: Telegraf,
    private copperx: CopperxService,
    private sessionManager: SessionManager,
    private pusher: PusherService
  ) {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.command("start", this.handleStart.bind(this));
    this.bot.action("wizard_main_menu", this.handleMainMenuAction.bind(this));
    this.bot.action("wizard_wallet", this.handleWalletMenuAction.bind(this));
    this.bot.action("wizard_wallets", this.handleWallets.bind(this));
    this.bot.action(
      "wizard_default_wallet",
      this.handleGetDefaultWallet.bind(this)
    );
    this.bot.action(
      "wizard_default_wallet_set",
      this.handleSetDefaultWallet.bind(this)
    );
    this.bot.action(
      "transaction_history",
      this.handleGetTransactionHistory.bind(this)
    );
    this.bot.action("wizard_balances", this.handleWalletsBalance.bind(this));
    this.bot.action("wizard_profile", this.handleCheckProfile.bind(this));
    this.bot.action("wizard_kyc", this.handleCheckKYC.bind(this));
    this.bot.action("wizard_login", this.handleLogin.bind(this));
    this.bot.action("wizard_balance", this.handleBalance.bind(this));
    this.bot.action("wizard_deposit", this.handleDeposit.bind(this));
    this.bot.action("wizard_transfer", this.handleTransfer.bind(this));
    this.bot.action("wizard_withdraw", this.handleWithdraw.bind(this));
    this.bot.action("wizard_help", this.handleHelp.bind(this));
    this.bot.action(
      "wizard_transfer_email",
      this.handleTransferEmail.bind(this)
    );
    this.bot.action(
      "wizard_transfer_wallet",
      this.handleTransferWallet.bind(this)
    );
    this.bot.action("wizard_cancel", this.handleCancel.bind(this));
    this.bot.action(
      /wizard_confirm_transfer_email_(.+)_(.+)/,
      this.confirmTransferEmail.bind(this)
    );
    this.bot.action(
      /wizard_confirm_transfer_wallet_(.+)_(.+)/,
      this.confirmTransferWallet.bind(this)
    );
    this.bot.action(
      /wizard_confirm_withdraw_(.+)_(.+)/,
      this.confirmWithdraw.bind(this)
    );
    this.bot.on("text", this.handleText.bind(this));
  }

  private async handleStart(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    const firstName = ctx.from!.first_name || "User";
    const session = await this.sessionManager.get(userId);
    if (session.hasSeenGreeting) {
      await this.displayMainMenu(ctx);
    } else {
      await this.sessionManager.set(userId, { hasSeenGreeting: true });
      await ctx.reply(
        `Hello, ${firstName}! Welcome to the Copperx USDC Bot.\nClick below to begin:`,
        Markup.inlineKeyboard([
          [Markup.button.callback("Start", "wizard_main_menu")],
        ])
      );
    }
  }

  private async handleMainMenuAction(ctx: Context<Update>): Promise<void> {
    await ctx.answerCbQuery();
    await this.displayMainMenu(ctx);
  }
  private async handleWalletMenuAction(ctx: Context<Update>): Promise<void> {
    await ctx.answerCbQuery();
    await this.displayWalletMenu(ctx);
  }

  private async displayMainMenu(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await this.sessionManager.clearWizard(userId);
    await ctx.reply(
      "What would you like to do?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Login", "wizard_login"),
          Markup.button.callback("Check KYC", "wizard_kyc"),
          Markup.button.callback("Profile", "wizard_profile"),
        ],
        [
          Markup.button.callback("Wallets Management", "wizard_wallet"),
          Markup.button.callback("Fund Transfer", "wizard_deposit"),
          Markup.button.callback("Transfer", "wizard_transfer"),
        ],
        [
          Markup.button.callback("Check Balance", "wizard_balance"),
          Markup.button.callback("Deposit", "wizard_deposit"),
          Markup.button.callback("Transfer", "wizard_transfer"),
        ],
        [
          Markup.button.callback("Withdraw", "wizard_withdraw"),
          Markup.button.callback("Help", "wizard_help"),
        ],
      ])
    );
  }

  private async displayWalletMenu(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await this.sessionManager.clearWizard(userId);
    await ctx.reply(
      "Wallet Management",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Get All Wallets", "wizard_wallets"),
          Markup.button.callback("Get All Balances", "wizard_balances"),
        ],
        [
          Markup.button.callback("Get Default Wallet", "wizard_default_wallet"),
          Markup.button.callback(
            "Set Default Wallet",
            "wizard_default_wallet_set"
          ),
        ],
        [Markup.button.callback("Transaction History", "transaction_history")],
      ])
    );
  }

  private async handleLogin(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await this.sessionManager.set(userId, {
      wizard: { step: "login_email", data: {} },
    });
    await ctx.answerCbQuery();
    await ctx.reply("Please enter your email address:");
  }

  private async handleSetDefaultWallet(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    const session = await this.sessionManager.get(userId);

    try {
      // Get current session and ensure wizard exists
      const currentSession = await this.sessionManager.get(userId);
      if (!currentSession.wizard) {
        await this.sessionManager.set(userId, {
          wizard: {
            step: "set_default_wallet",
            data: { selectedWalletId: null },
          },
        });
      }

      // Fetch wallets from API
      const wallets = (await this.copperx.request(
        "GET",
        "/api/wallets",
        null,
        session.token
      )) as Wallet[];

      Logger.info(wallets, "wallets information");

      // Get current selected wallet ID from session
      const selectedWalletId =
        currentSession.wizard?.data.selectedWalletId || null;

      // Create radio buttons for each wallet with checkmark for selected
      const walletButtons = wallets.map((wallet) => {
        const isSelected = wallet.id === selectedWalletId;
        const buttonText = `${wallet.walletAddress} ${isSelected ? " ✅" : ""}`;

        return [
          Markup.button.callback(
            buttonText,
            `set_wallet_${wallet.id}`,
            wallet.isDefault && !selectedWalletId // Only show as default if no selection override
          ),
        ];
      });

      // Add navigation buttons
      const navigationButtons = [
        [
          Markup.button.callback("Back", "wizard_main_menu"),
          Markup.button.callback("Confirm Selection", "wizard_confirm_default"),
        ],
      ];

      await ctx.answerCbQuery();
      // Edit existing message if callback, otherwise send new
      if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(
          "Select your default wallet:",
          Markup.inlineKeyboard([...walletButtons, ...navigationButtons])
        );
      } else {
        await ctx.reply(
          "Select your default_wallet:",
          Markup.inlineKeyboard([...walletButtons, ...navigationButtons])
        );
      }

      // Handle wallet selection callback
      this.bot.action(/^set_wallet_(.+)$/, async (ctx) => {
        const selectedWalletId = ctx.match[1];
        await this.sessionManager.set(userId, {
          wizard: {
            step: "set_default_wallet",
            data: { selectedWalletId },
          },
        });

        await this.handleSetDefaultWallet(ctx);
      });

      // Handle confirmation callback
      this.bot.action("wizard_confirm_default", async (ctx) => {
        const currentSession = await this.sessionManager.get(userId);

        if (!currentSession.wizard || !currentSession.wizard.data) {
          await ctx.reply("Session expired. Please start over.");
          return;
        }

        const selectedWalletId = currentSession.wizard.data.selectedWalletId;

        if (!selectedWalletId) {
          await ctx.reply("Please select a wallet first!");
          return;
        }

        // Update default wallet via API
        await this.copperx.request(
          "POST",
          `/api/wallets/default`,
          { walletId: selectedWalletId },
          session.token
        );

        // Clear selection after successful update
        await this.sessionManager.set(userId, {
          wizard: {
            step: "set_default_wallet",
            data: { selectedWalletId: null },
          },
        });

        await ctx.reply(
          "Default wallet updated successfully!",
          Markup.inlineKeyboard([
            [Markup.button.callback("Back to Menu", "wizard_main_menu")],
          ])
        );
        await this.handleSetDefaultWallet(ctx);
      });
    } catch (error) {
      Logger.error(error, "Error in handleSetDefaultWallet");
      await ctx.reply(
        "An error occurred while fetching wallets. Please try again."
      );
    }
  }

  private async handleBalance(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await ctx.answerCbQuery();
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "🔒 You need to log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      return;
    }
    const session = await this.sessionManager.get(userId);
    const data = await this.copperx.request(
      "GET",
      "/api/wallets/balances",
      null,
      session.token
    );
    await ctx.reply(
      data.error ? `Error: ${data.error}` : `USDC Balance: ${data.usdc || 0}`
    );
  }

  private async handleWallets(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await ctx.answerCbQuery();
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "🔒 You need to log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      return;
    }
    const session = await this.sessionManager.get(userId);
    const data = (await this.copperx.request(
      "GET",
      "/api/wallets",
      null,
      session.token
    )) as Wallet[];

    const message =
      `*📌 Available Wallets:*\n\n` +
      data
        .map((p: Wallet) => `💰 *${p.walletAddress}*\n📝 _${p.walletType}_\n`)
        .join("\n");

    await ctx.reply(
      message,

      Markup.inlineKeyboard([
        [Markup.button.callback("Back to Menu", "wizard_main_menu")],
      ])
    );
  }

  private async handleGetTransactionHistory(
    ctx: Context<Update>
  ): Promise<void> {
    const userId = ctx.from!.id.toString();
    await ctx.answerCbQuery();

    // Check if user is logged in
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "🔒 You need to log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      return;
    }

    try {
      const session = await this.sessionManager.get(userId);

      // Fetch transaction history
      const response = (await this.copperx.request(
        "GET",
        "/api/transfers",
        null,
        session.token
      )) as TransactionHistoryResponse;

      Logger.info(response, "transactions");

      if (!response.data || response.data.length === 0) {
        await ctx.reply(
          "No transactions found.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Back to Menu", "wizard_main_menu")],
          ])
        );
        return;
      }

      // Format transactions for display
      const transactionsText = response.data
        .map((tx, index) => {
          const date = new Date(tx.createdAt).toLocaleDateString();
          return `Transaction #${index + 1}
ID: ${tx.id}
Date: ${date}
Type: ${tx.type}
Status: ${tx.status}
Amount: ${tx.amount} ${tx.currency}
From: ${
            tx.sourceAccount?.walletAddress ||
            tx.sourceAccount?.bankAccountNumber ||
            "N/A"
          }
To: ${
            tx.destinationAccount?.walletAddress ||
            tx.destinationAccount?.bankAccountNumber ||
            "N/A"
          }
Fee: ${tx.totalFee} ${tx.feeCurrency}
------------------------`;
        })
        .join("\n");

      // Create pagination buttons
      const paginationButtons = [];
      if (response.page > 1) {
        paginationButtons.push(
          Markup.button.callback("Previous", `tx_page_${response.page - 1}`)
        );
      }
      if (response.hasMore) {
        paginationButtons.push(
          Markup.button.callback("Next", `tx_page_${response.page + 1}`)
        );
      }

      const keyboard = [
        ...(paginationButtons.length > 0 ? [paginationButtons] : []),
        [Markup.button.callback("Back to Menu", "wizard_main_menu")],
      ];

      await ctx.reply(
        `Transaction History (Page ${response.page} of ${Math.ceil(
          response.count / response.limit
        )}):\n\n${transactionsText}`,
        Markup.inlineKeyboard(keyboard)
      );

      // Handle pagination callbacks
      this.bot.action(/^tx_page_(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[1]);
        const paginatedResponse = (await this.copperx.request(
          "GET",
          `/api/transfers?page=${page}&limit=${response.limit}`,
          null,
          session.token
        )) as TransactionHistoryResponse;

        const updatedText = paginatedResponse.data
          .map((tx, index) => {
            const date = new Date(tx.createdAt).toLocaleDateString();
            return `Transaction #${index + 1}
ID: ${tx.id}
Date: ${date}
Type: ${tx.type}
Status: ${tx.status}
Amount: ${tx.amount} ${tx.currency}
From: ${
              tx.sourceAccount?.walletAddress ||
              tx.sourceAccount?.bankAccountNumber ||
              "N/A"
            }
To: ${
              tx.destinationAccount?.walletAddress ||
              tx.destinationAccount?.bankAccountNumber ||
              "N/A"
            }
Fee: ${tx.totalFee} ${tx.feeCurrency}
------------------------`;
          })
          .join("\n");

        const updatedPagination = [];
        if (paginatedResponse.page > 1) {
          updatedPagination.push(
            Markup.button.callback(
              "Previous",
              `tx_page_${paginatedResponse.page - 1}`
            )
          );
        }
        if (paginatedResponse.hasMore) {
          updatedPagination.push(
            Markup.button.callback(
              "Next",
              `tx_page_${paginatedResponse.page + 1}`
            )
          );
        }

        await ctx.editMessageText(
          `Transaction History (Page ${paginatedResponse.page} of ${Math.ceil(
            paginatedResponse.count / paginatedResponse.limit
          )}):\n\n${updatedText}`,
          Markup.inlineKeyboard([
            ...(updatedPagination.length > 0 ? [updatedPagination] : []),
            [Markup.button.callback("Back to Menu", "wizard_main_menu")],
          ])
        );
      });
    } catch (error) {
      Logger.error(error, "Error fetching transaction history");
      await ctx.reply(
        "Error fetching transaction history. Please try again.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Back to Menu", "wizard_main_menu")],
        ])
      );
    }
  }

  private async handleWalletsBalance(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await ctx.answerCbQuery();
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "🔒 You need to log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      return;
    }
    const session = await this.sessionManager.get(userId);
    const data = (await this.copperx.request(
      "GET",
      "/api/wallets/balances",
      null,
      session.token
    )) as WalletBalance[];

    const message =
      `*📌 Available Wallets Balance:*\n\n` +
      data
        .map((wallet) =>
          wallet.balances
            .map(
              (balance) =>
                `💰 *${balance.address}*\n📝 _${balance.balance}_\n _${balance.symbol}_`
            )
            .join("\n")
        )
        .join("\n");

    await ctx.reply(
      message,

      Markup.inlineKeyboard([
        [Markup.button.callback("Back to Menu", "wizard_main_menu")],
      ])
    );
  }

  private async handleGetDefaultWallet(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await ctx.answerCbQuery();
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "🔒 You need to log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      return;
    }
    const session = await this.sessionManager.get(userId);
    const data = await this.copperx.request(
      "GET",
      "/api/wallets/default",
      null,
      session.token
    );

    const message = `*📌 Default Wallet:*\n\n 💰 *${data.walletAddress}*\n📝 _${data.walletType}_\n`;

    await ctx.reply(
      message,

      Markup.inlineKeyboard([
        [Markup.button.callback("Back to Menu", "wizard_main_menu")],
      ])
    );
  }

  private async handleDeposit(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await ctx.answerCbQuery();
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "🔒 You need to log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      return;
    }
    const session = await this.sessionManager.get(userId);
    const data = await this.copperx.request(
      "POST",
      "/api/wallets/deposit",
      { currency: "USDC" },
      session.token
    );
    await ctx.reply(
      data.error
        ? `Error: ${data.error}`
        : `Deposit Address: ${data.address}\nSend USDC here.`
    );
  }

  private async handleTransfer(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await this.sessionManager.set(userId, {
      wizard: { step: "transfer_type", data: {} },
    });
    await ctx.answerCbQuery();
    await ctx.reply(
      "Choose transfer type:",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("To Email", "wizard_transfer_email"),
          Markup.button.callback("To Wallet", "wizard_transfer_wallet"),
        ],
        [Markup.button.callback("Cancel", "wizard_cancel")],
      ])
    );
  }

  private async handleWithdraw(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await this.sessionManager.set(userId, {
      wizard: { step: "withdraw_amount", data: {} },
    });
    await ctx.answerCbQuery();
    await ctx.reply("Please enter the amount to withdraw (e.g., 10):");
  }

  private async handleHelp(ctx: Context<Update>): Promise<void> {
    await ctx.answerCbQuery();
    await ctx.reply(
      "Here's how to use the bot:\n" +
        "- Login: Authenticate with your email.\n" +
        "- Check Balance: View your USDC balance.\n" +
        "- Deposit: Get a deposit address.\n" +
        "- Transfer: Send USDC to an email or wallet.\n" +
        "- Withdraw: Withdraw USDC to a bank.\n" +
        "Click below to return to the menu:",
      Markup.inlineKeyboard([
        [Markup.button.callback("Back to Menu", "wizard_main_menu")],
      ])
    );
  }
  private async handleCheckKYC(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    const session = await this.sessionManager.get(userId);
    let hasKyc;
    await ctx.answerCbQuery();

    // Check if user is logged in
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "🔒 You need to log in to view your kyc status.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
          [Markup.button.callback("Back to Menu", "wizard_main_menu")],
        ])
      );
      return;
    }

    const data = await this.copperx.request(
      "GET",
      `/api/kycs`,
      {},
      session.token
    );

    if (data.error) {
      await ctx.reply(`Error: ${data.error}`);
    } else {
      hasKyc = data.data.length > 0 ? true : false;

      await ctx.replyWithMarkdown(
        `📝 *Your KYC Status*\n${
          hasKyc
            ? "✅ Your KYC is *completed*! You're all set to use Copperx fully."
            : "⚠️ Your KYC is *not completed*. Complete it to unlock all features!"
        }`,
        Markup.inlineKeyboard([
          ...(hasKyc
            ? [[Markup.button.callback("View Profile", "wizard_profile")]]
            : [
                [
                  Markup.button.url(
                    "Finish KYC",
                    "https://dashboard.copperx.dev/settings"
                  ),
                ],
                [Markup.button.callback("Refresh Status", "wizard_profile")],
              ]),
          [Markup.button.callback("Back to Menu", "wizard_main_menu")],
        ])
      );
    }
  }
  private async handleCheckProfile(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    const session = await this.sessionManager.get(userId);
    let profile = "";
    await ctx.answerCbQuery();

    // Check if user is logged in
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "🔒 You need to log in to view your profile.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
          [Markup.button.callback("Back to Menu", "wizard_main_menu")],
        ])
      );
      return;
    }

    const data = await this.copperx.request(
      "GET",
      `/api/auth/me`,
      {},
      session.token
    );

    if (data.error) {
      await ctx.reply(`Error: ${data.error}`);
    } else {
      // Format profile info nicely
      profile = `
👤 *Your Profile*
- *Name*: ${data.firstName} ${data.lastName}
- *Email*: ${data.email}
- *Profile Image*: ${
        data.profileImage ? `[View](${data.profileImage})` : "Not set"
      }
- *Type*: ${data.type}
- *Wallet Address*: \`${data.walletAddress}\`
- *Wallet Account Type*: ${data.walletAccountType}
- *Organization ID*: ${session.organizationId || "Not available"}
    `.trim();
    }

    await ctx.reply(
      profile,
      Markup.inlineKeyboard([
        [Markup.button.callback("Back to Menu", "wizard_main_menu")],
      ])
    );
  }

  private async handleTransferEmail(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await this.sessionManager.set(userId, {
      wizard: { step: "transfer_email_amount", data: { type: "email" } },
    });
    await ctx.answerCbQuery();
    await ctx.reply("Please enter the amount to transfer (e.g., 10):");
  }

  private async handleTransferWallet(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await this.sessionManager.set(userId, {
      wizard: { step: "transfer_wallet_amount", data: { type: "wallet" } },
    });
    await ctx.answerCbQuery();
    await ctx.reply("Please enter the amount to transfer (e.g., 10):");
  }

  private async handleCancel(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    await this.sessionManager.clearWizard(userId);
    await ctx.answerCbQuery();
    await ctx.reply(
      "Action cancelled. Return to the menu?",
      Markup.inlineKeyboard([
        [Markup.button.callback("Yes", "wizard_main_menu")],
      ])
    );
  }

  private async handleText(ctx: Context<Update>): Promise<void> {
    const userId = ctx.from!.id.toString();
    const message = ctx.message as Message.TextMessage | undefined;
    if (!message || !("text" in message)) return; // Ensure it's a text message
    const text = message.text.trim();
    const session = await this.sessionManager.get(userId);
    const wizard = session.wizard;

    if (!wizard) return;

    if (wizard.step === "login_email") {
      wizard.data.email = text;
      wizard.step = "login_otp";
      const data = await this.copperx.request(
        "POST",
        "/api/auth/email-otp/request",
        { email: text }
      );
      if (data.error) {
        await ctx.reply(`Error: ${data.error}`);
      } else {
        wizard.data.sid = data.sid;
        await this.sessionManager.set(userId, { wizard });
        await ctx.reply("OTP sent to your email. Please enter the OTP:");
      }
    } else if (wizard.step === "login_otp") {
      const data = await this.copperx.request(
        "POST",
        "/api/auth/email-otp/authenticate",
        { otp: text, email: wizard.data.email, sid: wizard.data.sid }
      );
      Logger.info("Login authenticate response:", data);
      if (data.error) {
        await ctx.reply(`Error: ${data.error}`);
      } else {
        if (!data.accessToken || !data.user.organizationId) {
          Logger.error(
            "Missing token or organizationId in login response:",
            data
          );
          await ctx.reply("Authentication failed: Invalid server response.");
          return;
        }
        await this.sessionManager.set(userId, {
          token: data.accessToken,
          expires: Date.now() + 3600000,
          organizationId: data.organizationId,
        });
        Logger.info(
          "Session after login:",
          await this.sessionManager.get(userId)
        );
        await this.pusher.setup(
          userId,
          data.accessToken,
          data.user.organizationId
        );
        await this.sessionManager.clearWizard(userId);
        await ctx.reply(
          "Authenticated! You'll receive deposit notifications.\nWhat next?",
          Markup.inlineKeyboard([
            [Markup.button.callback("Main Menu", "wizard_main_menu")],
          ])
        );
      }
    } else if (
      wizard.step === "transfer_email_amount" ||
      wizard.step === "transfer_wallet_amount"
    ) {
      const amount = parseFloat(text);
      if (isNaN(amount)) {
        await ctx.reply("Invalid amount. Please enter a number (e.g., 10):");
        return;
      }
      wizard.data.amount = amount;
      wizard.step =
        wizard.step === "transfer_email_amount"
          ? "transfer_email_recipient"
          : "transfer_wallet_address";
      await this.sessionManager.set(userId, { wizard });
      await ctx.reply(
        wizard.data.type === "email"
          ? "Please enter the recipient email:"
          : "Please enter the wallet address:"
      );
    } else if (wizard.step === "transfer_email_recipient") {
      wizard.data.recipient = text;
      await this.sessionManager.set(userId, { wizard });
      await this.processTransfer(ctx, userId, "send", { email: text });
    } else if (wizard.step === "transfer_wallet_address") {
      wizard.data.address = text;
      await this.sessionManager.set(userId, { wizard });
      await this.processTransfer(ctx, userId, "wallet-withdraw", {
        address: text,
      });
    } else if (wizard.step === "withdraw_amount") {
      const amount = parseFloat(text);
      if (isNaN(amount)) {
        await ctx.reply("Invalid amount. Please enter a number (e.g., 10):");
        return;
      }
      wizard.data.amount = amount;
      wizard.step = "withdraw_bank";
      await this.sessionManager.set(userId, { wizard });
      await ctx.reply("Please enter the bank ID:");
    } else if (wizard.step === "withdraw_bank") {
      wizard.data.bankId = text;
      await this.sessionManager.set(userId, { wizard });
      await this.processWithdraw(ctx, userId);
    }
  }

  private async processTransfer(
    ctx: Context<Update>,
    userId: string,
    endpoint: string,
    extraData: any
  ): Promise<void> {
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "Please log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      await this.sessionManager.clearWizard(userId);
      return;
    }
    const session = await this.sessionManager.get(userId);
    Logger.info("Session:", session);
    const wizard = session.wizard!;
    const data = await this.copperx.request(
      "POST",
      `/api/transfers/${endpoint}`,
      { amount: wizard.data.amount, currency: "USDC", ...extraData },
      session.token
    );
    if (data.error) {
      await ctx.reply(`Error: ${data.error}`);
    } else {
      const recipient = extraData.email || extraData.address;
      await ctx.reply(
        `Confirm transfer of ${wizard.data.amount} USDC to ${recipient}? Fee: ${
          data.fee || 0
        }`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Yes",
              `wizard_confirm_transfer_${
                endpoint === "send" ? "email" : "wallet"
              }_${wizard.data.amount}_${recipient}`
            ),
            Markup.button.callback("No", "wizard_cancel"),
          ],
        ])
      );
    }
  }

  private async processWithdraw(
    ctx: Context<Update>,
    userId: string
  ): Promise<void> {
    if (!(await this.sessionManager.isValid(userId))) {
      await ctx.reply(
        "Please log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      await this.sessionManager.clearWizard(userId);
      return;
    }
    const session = await this.sessionManager.get(userId);
    const wizard = session.wizard!;
    const data = await this.copperx.request(
      "POST",
      "/api/transfers/offramp",
      {
        amount: wizard.data.amount,
        bankId: wizard.data.bankId,
        currency: "USDC",
      },
      session.token
    );
    if (data.error) {
      await ctx.reply(`Error: ${data.error}`);
    } else {
      await ctx.reply(
        `Confirm withdrawal of ${wizard.data.amount} USDC to bank ${
          wizard.data.bankId
        }? Fee: ${data.fee || 0}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Yes",
              `wizard_confirm_withdraw_${wizard.data.amount}_${wizard.data.bankId}`
            ),
            Markup.button.callback("No", "wizard_cancel"),
          ],
        ])
      );
    }
  }

  private async confirmTransferEmail(
    ctx: MatchedContext<Context<Update>, Update.CallbackQueryUpdate>
  ): Promise<void> {
    await this.confirmTransfer(ctx, "send", "email");
  }

  private async confirmTransferWallet(
    ctx: MatchedContext<Context<Update>, Update.CallbackQueryUpdate>
  ): Promise<void> {
    await this.confirmTransfer(ctx, "wallet-withdraw", "address");
  }

  private async confirmTransfer(
    ctx: MatchedContext<Context<Update>, Update.CallbackQueryUpdate>,
    endpoint: string,
    recipientKey: string
  ): Promise<void> {
    await ctx.answerCbQuery();
    const [amount, recipient] = ctx.match.slice(1);
    const userId = ctx.from!.id.toString();
    const session = await this.sessionManager.get(userId);
    const data = await this.copperx.request(
      "POST",
      `/api/transfers/${endpoint}`,
      {
        amount: parseFloat(amount),
        [recipientKey]: recipient,
        currency: "USDC",
      },
      session.token
    );
    await this.sessionManager.clearWizard(userId);
    await ctx.reply(
      data.error
        ? `Error: ${data.error}`
        : `Transferred ${amount} USDC to ${recipient}!`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Back to Menu", "wizard_main_menu")],
      ])
    );
  }

  private async confirmWithdraw(
    ctx: MatchedContext<Context<Update>, Update.CallbackQueryUpdate>
  ): Promise<void> {
    await ctx.answerCbQuery();
    const [amount, bankId] = ctx.match.slice(1);
    const userId = ctx.from!.id.toString();
    const session = await this.sessionManager.get(userId);
    const data = await this.copperx.request(
      "POST",
      "/api/transfers/offramp",
      { amount: parseFloat(amount), bankId, currency: "USDC" },
      session.token
    );
    await this.sessionManager.clearWizard(userId);
    await ctx.reply(
      data.error
        ? `Error: ${data.error}`
        : `Withdrawal of ${amount} USDC to bank ${bankId} initiated!`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Back to Menu", "wizard_main_menu")],
      ])
    );
  }
}
