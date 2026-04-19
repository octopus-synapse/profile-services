export interface WeeklyDigestStats {
  resumeViews: number;
  newFollowers: number;
  newEndorsements: number;
  profileViews: number;
}

export interface WeeklyDigestInput {
  userName: string | null;
  stats: WeeklyDigestStats;
}

export interface WeeklyDigestOutput {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

/**
 * Builds a weekly digest email for a single user. Returns null when the
 * week had zero activity worth reporting, so the caller skips sending
 * empty emails instead of annoying users.
 */
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

  return {
    subject: `[Patch Careers] Your weekly activity`,
    html,
    text: textBody,
  };
}
