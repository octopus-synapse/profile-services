import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';

export interface AntiGhostingEmailInput {
  userName: string | null;
  /** The account's language (decision 5); English when unknown, as before. */
  locale?: Locale;
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

const COPY = {
  en: {
    greeting: (name: string) => `Hi ${name},`,
    fallbackName: 'there',
    subject: (company: string, days: number) =>
      `Still waiting on ${company} — ${days} days since your application`,
    role: (job: string, company: string) => `Role: ${job} at ${company}`,
    roleHtml: (job: string, company: string, days: number) =>
      `<strong>${job}</strong> at <strong>${company}</strong> — ${days} days silent.`,
    days: (n: number) => `Days since last activity: ${n}`,
    template: 'Quick template you can paste:',
    note: (job: string, company: string) =>
      `Hi — just a short note to reiterate my interest in the ${job} role at ${company}. Happy to provide any additional material. Looking forward to hearing back.`,
    noteHtml: (job: string, company: string) =>
      `Hi — just a short note to reiterate my interest in the <strong>${job}</strong> role at <strong>${company}</strong>. Happy to provide any additional material. Looking forward to hearing back.`,
    signoff: 'Good luck,',
    thresholds: {
      21: {
        opener: 'Three weeks in silence usually means the application is dead.',
        nudge: 'One last short, polite note can surface a yes/no. After that, move on.',
      },
      14: {
        opener: 'Two weeks without a reply is where most candidates quietly give up.',
        nudge: 'A single follow-up now beats the silence — reuse the template below.',
      },
      7: {
        opener: "It's been a week since you applied and the channel has been quiet.",
        nudge: 'A short follow-up at day 7 doubles your reply odds on most tracker data.',
      },
    },
  },
  'pt-BR': {
    greeting: (name: string) => `Olá, ${name},`,
    fallbackName: 'tudo bem',
    subject: (company: string, days: number) =>
      `Ainda sem resposta da ${company} — ${days} dias desde a sua candidatura`,
    role: (job: string, company: string) => `Vaga: ${job} na ${company}`,
    roleHtml: (job: string, company: string, days: number) =>
      `<strong>${job}</strong> na <strong>${company}</strong> — ${days} dias em silêncio.`,
    days: (n: number) => `Dias desde a última atividade: ${n}`,
    template: 'Um modelo rápido para colar:',
    note: (job: string, company: string) =>
      `Olá — só uma mensagem curta para reforçar meu interesse na vaga de ${job} na ${company}. Fico à disposição para enviar qualquer material adicional. Aguardo retorno.`,
    noteHtml: (job: string, company: string) =>
      `Olá — só uma mensagem curta para reforçar meu interesse na vaga de <strong>${job}</strong> na <strong>${company}</strong>. Fico à disposição para enviar qualquer material adicional. Aguardo retorno.`,
    signoff: 'Boa sorte,',
    thresholds: {
      21: {
        opener: 'Três semanas de silêncio quase sempre significam que a candidatura morreu.',
        nudge:
          'Uma última mensagem curta e educada pode arrancar um sim ou um não. Depois disso, siga em frente.',
      },
      14: {
        opener: 'Duas semanas sem resposta é onde a maioria dos candidatos desiste em silêncio.',
        nudge: 'Um único follow-up agora vale mais que o silêncio — reaproveite o modelo abaixo.',
      },
      7: {
        opener: 'Faz uma semana que você se candidatou e o canal ficou quieto.',
        nudge:
          'Um follow-up curto no dia 7 dobra a chance de resposta na maioria dos dados de tracker.',
      },
    },
  },
} as const;

function thresholdKey(days: number): 21 | 14 | 7 {
  if (days >= 21) return 21;
  if (days >= 14) return 14;
  return 7;
}

export function buildAntiGhostingEmail(input: AntiGhostingEmailInput): AntiGhostingEmailOutput {
  const copy = COPY[input.locale ?? 'en'];
  const greeting = input.userName?.trim() || copy.fallbackName;
  const { opener, nudge } = copy.thresholds[thresholdKey(input.daysSilent)];
  const safeGreeting = escapeHtml(greeting);
  const safeJob = escapeHtml(input.jobTitle);
  const safeCompany = escapeHtml(input.company);

  const subject = copy.subject(input.company, input.daysSilent);

  const text = [
    copy.greeting(greeting),
    '',
    opener,
    copy.role(input.jobTitle, input.company),
    copy.days(input.daysSilent),
    '',
    nudge,
    '',
    copy.template,
    '',
    `"${copy.note(input.jobTitle, input.company)}"`,
    '',
    copy.signoff,
    'Patch Careers',
  ].join('\n');

  const html = `<!doctype html><html lang="${input.locale ?? 'en'}"><body style="font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
  <p>${copy.greeting(safeGreeting)}</p>
  <p>${escapeHtml(opener)}</p>
  <p>${copy.roleHtml(safeJob, safeCompany, input.daysSilent)}</p>
  <p>${escapeHtml(nudge)}</p>
  <blockquote style="border-left:3px solid #CBD5F5;padding:8px 16px;color:#374151;">
    ${copy.noteHtml(safeJob, safeCompany)}
  </blockquote>
  <p style="color:#6B7280;">Patch Careers</p>
</body></html>`;

  return { subject, html, text };
}
