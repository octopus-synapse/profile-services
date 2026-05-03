/**
 * Pure email-body builder for the weekly digest.
 *
 * Returns null when the week had zero activity worth reporting, so
 * the caller skips sending empty emails instead of annoying users.
 *
 * Stays a POJO function class with a single public method so the
 * architecture rules treat it as a service-like helper while keeping
 * it framework-free.
 */

import type { WeeklyDigestStats } from '../../domain/entities/notification.entity';
import { escapeHtml } from '../shared/format';

export interface WeeklyDigestInput {
  readonly userName: string | null;
  readonly stats: WeeklyDigestStats;
}

export interface WeeklyDigestOutput {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

export class BuildWeeklyDigestService {
  build(input: WeeklyDigestInput): WeeklyDigestOutput | null {
    return buildWeeklyDigest(input);
  }
}

/** Bare function for tests and for callers that don't want to allocate
 *  a service instance. */
export function buildWeeklyDigest(input: WeeklyDigestInput): WeeklyDigestOutput | null {
  const { resumeViews, newFollowers, newEndorsements, profileViews } = input.stats;
  const total = resumeViews + newFollowers + newEndorsements + profileViews;
  if (total === 0) return null;

  const greetingName = input.userName?.trim() || 'there';
  const safeGreeting = escapeHtml(greetingName);

  const lines: string[] = [];
  if (resumeViews > 0) lines.push(pluralize(resumeViews, 'resume view', 'resume views'));
  if (profileViews > 0) lines.push(pluralize(profileViews, 'profile view', 'profile views'));
  if (newFollowers > 0) lines.push(pluralize(newFollowers, 'new follower', 'new followers'));
  if (newEndorsements > 0)
    lines.push(pluralize(newEndorsements, 'new endorsement', 'new endorsements'));

  const textBody = [
    `Hi ${greetingName},`,
    '',
    "Here's what happened on your Patch Careers profile this week:",
    ...lines.map((l) => `• ${l}`),
    '',
    'Keep the momentum going — review your CV, follow interesting people, endorse a peer.',
  ].join('\n');

  const htmlLines = lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  const html = `<!doctype html>
<html>
  <body style="font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; color:#111827; max-width:560px; margin:0 auto; padding:24px;">
    <p>Hi ${safeGreeting},</p>
    <p>Here's what happened on your Patch Careers profile this week:</p>
    <ul>${htmlLines}</ul>
    <p style="color:#6B7280;">Keep the momentum going — review your CV, follow interesting people, endorse a peer.</p>
  </body>
</html>`;

  return { subject: `[Patch Careers] Your weekly activity`, html, text: textBody };
}
