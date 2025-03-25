export interface Wallet {
  walletAddress: string;
  walletType: string;
  id: string;
  isDefault?: boolean;
}

export interface WalletBalance {
  walletId: string;
  balances: {
    decimals: number;
    balance: string;
    symbol: string;
    address: string;
  }[];
}

export interface Session {
  token: string;
  expires?: number;
  organizationId?: string;
  hasSeenGreeting?: boolean;
  wizard?: {
    step: string;
    data: {
      selectedWalletId?: string | null;
      email?: string;
      sid?: string;
      amount?: number;
      recipient?: string;
      address?: string;
      type?: string;
      bankId?: string;
      withdrawData?: {
        amount: number;
        bankId: string;
        invoiceNumber?: string;
        invoiceUrl?: string;
        purposeCode?: string;
        sourceOfFunds?: string;
        recipientRelationship?: string;
        quotePayload?: string;
        quoteSignature?: string;
        preferredWalletId?: string;
        customerData?: {
          name: string;
          businessName: string;
          email: string;
          country: string;
        };
        sourceOfFundsFile?: string;
        note?: string;
      };
    };
  };
}

export interface TransactionHistoryResponse {
  page: number;
  limit: number;
  count: number;
  hasMore: boolean;
  data: Transaction[];
}

export interface Transaction {
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

export interface Customer {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  businessName: string;
  email: string;
  country: string;
}

export interface InnerTransaction {
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

export interface Account {
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
