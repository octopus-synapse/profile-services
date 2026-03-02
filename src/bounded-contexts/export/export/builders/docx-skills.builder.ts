/**
 * DOCX Skills and Languages Builder
 * Builds skills and languages paragraphs for DOCX export
 */

import { Paragraph, TextRun } from 'docx';
import { DocxLanguage, DocxSkill } from '../services/docx.types';

export class DocxSkillsBuilder {
  createSkillsParagraph(skills: DocxSkill[]): Paragraph {
    return new Paragraph({
      children: skills.map(
        (skill, index) =>
          new TextRun({
            text: `${skill.name}${index < skills.length - 1 ? ' • ' : ''}`,
          }),
      ),
      spacing: { after: 200 },
    });
  }

  createLanguagesParagraph(languages: DocxLanguage[]): Paragraph {
    return new Paragraph({
      children: languages.map(
        (lang, index) =>
          new TextRun({
            text: `${lang.name} (${lang.level})${index < languages.length - 1 ? ' | ' : ''}`,
          }),
      ),
      spacing: { after: 200 },
    });
  }
}
