import { Telegraf, Markup } from "telegraf";
import { CopperxService } from "../services/copperx";
import { SessionManager, WizardState } from "./session";
import { Logger } from "../utils/logger";

export class BotWizard {
  constructor(
    private bot: Telegraf,
    private copperx: CopperxService,
    private sessionManager: SessionManager
  ) {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.command("start", this.handleStart.bind(this));
    this.bot.action("wizard_main_menu", this.showMainMenu.bind(this));
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

  private async handleStart(ctx: any): Promise<void> {
    const userId = ctx.from.id.toString();
    const firstName = ctx.from.first_name || "User";
    if (this.sessionManager.get(userId).hasSeenGreeting) {
      await this.showMainMenu(ctx);
    } else {
      this.sessionManager.set(userId, { hasSeenGreeting: true });
      await ctx.reply(
        `Hello, ${firstName}! Welcome to the Copperx USDC Bot.\nClick below to begin:`,
        Markup.inlineKeyboard([
          [Markup.button.callback("Start", "wizard_main_menu")],
        ])
      );
    }
  }

  private async showMainMenu(ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    const userId = ctx.from.id.toString();
    this.sessionManager.clearWizard(userId);
    await ctx.reply(
      "What would you like to do?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Login", "wizard_login"),
          Markup.button.callback("Check Balance", "wizard_balance"),
        ],
        [
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

  private async handleLogin(ctx: any): Promise<void> {
    const userId = ctx.from!.id.toString();
    this.sessionManager.set(userId, {
      wizard: { step: "login_email", data: {} },
    });
    await ctx.answerCbQuery();
    await ctx.reply("Please enter your email address:");
  }

  private async handleBalance(ctx: any): Promise<void> {
    const userId = ctx.from!.id.toString();
    await ctx.answerCbQuery();
    if (!this.sessionManager.isValid(userId)) {
      await ctx.reply(
        "You need to log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      return;
    }
    const data = await this.copperx.request(
      "GET",
      "/api/wallets/balances",
      null,
      this.sessionManager.get(userId).token
    );
    await ctx.reply(
      data.error ? `Error: ${data.error}` : `USDC Balance: ${data.usdc || 0}`
    );
  }

  private async handleDeposit(ctx: any): Promise<void> {
    const userId = ctx.from!.id.toString();
    await ctx.answerCbQuery();
    if (!this.sessionManager.isValid(userId)) {
      await ctx.reply(
        "You need to log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      return;
    }
    const data = await this.copperx.request(
      "POST",
      "/api/wallets/deposit",
      { currency: "USDC" },
      this.sessionManager.get(userId).token
    );
    await ctx.reply(
      data.error
        ? `Error: ${data.error}`
        : `Deposit Address: ${data.address}\nSend USDC here.`
    );
  }

  private async handleTransfer(ctx: any): Promise<void> {
    const userId = ctx.from!.id.toString();
    this.sessionManager.set(userId, {
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

  private async handleWithdraw(ctx: any): Promise<void> {
    const userId = ctx.from!.id.toString();
    this.sessionManager.set(userId, {
      wizard: { step: "withdraw_amount", data: {} },
    });
    await ctx.answerCbQuery();
    await ctx.reply("Please enter the amount to withdraw (e.g., 10):");
  }

  private async handleHelp(ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    await ctx.reply(
      "Here’s how to use the bot:\n" +
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

  private async handleTransferEmail(ctx: any): Promise<void> {
    const userId = ctx.from!.id.toString();
    this.sessionManager.set(userId, {
      wizard: { step: "transfer_email_amount", data: { type: "email" } },
    });
    await ctx.answerCbQuery();
    await ctx.reply("Please enter the amount to transfer (e.g., 10):");
  }

  private async handleTransferWallet(ctx: any): Promise<void> {
    const userId = ctx.from!.id.toString();
    this.sessionManager.set(userId, {
      wizard: { step: "transfer_wallet_amount", data: { type: "wallet" } },
    });
    await ctx.answerCbQuery();
    await ctx.reply("Please enter the amount to transfer (e.g., 10):");
  }

  private async handleCancel(ctx: any): Promise<void> {
    const userId = ctx.from!.id.toString();
    this.sessionManager.clearWizard(userId);
    await ctx.answerCbQuery();
    await ctx.reply(
      "Action cancelled. Return to the menu?",
      Markup.inlineKeyboard([
        [Markup.button.callback("Yes", "wizard_main_menu")],
      ])
    );
  }

  private async handleText(ctx: any): Promise<void> {
    const userId = ctx.from.id.toString();
    const text = ctx.message.text.trim();
    const wizard = this.sessionManager.get(userId).wizard;

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
        await ctx.reply("OTP sent to your email. Please enter the OTP:");
      }
    } else if (wizard.step === "login_otp") {
      const data = await this.copperx.request(
        "POST",
        "/api/auth/email-otp/authenticate",
        { otp: text, email: wizard.data.email, sid: wizard.data.sid }
      );
      if (data.error) {
        await ctx.reply(`Error: ${data.error}`);
      } else {
        this.sessionManager.set(userId, {
          token: data.accessToken,
          expires: Date.now() + 3600000,
          organizationId: data.user.organizationId,
        });
        Logger.info("Session after login:", this.sessionManager.get(userId));
        // Pusher setup would go here; we'll integrate it later
        this.sessionManager.clearWizard(userId);
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
      await ctx.reply(
        wizard.data.type === "email"
          ? "Please enter the recipient email:"
          : "Please enter the wallet address:"
      );
    } else if (wizard.step === "transfer_email_recipient") {
      wizard.data.recipient = text;
      await this.processTransfer(ctx, userId, "send", { email: text });
    } else if (wizard.step === "transfer_wallet_address") {
      wizard.data.address = text;
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
      await ctx.reply("Please enter the bank ID:");
    } else if (wizard.step === "withdraw_bank") {
      wizard.data.bankId = text;
      await this.processWithdraw(ctx, userId);
    }
  }

  private async processTransfer(
    ctx: any,
    userId: string,
    endpoint: string,
    extraData: any
  ): Promise<void> {
    if (!this.sessionManager.isValid(userId)) {
      await ctx.reply(
        "Please log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      this.sessionManager.clearWizard(userId);
      return;
    }
    const wizard = this.sessionManager.get(userId).wizard!;
    const data = await this.copperx.request(
      "POST",
      `/api/transfers/${endpoint}`,
      { amount: wizard.data.amount, currency: "USDC", ...extraData },
      this.sessionManager.get(userId).token
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

  private async processWithdraw(ctx: any, userId: string): Promise<void> {
    if (!this.sessionManager.isValid(userId)) {
      await ctx.reply(
        "Please log in first.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "wizard_login")],
        ])
      );
      this.sessionManager.clearWizard(userId);
      return;
    }
    const wizard = this.sessionManager.get(userId).wizard!;
    const data = await this.copperx.request(
      "POST",
      "/api/transfers/offramp",
      {
        amount: wizard.data.amount,
        bankId: wizard.data.bankId,
        currency: "USDC",
      },
      this.sessionManager.get(userId).token
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

  private async confirmTransferEmail(ctx: any): Promise<void> {
    await this.confirmTransfer(ctx, "send", "email");
  }

  private async confirmTransferWallet(ctx: any): Promise<void> {
    await this.confirmTransfer(ctx, "wallet-withdraw", "address");
  }

  private async confirmTransfer(
    ctx: any,
    endpoint: string,
    recipientKey: string
  ): Promise<void> {
    await ctx.answerCbQuery();
    const [amount, recipient] = ctx.match.slice(1);
    const userId = ctx.from!.id.toString();
    const data = await this.copperx.request(
      "POST",
      `/api/transfers/${endpoint}`,
      {
        amount: parseFloat(amount),
        [recipientKey]: recipient,
        currency: "USDC",
      },
      this.sessionManager.get(userId).token
    );
    this.sessionManager.clearWizard(userId);
    await ctx.reply(
      data.error
        ? `Error: ${data.error}`
        : `Transferred ${amount} USDC to ${recipient}!`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Back to Menu", "wizard_main_menu")],
      ])
    );
  }

  private async confirmWithdraw(ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    const [amount, bankId] = ctx.match.slice(1);
    const userId = ctx.from!.id.toString();
    const data = await this.copperx.request(
      "POST",
      "/api/transfers/offramp",
      { amount: parseFloat(amount), bankId, currency: "USDC" },
      this.sessionManager.get(userId).token
    );
    this.sessionManager.clearWizard(userId);
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
