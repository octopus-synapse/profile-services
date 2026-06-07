/**
 * AST → HTML Renderer
 *
 * Renders a `ResumeAst` into a self-contained HTML document that mirrors,
 * as faithfully as possible, the **default** Typst template
 * (`infrastructure/typst/templates/resume.typ` + partials). The goal is a
 * realtime, zero-cost "PDF simulator": same content extraction, same field
 * priority lists, same date formatting, same hardcoded ATS visual design.
 *
 * Fidelity contract (kept 1:1 with the Typst partials):
 *   - Page A4 210×297mm, margins 10/10/16/16mm, white.
 *   - Base text Inter 8.5pt #1a1a1a, justified.
 *   - Header: centered name (22pt bold), job title (9.5pt), contact line
 *     (email · phone · linkedin · github — NOT location/website), 0.8pt rule.
 *   - Sections sorted by `order`, single linear column.
 *   - Section header: 3pt ink bar + uppercased 10pt bold title + 0.4pt rule.
 *   - Skills/languages → inline "name (level)" list joined by " · ".
 *   - Entries → title↔date row, subtitle · employmentType · link, bullet
 *     description, "Tecnologias:" line.
 *
 * Units are kept in pt/mm so a 210mm-wide page with pt fonts is
 * dimensionally identical to the Typst PDF. Fonts resolve via the same
 * CSS stack the AST carries; Inter is pulled from Google Fonts so the
 * sans matches the Typst `Inter` face. All user text is HTML-escaped.
 *
 * NOTE: only the `default` template is mirrored today. `template=ats`
 * (Libertinus Serif, different spacing) is a TODO — the preview defaults
 * to `default`, which is also what the PDF endpoint uses unless a caller
 * explicitly passes `template=ats`.
 */

import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';

export interface AstHtmlRenderOptions {
  /** Reserved for ATS-template parity; only `default` is mirrored today. */
  readonly template?: 'default' | 'ats';
}

type Content = Record<string, unknown>;

// ─── Field extraction (mirrors item-fields.typ priority lists) ──────────
const TITLE_KEYS = ['role', 'position', 'degree', 'name', 'title'];
const SUBTITLE_KEYS = ['company', 'institution', 'organization', 'issuer'];
// The ATS template's item-fields.typ omits `issuer` from subtitle keys.
const SUBTITLE_KEYS_ATS = ['company', 'institution', 'organization'];
const DESCRIPTION_KEYS = ['description', 'summary', 'details'];
const ITEM_NAME_KEYS = ['name', 'skill', 'language'];
const LEVEL_KEYS = ['level', 'proficiency'];
const URL_KEYS = ['url', 'proofUrl', 'link', 'website', 'repositoryUrl'];

const MONTHS_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function extractField(content: Content, keys: string[]): string | undefined {
  for (const key of keys) {
    const val = content[key];
    if (typeof val === 'string' && val.trim() !== '') return val;
  }
  return undefined;
}

/** Mirrors `format-date`: pass-through when ≤10 chars, else ISO → "Mon YYYY". */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const s = String(dateStr);
  if (s.length <= 10) return s;
  const datePart = s.split('T')[0] ?? s;
  const parts = datePart.split('-');
  if (parts.length >= 2) {
    const year = parts[0];
    const monthIdx = Number.parseInt(parts[1] ?? '', 10) - 1;
    if (year && monthIdx >= 0 && monthIdx < 12) return `${MONTHS_PT[monthIdx]} ${year}`;
  }
  return s;
}

/** Mirrors `build-date-range`. Default joins with an en-dash; the ATS
 *  template uses a plain hyphen, so the separator is parameterized. */
function buildDateRange(content: Content, sep = ' – '): string {
  const start = content.startDate;
  const end = content.endDate;
  const isCurrent = content.isCurrent === true;

  const startStr = start != null ? formatDate(String(start)) : '';
  let endStr: string;
  if (isCurrent) endStr = 'Presente';
  else if (end != null) endStr = formatDate(String(end));
  else if (startStr !== '') endStr = 'Presente';
  else endStr = '';

  if (startStr !== '' && endStr !== '') return `${startStr}${sep}${endStr}`;
  if (startStr !== '') return startStr;
  if (endStr !== '') return endStr;
  return '';
}

/** Mirrors `extract-single-date`. */
function extractSingleDate(content: Content): string {
  const d = extractField(content, ['issueDate', 'date']);
  return d ? formatDate(d) : '';
}

function translateLevel(level: string): string {
  switch (level) {
    case 'BASIC':
      return 'Básico';
    case 'INTERMEDIATE':
      return 'Intermediário';
    case 'FLUENT':
      return 'Avançado (C1)';
    case 'NATIVE':
      return 'Nativo';
    default:
      return level;
  }
}

function translateEmploymentType(et: string): string {
  switch (et) {
    case 'Full-time':
      return 'Tempo integral';
    case 'Part-time':
      return 'Meio período';
    case 'Contract':
      return 'Contrato';
    case 'Internship':
      return 'Estágio';
    case 'Freelance':
      return 'Voluntário';
    default:
      return et;
  }
}

// ─── HTML safety ────────────────────────────────────────────────────────
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//i, '');
}

/** Only allow http(s) links; prefix bare hosts with https:// like a browser. */
function safeHref(url: string): string {
  const t = url.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export class AstHtmlRendererService {
  render(ast: ResumeAst, options: AstHtmlRenderOptions = {}): string {
    const ats = options.template === 'ats';
    const body = ats
      ? [this.renderHeaderAts(ast), this.renderSectionsAts(ast)].filter(Boolean).join('\n')
      : [this.renderHeader(ast), this.renderSections(ast)].filter(Boolean).join('\n');
    const head = ats ? ATS_HEAD : DEFAULT_HEAD;
    const pageClass = ats ? 'page page-ats' : 'page';
    return `<!doctype html>
<html lang="pt-BR">
<head>
${head}
</head>
<body>
<div class="fit">
<div class="${pageClass}">
${body}
</div>
</div>
${FIT_SCRIPT}
</body>
</html>`;
  }

  private renderHeader(ast: ResumeAst): string {
    const header = ast.header;
    if (!header) return '';

    const parts: string[] = [];
    if (header.fullName) {
      parts.push(`<div class="name">${esc(header.fullName)}</div>`);
    }
    if (header.jobTitle) {
      parts.push(`<div class="job-title">${esc(header.jobTitle)}</div>`);
    }

    // Contact order mirrors resume.typ: email, phone, linkedin, github.
    const contact: string[] = [];
    if (header.email) contact.push(esc(header.email));
    if (header.phone) contact.push(esc(header.phone));
    if (header.linkedin) contact.push(esc(stripScheme(header.linkedin)));
    if (header.github) contact.push(esc(stripScheme(header.github)));
    if (contact.length > 0) {
      parts.push(`<div class="contact">${contact.join('<span class="sep">·</span>')}</div>`);
    }

    if (parts.length === 0) return '';
    parts.push('<hr class="header-rule">');
    return `<header class="header">${parts.join('\n')}</header>`;
  }

  private renderSections(ast: ResumeAst): string {
    return [...ast.sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => this.renderSection(section))
      .filter(Boolean)
      .join('\n');
  }

  private renderSection(section: ResumeAst['sections'][number]): string {
    const data = section.data;
    if ('items' in data) return this.renderItemSection(data.title, data.items);
    if ('content' in data && typeof data.content === 'string') {
      return this.renderTextSection(data.title, data.content);
    }
    return '';
  }

  private renderItemSection(
    title: string,
    items: ReadonlyArray<{ id: string; content: Content }>,
  ): string {
    if (items.length === 0) return '';

    const firstContent = items[0]?.content ?? {};
    const hasSubtitle = extractField(firstContent, SUBTITLE_KEYS) !== undefined;
    const hasDescription = extractField(firstContent, DESCRIPTION_KEYS) !== undefined;
    const isSimpleList = !hasSubtitle && !hasDescription;

    const body = isSimpleList
      ? this.renderSimpleList(items)
      : items.map((item) => this.renderEntry(item.content)).join('\n');

    if (!body.trim()) return '';
    return `<section class="block">${this.sectionHeader(title)}${body}</section>`;
  }

  private renderTextSection(title: string, content: string): string {
    if (content.trim() === '') return '';
    return `<section class="block">${this.sectionHeader(title)}<p class="text-section">${esc(content)}</p></section>`;
  }

  private sectionHeader(title: string): string {
    return `<div class="section-header"><span class="section-bar"></span><span class="section-title">${esc(
      title.toUpperCase(),
    )}</span></div>`;
  }

  private renderSimpleList(items: ReadonlyArray<{ content: Content }>): string {
    const entries: string[] = [];
    for (const item of items) {
      const name = extractField(item.content, ITEM_NAME_KEYS);
      if (!name) continue;
      const level = extractField(item.content, LEVEL_KEYS);
      entries.push(level ? `${esc(name)} (${esc(translateLevel(level))})` : esc(name));
    }
    if (entries.length === 0) return '';
    return `<p class="simple-list">${entries.join('<span class="sep-soft">·</span>')}</p>`;
  }

  private renderEntry(content: Content): string {
    const rawTitle = extractField(content, TITLE_KEYS);
    const field = content.field;
    const title =
      rawTitle && typeof field === 'string' && field.trim() !== ''
        ? `${rawTitle} em ${field}`
        : rawTitle;

    const subtitle = extractField(content, SUBTITLE_KEYS);
    const description = extractField(content, DESCRIPTION_KEYS);
    const dateRange = buildDateRange(content);
    const dateDisplay = dateRange !== '' ? dateRange : extractSingleDate(content);
    const employmentType = content.employmentType;
    const itemUrl = extractField(content, URL_KEYS);

    const rows: string[] = [];

    if (title) {
      const dateHtml =
        dateDisplay !== '' ? `<span class="entry-date">${esc(dateDisplay)}</span>` : '';
      rows.push(
        `<div class="entry-head"><span class="entry-title">${esc(title)}</span>${dateHtml}</div>`,
      );
    }

    if (subtitle) {
      const etStr =
        typeof employmentType === 'string' && employmentType.trim() !== ''
          ? ` · ${esc(translateEmploymentType(employmentType))}`
          : '';
      const linkHtml = itemUrl
        ? ` <span class="entry-sep">·</span> <a class="entry-link" href="${esc(
            safeHref(itemUrl),
          )}" target="_blank" rel="noopener noreferrer">Ver credencial ↗</a>`
        : '';
      rows.push(`<div class="entry-sub">${esc(subtitle)}${etStr}${linkHtml}</div>`);
    }

    if (description) {
      const lines = String(description)
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== '')
        .map((l) => (l.startsWith('- ') || l.startsWith('• ') ? l.slice(2) : l));
      if (lines.length > 0) {
        rows.push(`<ul class="bullets">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`);
      }
    }

    const achievements = content.achievements;
    const technologies = content.technologies;
    const techs = Array.isArray(achievements)
      ? achievements
      : Array.isArray(technologies)
        ? technologies
        : undefined;
    if (techs && techs.length > 0) {
      const list = techs
        .filter((t): t is string => typeof t === 'string')
        .map(esc)
        .join(', ');
      if (list) rows.push(`<div class="techs"><b>Tecnologias:</b> ${list}</div>`);
    }

    return `<div class="entry">${rows.join('\n')}</div>`;
  }

  // ─── ATS template (Libertinus Serif, line-free, ATS-safe) ─────────────
  // Mirrors templates-ats/: serif font, no bars/rules, inline "title | date",
  // skills comma-joined with raw level, location in the subtitle, plain
  // "- " bullet lines, achievements-only tech line, hyphen date separator.

  private renderHeaderAts(ast: ResumeAst): string {
    const header = ast.header;
    if (!header) return '';
    const parts: string[] = [];
    if (header.fullName) parts.push(`<div class="name-ats">${esc(header.fullName)}</div>`);
    if (header.jobTitle) parts.push(`<div class="job-ats">${esc(header.jobTitle)}</div>`);

    // ATS contact also carries website + location, joined by " | ".
    const contact: string[] = [];
    if (header.email) contact.push(esc(header.email));
    if (header.phone) contact.push(esc(header.phone));
    if (header.linkedin) contact.push(esc(stripScheme(header.linkedin)));
    if (header.github) contact.push(esc(stripScheme(header.github)));
    if (header.website) contact.push(esc(stripScheme(header.website)));
    if (header.location) contact.push(esc(header.location));
    if (contact.length > 0) parts.push(`<div class="contact-ats">${contact.join(' | ')}</div>`);

    if (parts.length === 0) return '';
    parts.push('<hr class="rule-ats">');
    return `<header class="header-ats">${parts.join('\n')}</header>`;
  }

  private renderSectionsAts(ast: ResumeAst): string {
    return [...ast.sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => this.renderSectionAts(section))
      .filter(Boolean)
      .join('\n');
  }

  private renderSectionAts(section: ResumeAst['sections'][number]): string {
    const data = section.data;
    if ('items' in data) return this.renderItemSectionAts(data.title, data.items);
    if ('content' in data && typeof data.content === 'string') {
      return this.renderTextSectionAts(data.title, data.content);
    }
    return '';
  }

  private renderItemSectionAts(
    title: string,
    items: ReadonlyArray<{ id: string; content: Content }>,
  ): string {
    if (items.length === 0) return '';
    const first = items[0]?.content ?? {};
    const hasSubtitle = extractField(first, SUBTITLE_KEYS_ATS) !== undefined;
    const hasDescription = extractField(first, DESCRIPTION_KEYS) !== undefined;
    const isSimpleList = !hasSubtitle && !hasDescription;
    const body = isSimpleList
      ? this.renderSimpleListAts(items)
      : items.map((item) => this.renderEntryAts(item.content)).join('\n');
    if (!body.trim()) return '';
    return `<section class="block-ats">${this.sectionHeaderAts(title)}${body}</section>`;
  }

  private renderTextSectionAts(title: string, content: string): string {
    if (content.trim() === '') return '';
    return `<section class="block-ats">${this.sectionHeaderAts(title)}<p class="text-ats">${esc(
      content,
    )}</p></section>`;
  }

  private sectionHeaderAts(title: string): string {
    return `<div class="sh-ats">${esc(title.toUpperCase())}</div>`;
  }

  private renderSimpleListAts(items: ReadonlyArray<{ content: Content }>): string {
    const entries: string[] = [];
    for (const item of items) {
      const name = extractField(item.content, ITEM_NAME_KEYS);
      if (!name) continue;
      const level = extractField(item.content, LEVEL_KEYS); // ATS uses the raw level
      entries.push(level ? `${esc(name)} (${esc(level)})` : esc(name));
    }
    if (entries.length === 0) return '';
    return `<p class="simple-ats">${entries.join(', ')}</p>`;
  }

  private renderEntryAts(content: Content): string {
    const title = extractField(content, TITLE_KEYS);
    const subtitle = extractField(content, SUBTITLE_KEYS_ATS);
    const description = extractField(content, DESCRIPTION_KEYS);
    const dateRange = buildDateRange(content, ' - '); // hyphen; no single-date fallback
    const employmentType = content.employmentType;
    const location = typeof content.location === 'string' ? content.location.trim() : '';

    const lines: string[] = [];

    if (title) {
      const dateHtml = dateRange !== '' ? `<span class="date-ats"> | ${esc(dateRange)}</span>` : '';
      lines.push(
        `<div class="line-ats"><span class="title-ats">${esc(title)}</span>${dateHtml}</div>`,
      );
    }

    if (subtitle) {
      const etStr =
        typeof employmentType === 'string' && employmentType.trim() !== ''
          ? ` · ${esc(translateEmploymentType(employmentType))}`
          : '';
      const loc = location !== '' ? `, ${esc(location)}` : '';
      lines.push(`<div class="sub-ats">${esc(subtitle)}${etStr}${loc}</div>`);
    }

    if (description) {
      for (const raw of String(description).split('\n')) {
        const c = raw.trim();
        if (c === '') continue;
        const clean = c.startsWith('- ') ? c.slice(2) : c;
        lines.push(`<div class="bullet-ats">- ${esc(clean)}</div>`);
      }
    }

    const achievements = content.achievements; // ATS uses achievements only
    if (Array.isArray(achievements) && achievements.length > 0) {
      const list = achievements
        .filter((t): t is string => typeof t === 'string')
        .map(esc)
        .join(', ');
      if (list) lines.push(`<div class="techs-ats"><b>Tecnologias:</b> ${list}</div>`);
    }

    return `<div class="entry-ats">${lines.join('\n')}</div>`;
  }
}

// ─── Stylesheet (the hardcoded ATS look from the default template) ──────
const STYLE = `
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#e5e7eb;}
body{background:#e5e7eb;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden;}
.fit{width:100%;overflow-x:hidden;}
.page{
  width:210mm;min-height:297mm;margin:0 auto;padding:10mm 16mm;
  background:#fff;color:#1a1a1a;
  font-family:"Inter","Libertinus Serif",system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  font-size:8.5pt;line-height:1.45;text-align:justify;
  box-shadow:0 1px 6px rgba(0,0,0,.18);
}
.header{margin-bottom:2pt;}
.name{text-align:center;font-size:22pt;font-weight:700;color:#0f0f0f;letter-spacing:.6pt;line-height:1.1;}
.job-title{text-align:center;font-size:9.5pt;color:#555;letter-spacing:.2pt;margin-top:1.5pt;}
.contact{text-align:center;font-size:8pt;color:#555;margin-top:4pt;}
.contact .sep{color:#ccc;padding:0 .28em;}
.header-rule{border:none;border-top:.8pt solid #1a1a1a;margin:5pt 0 2pt;}
.block{margin-top:24pt;}
.block:first-of-type{margin-top:12pt;}
.section-header{display:flex;align-items:center;gap:7pt;margin-bottom:6pt;border-bottom:.4pt solid #ddd;padding-bottom:2pt;}
.section-bar{display:inline-block;width:3pt;height:12pt;background:#1a1a1a;border-radius:1pt;flex:0 0 auto;}
.section-title{font-size:10pt;font-weight:700;color:#0f0f0f;letter-spacing:.5pt;text-transform:uppercase;}
.text-section{margin:0;font-size:8.5pt;color:#2a2a2a;}
.simple-list{margin:0;font-size:9pt;color:#222;}
.simple-list .sep-soft{color:#bbb;padding:0 .28em;}
.entry{margin-bottom:14pt;}
.entry-head{display:flex;justify-content:space-between;align-items:baseline;gap:10pt;text-align:left;}
.entry-title{font-size:9.5pt;font-weight:600;color:#111;}
.entry-date{font-size:8.5pt;color:#666;white-space:nowrap;flex:0 0 auto;text-align:right;}
.entry-sub{font-size:8.5pt;font-weight:500;color:#444;margin-top:.5pt;text-align:left;}
.entry-sub .entry-sep{color:#444;}
.entry-link{color:#2563eb;font-weight:500;text-decoration:none;}
.bullets{margin:1.5pt 0 0;padding:0;list-style:none;}
.bullets li{position:relative;padding-left:10pt;margin-bottom:4pt;font-size:8.5pt;color:#222;}
.bullets li::before{content:"--";position:absolute;left:0;color:#222;}
.techs{margin-top:1pt;font-size:7.5pt;color:#777;text-align:left;}
.techs b{font-weight:600;}
@media print{body{background:#fff;}.page{box-shadow:none;margin:0;}}
`;

// ─── ATS stylesheet (mirrors templates-ats/: serif, no rules/bars) ──────
const ATS_STYLE = `
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#e5e7eb;}
body{background:#e5e7eb;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden;}
.fit{width:100%;overflow-x:hidden;}
.page-ats{
  width:210mm;min-height:297mm;margin:0 auto;padding:10mm 12mm;
  background:#fff;color:#000;
  font-family:"Libertinus Serif",Georgia,"Times New Roman",serif;
  font-size:10pt;line-height:1.35;text-align:left;
  box-shadow:0 1px 6px rgba(0,0,0,.18);
}
.header-ats{margin-bottom:2pt;}
.name-ats{text-align:center;font-size:18pt;font-weight:700;color:#000;line-height:1.1;}
.job-ats{text-align:center;font-size:11pt;color:#3c3c3c;margin-top:1pt;}
.contact-ats{text-align:center;font-size:9pt;color:#505050;margin-top:2pt;}
.rule-ats{border:none;border-top:.4pt solid #000;margin:2pt 0 0;}
.block-ats{margin-top:6pt;}
.block-ats:first-of-type{margin-top:4pt;}
.sh-ats{font-size:10.5pt;font-weight:700;color:#000;text-transform:uppercase;margin-bottom:1.5pt;}
.text-ats{margin:0 0 8pt;font-size:10pt;color:#000;}
.simple-ats{margin:0;font-size:10pt;color:#000;}
.entry-ats{margin-bottom:2pt;}
.entry-ats + .entry-ats{margin-top:2pt;}
.title-ats{font-size:11pt;font-weight:700;color:#000;}
.date-ats{font-size:10pt;color:#505050;}
.sub-ats{font-size:10pt;color:#3c3c3c;}
.bullet-ats{font-size:10pt;color:#000;}
.techs-ats{margin-top:2pt;font-size:9pt;color:#3c3c3c;}
.techs-ats b{font-weight:700;}
@media print{body{background:#fff;}.page-ats{box-shadow:none;margin:0;}}
`;

const DEFAULT_HEAD = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${STYLE}</style>`;

const ATS_HEAD = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>${ATS_STYLE}</style>`;

// Fit-to-width: the page is a fixed 794px (210mm @96dpi) A4 sheet. Rather than
// rely on viewport-meta quirks (which differ across iframe vs WebView), scale
// the sheet to the available width with a transform — preserving the A4 ratio,
// never upscaling past 100%. Re-runs on resize/orientation/font load.
const FIT_SCRIPT = `<script>
(function(){
  var A4=794;
  function fit(){
    var page=document.querySelector('.page');
    if(!page){return;}
    var w=document.documentElement.clientWidth||window.innerWidth||A4;
    var s=Math.min(1,w/A4);
    var box=page.parentElement;
    if(s<1){
      page.style.transformOrigin='top left';
      page.style.transform='scale('+s+')';
      if(box){box.style.height=(page.offsetHeight*s)+'px';}
    }else{
      page.style.transform='none';
      if(box){box.style.height='';}
    }
  }
  window.addEventListener('resize',fit);
  window.addEventListener('orientationchange',fit);
  window.addEventListener('load',fit);
  if(document.readyState!=='loading'){fit();}else{window.addEventListener('DOMContentLoaded',fit);}
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(fit);}
  setTimeout(fit,250);
})();
</script>`;
