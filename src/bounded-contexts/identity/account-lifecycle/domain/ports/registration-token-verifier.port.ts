/**
 * Registration Token Verifier Port
 *
 * Outbound port that checks the pre-signup continuation token issued by
 * the email-verification BC's confirm step. Returns the verified e-mail
 * or `null` — kept abstract so the use case never touches the secret.
 */

export abstract class RegistrationTokenVerifierPort {
  abstract verify(token: string): string | null;
}
