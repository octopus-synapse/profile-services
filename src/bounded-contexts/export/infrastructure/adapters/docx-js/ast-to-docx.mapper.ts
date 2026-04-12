/**
 * AST-to-DOCX Mapper
 *
 * Pure functions that transform a Resume AST JSON into docx library structures.
 * No side effects, no dependencies — only data transformation.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

interface AstHeader {
  fullName?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
}

interface AstSectionItem {
  content?: Record<string, unknown>;
}

interface AstSection {
  title?: string;
  order?: number;
  semanticKind?: string;
  data?: {
    items?: AstSectionItem[];
    content?: string;
  };
}

interface ResumeAst {
  header?: AstHeader;
  sections?: AstSection[];
}

// ---------------------------------------------------------------------------
// Header rendering
// ---------------------------------------------------------------------------

function buildHeaderParagraphs(header: AstHeader): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      text: header.fullName ?? 'Unnamed',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
  );

  if (header.jobTitle) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: header.jobTitle, italics: true })],
        spacing: { after: 100 },
      }),
    );
  }

  const contactParts = [header.email, header.phone, header.linkedin, header.github].filter(Boolean);

  if (contactParts.length > 0) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: contactParts.join(' | '), size: 20 })],
        spacing: { after: 200 },
      }),
    );
  }

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Section rendering
// ---------------------------------------------------------------------------

function buildSectionHeading(title: string): Paragraph {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_2,
    border: {
      bottom: { color: 'auto', space: 1, size: 6, style: BorderStyle.SINGLE },
    },
    spacing: { before: 300, after: 200 },
  });
}

function extractString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function formatDate(value: unknown): string {
  if (!value) return '';
  if (typeof value !== 'string') return String(value);

  try {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
  } catch {
    // not a valid date — return as-is
  }
  return value;
}

function buildItemParagraphs(content: Record<string, unknown>): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  const title = extractString(content.title || content.name || content.role);
  const org = extractString(
    content.organization || content.company || content.institution || content.school,
  );
  const startDate = formatDate(content.startDate);
  const endDate = content.endDate ? formatDate(content.endDate) : 'Present';
  const description = extractString(content.description);
  const technologies = content.technologies;

  const titleRuns: TextRun[] = [];
  if (title) {
    titleRuns.push(new TextRun({ text: title, bold: true }));
  }
  if (org) {
    titleRuns.push(new TextRun({ text: title ? ` at ${org}` : org, bold: true }));
  }
  if (titleRuns.length > 0) {
    paragraphs.push(new Paragraph({ children: titleRuns, spacing: { after: 50 } }));
  }

  if (startDate) {
    const dateText = `${startDate} - ${endDate}`;
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: dateText, italics: true, color: '595959' })],
        spacing: { after: 100 },
      }),
    );
  }

  if (description) {
    paragraphs.push(
      new Paragraph({
        text: description,
        bullet: { level: 0 },
        indent: { left: 720 },
        spacing: { after: 200 },
      }),
    );
  }

  if (Array.isArray(technologies)) {
    for (const tech of technologies) {
      if (tech) {
        paragraphs.push(
          new Paragraph({
            text: String(tech),
            bullet: { level: 1 },
            indent: { left: 1080 },
            spacing: { after: 100 },
          }),
        );
      }
    }
  }

  return paragraphs;
}

function buildSkillsSectionParagraphs(items: AstSectionItem[]): Paragraph[] {
  const names = items
    .map((item) => extractString(item.content?.name || item.content?.skill))
    .filter(Boolean);

  if (names.length === 0) return [];

  return [
    new Paragraph({
      text: names.join(', '),
      spacing: { after: 200 },
    }),
  ];
}

function buildTextSectionParagraphs(content: string): Paragraph[] {
  if (!content) return [];
  return [new Paragraph({ text: content, spacing: { after: 200 } })];
}

function buildSectionParagraphs(section: AstSection): Paragraph[] {
  const data = section.data;
  if (!data) return [];

  const paragraphs: Paragraph[] = [];

  const isSkills = section.semanticKind === 'skills';

  if (Array.isArray(data.items) && data.items.length > 0) {
    if (isSkills) {
      paragraphs.push(...buildSkillsSectionParagraphs(data.items));
    } else {
      for (const item of data.items) {
        if (item.content && typeof item.content === 'object') {
          paragraphs.push(...buildItemParagraphs(item.content));
        }
      }
    }
  }

  if (typeof data.content === 'string') {
    paragraphs.push(...buildTextSectionParagraphs(data.content));
  }

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function mapAstToDocxDocument(astJson: string): Document {
  const ast: ResumeAst = JSON.parse(astJson);
  const children: Paragraph[] = [];

  if (ast.header) {
    children.push(...buildHeaderParagraphs(ast.header));
  }

  const sections = (ast.sections ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const section of sections) {
    const sectionParagraphs = buildSectionParagraphs(section);
    if (sectionParagraphs.length === 0) continue;

    if (section.title) {
      children.push(buildSectionHeading(section.title));
    }
    children.push(...sectionParagraphs);
  }

  return new Document({ sections: [{ children }] });
}

export async function renderDocxBuffer(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}
