/**
 * Outbound port that verifies a user's plaintext password against the stored
 * hash. Crossing the user-table boundary is intentional — disabling 2FA is a
 * security-sensitive action that MUST re-prove credential ownership, and the
 * cleanest place to express that requirement is at the BC boundary rather
 * than pushing every caller through the authentication BC.
 *
 * Returns `true` only when the user exists AND the password matches.
 */
export abstract class UserPasswordVerifierPort {
  abstract verifyPassword(userId: string, plaintext: string): Promise<boolean>;
}
