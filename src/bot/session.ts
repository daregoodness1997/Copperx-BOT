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
  private sessions: { [userId: string]: SessionData } = {};

  get(userId: string): SessionData {
    return this.sessions[userId] || {};
  }

  set(userId: string, data: SessionData): void {
    this.sessions[userId] = { ...this.sessions[userId], ...data };
  }

  isValid(userId: string): boolean {
    const session = this.get(userId);
    const isValid = !!(
      session.token &&
      session.expires &&
      session.expires > Date.now()
    );
    console.log("Checking session validity:", { session, isValid });
    return isValid;
  }

  clearWizard(userId: string): void {
    if (this.sessions[userId]) delete this.sessions[userId].wizard;
  }
}
