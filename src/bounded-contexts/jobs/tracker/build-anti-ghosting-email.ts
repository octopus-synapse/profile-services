export interface AntiGhostingEmailInput {
  userName: string | null;
  jobTitle: string;
  company: string;
  daysSilent: number;
}

export interface AntiGhostingEmailOutput {
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

function templateForThreshold(days: number): { opener: string; nudge: string } {
  if (days >= 21) {
    return {
      opener: 'Three weeks in silence usually means the application is dead.',
      nudge: 'One last short, polite note can surface a yes/no. After that, move on.',
    };
  }
  if (days >= 14) {
    return {
      opener: 'Two weeks without a reply is where most candidates quietly give up.',
      nudge: 'A single follow-up now beats the silence — reuse the template below.',
    };
  }
  return {
    opener: "It's been a week since you applied and the channel has been quiet.",
    nudge: 'A short follow-up at day 7 doubles your reply odds on most tracker data.',
  };
}

export function buildAntiGhostingEmail(input: AntiGhostingEmailInput): AntiGhostingEmailOutput {
  const greeting = input.userName?.trim() || 'there';
  const { opener, nudge } = templateForThreshold(input.daysSilent);
  const safeGreeting = escapeHtml(greeting);
  const safeJob = escapeHtml(input.jobTitle);
  const safeCompany = escapeHtml(input.company);

  const subject = `Still waiting on ${input.company} — ${input.daysSilent} days since your application`;

  const text = [
    `Hi ${greeting},`,
    '',
    opener,
    `Role: ${input.jobTitle} at ${input.company}`,
    `Days since last activity: ${input.daysSilent}`,
    '',
    nudge,
    '',
    'Quick template you can paste:',
    '',
    `"Hi — just a short note to reiterate my interest in the ${input.jobTitle} role at ${input.company}. Happy to provide any additional material. Looking forward to hearing back."`,
    '',
    'Good luck,',
    'Patch Careers',
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${safeGreeting},</p>
  <p>${escapeHtml(opener)}</p>
  <p><strong>${safeJob}</strong> at <strong>${safeCompany}</strong> — ${input.daysSilent} days silent.</p>
  <p>${escapeHtml(nudge)}</p>
  <blockquote style="border-left:3px solid #CBD5F5;padding:8px 16px;color:#374151;">
    Hi — just a short note to reiterate my interest in the <strong>${safeJob}</strong> role at <strong>${safeCompany}</strong>. Happy to provide any additional material. Looking forward to hearing back.
  </blockquote>
  <p style="color:#6B7280;">Patch Careers</p>
</body></html>`;

  return { subject, html, text };
}
