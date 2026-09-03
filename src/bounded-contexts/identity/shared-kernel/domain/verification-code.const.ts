/**
 * The one-time code sent by e-mail to confirm a sensitive change.
 *
 * Account deletion, e-mail change, password change and pre-signup
 * verification each declared their own `CODE_TTL_MINUTES = 15` and
 * `RESEND_COOLDOWN_SECONDS = 60`, and each recomputed the same
 * minutes-to-milliseconds arithmetic. They are the same policy: if one
 * moves, all four have to, or the copy in one e-mail contradicts the
 * behaviour of another.
 *
 * The value is also user-visible — every code e-mail says "expires in 15
 * minutes" — so the number and the sentence must not drift apart.
 */

/** How long a code stays valid. Quoted verbatim in the code e-mails. */
export const VERIFICATION_CODE_TTL_MINUTES = 15;

/** How long before the same address may ask for another code. */
export const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

const MS_PER_MINUTE = 60_000;

/** The expiry instant for a code minted now (or at `from`, in tests). */
export function verificationCodeExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + VERIFICATION_CODE_TTL_MINUTES * MS_PER_MINUTE);
}
