/**
 * Outbound port for sending anti-ghosting reminder emails.
 *
 * The pure email body is built by `buildAntiGhostingEmail` in the
 * application layer; this port abstracts only the *transport* — the
 * adapter wraps whatever provider the platform uses (currently
 * `EmailService` over SMTP). Adapters MUST swallow transport failures
 * and surface them via the logger; the sweep continues with the
 * remaining candidates.
 */

export interface AntiGhostingEmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export abstract class AntiGhostingEmailerPort {
  abstract send(message: AntiGhostingEmailMessage): Promise<void>;
}
