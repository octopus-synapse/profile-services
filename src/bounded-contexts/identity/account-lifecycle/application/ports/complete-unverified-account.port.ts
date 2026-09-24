export interface CompleteUnverifiedAccountCommand {
  email: string;
  password: string;
  emailVerificationToken: string;
  acceptedTosVersion: string;
  acceptedPrivacyVersion: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CompleteUnverifiedAccountResult {
  userId: string;
  email: string;
}

export abstract class CompleteUnverifiedAccountPort {
  abstract execute(
    command: CompleteUnverifiedAccountCommand,
  ): Promise<CompleteUnverifiedAccountResult>;
}
