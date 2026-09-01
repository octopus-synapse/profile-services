/**
 * Registration Token Issuer Port
 *
 * Outbound port that signs the pre-signup continuation token — kept
 * abstract so the use case stays free of config/secret plumbing (the
 * composition wraps the shared-kernel `issueRegistrationToken` with the
 * app secret).
 */

export abstract class RegistrationTokenIssuerPort {
  abstract issue(email: string): string;
}
