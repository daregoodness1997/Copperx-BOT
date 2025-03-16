# Copperx Telegram Bot

A Telegram bot built with Node.js and TypeScript to interact with the Copperx API for managing USDC transactions, including login, balance checking, deposits, transfers, withdrawals, and real-time deposit notifications via Pusher.

## Features

- **Interactive Wizard**: Button-driven interface for seamless user interaction.
- **Authentication**: Email-based OTP login with session management.
- **USDC Operations**: Check balance, deposit, transfer (email/wallet), and withdraw USDC.
- **Real-Time Notifications**: Pusher integration for deposit updates.
- **Modular Design**: Organized using OOP principles for maintainability and scalability.

## Prerequisites

- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **Telegram Account**: For bot creation and token generation
- **Copperx API Access**: API key and URL from Copperx
- **Pusher Account**: For real-time notifications (key and cluster)

## Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/daregoodness1997/copperx-telegram-bot.git
   cd copperx-telegram-bot
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:
   Create a `.env` file in the root directory with the following:

   ```
   TELEGRAM_TOKEN=your-telegram-bot-token
   COPPERX_API_KEY=your-copperx-api-key
   COPPERX_API_URL=https://api.copperx.com
   PUSHER_KEY=your-pusher-key
   PUSHER_CLUSTER=your-pusher-cluster
   ```

   - Get `TELEGRAM_TOKEN` from [BotFather](https://t.me/BotFather).
   - Obtain `COPPERX_API_KEY` and `COPPERX_API_URL` from Copperx.
   - Fetch `PUSHER_KEY` and `PUSHER_CLUSTER` from [Pusher](https://pusher.com/).

4. **Compile TypeScript (if using TS)**:

   ```bash
   npx tsc
   ```

5. **Run the Bot**:
   ```bash
   node dist/index.js
   ```
   Or, if using `ts-node` for development:
   ```bash
   npx ts-node src/index.ts
   ```

## Project Structure

```
copperx-telegram-bot/
├── src/
│   ├── config/
│   │   └── env.ts          # Environment variable configuration
│   ├── services/
│   │   ├── copperx.ts     # Copperx API interaction service
│   │   └── pusher.ts      # Pusher real-time notification service
│   ├── bot/
│   │   ├── bot.ts         # Main bot setup and initialization
│   │   ├── session.ts     # Session management logic
│   │   └── wizard.ts      # Wizard flow and command handlers
│   ├── utils/
│   │   └── logger.ts      # Simple logging utility
│   └── index.ts           # Entry point
├── .env                   # Environment variables (not tracked)
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

### Key Components

- **`EnvConfig`**: Loads and validates environment variables.
- **`CopperxService`**: Handles API requests to Copperx (e.g., authentication, transactions).
- **`PusherService`**: Manages real-time deposit notifications (currently logs messages; bot integration pending).
- **`SessionManager`**: Tracks user sessions (in-memory; consider Redis for persistence).
- **`BotWizard`**: Defines the interactive flow with Telegram commands and actions.
- **`CopperxBot`**: Orchestrates the bot setup and lifecycle.

## Usage

1. **Start the Bot**:

   - In Telegram, send `/start` to your bot.
   - First-time users see a greeting with a "Start" button; returning users go straight to the main menu.

2. **Main Menu**:

   - **Login**: Authenticate with email and OTP.
   - **Check Balance**: View USDC balance (requires login).
   - **Deposit**: Get a USDC deposit address.
   - **Transfer**: Send USDC to an email or wallet address.
   - **Withdraw**: Withdraw USDC to a bank.
   - **Help**: View usage instructions.

3. **Login Flow**:

   - Select "Login" → Enter email → Receive OTP → Enter OTP → Authenticated.

4. **Example Commands**:

   - After login, select "Check Balance" to see your USDC balance.
   - Choose "Transfer" → "To Email" → Enter amount → Enter recipient email → Confirm.

5. **Notifications**:
   - Deposit notifications are logged (Pusher integration incomplete; see "Future Improvements").

## Development

### Scripts

- **Build**: `npm run build` (compiles TypeScript to `dist/`).
- **Start**: `npm start` (runs the compiled bot).
- **Dev**: `npm run dev` (runs with `ts-node` for development).

Add these to `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  }
}
```

### Debugging

- Logs are output to the console via `Logger`.
- Check logs for:
  - API request/response details (e.g., errors from Copperx).
  - Session state after login (`Session after login:`).
  - Session validity checks (`Checking session validity:`).

### Testing

- Use a Telegram test bot or a local testing environment.

## Configuration

### Environment Variables

| Variable          | Description            | Example                       |
| ----------------- | ---------------------- | ----------------------------- |
| `TELEGRAM_TOKEN`  | Telegram Bot API token | `123456:ABC-DEF1234ghIkl-xyz` |
| `COPPERX_API_KEY` | Copperx API key        | `ck_live_abc123`              |
| `COPPERX_API_URL` | Copperx API base URL   | `https://api.copperx.com`     |
| `PUSHER_KEY`      | Pusher app key         | `your-pusher-key`             |
| `PUSHER_CLUSTER`  | Pusher cluster         | `us2`                         |

## Future Improvements

- **Persistent Sessions**: Replace in-memory `SessionManager` with Redis or a database.
- **Pusher Messaging**: Fully integrate `PusherService` with the bot to send Telegram messages (e.g., inject `bot` instance).
- **Error Handling**: Add custom exceptions and retry logic for API failures.
- **Unit Tests**: Write tests for `CopperxService`, `SessionManager`, and `BotWizard` using Jest.
- **Command Validation**: Add input validation (e.g., email format, amount ranges).
- **Localization**: Support multiple languages in the wizard.

## Troubleshooting

- **Bot Not Starting**:
  - Check `.env` for missing/invalid variables.
  - Verify Node.js version compatibility.
- **API Errors**:
  - Inspect console logs for request/response details.
  - Ensure `COPPERX_API_URL` is correct and accessible.
- **Session Issues**:
  - Confirm `token` is set after login (see logs).
  - Check expiration time in `SessionManager`.
- **Pusher Not Working**:
  - Validate Pusher credentials in `.env`.
  - Ensure the Copperx API supports the `/api/notifications/auth` endpoint.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For issues or suggestions, open an issue on GitHub or contact [daregoodness@gmail.com](mailto:daregoodness@gmail.com).

---

```

```
