import { describe, expect, test } from 'bun:test';
import type {
  PlacedSection,
  ResolvedBoxStyle,
  ResolvedTypography,
  ResumeAst,
} from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
import { AstHtmlRendererService } from './ast-html-renderer.service';

const renderer = new AstHtmlRendererService();

const typo: ResolvedTypography = {
  fontFamily: 'Inter, sans-serif',
  fontSizePx: 11,
  lineHeight: 1.4,
  fontWeight: 600,
  textTransform: 'none',
  textDecoration: 'none',
};
const box: ResolvedBoxStyle = {
  backgroundColor: '#fff',
  borderColor: '#ccc',
  borderWidthPx: 0,
  borderRadiusPx: 0,
  paddingPx: 0,
  marginBottomPx: 0,
};
const styles = { container: box, title: typo, content: typo };

function itemSection(
  sectionId: string,
  title: string,
  items: Array<{ id: string; content: Record<string, unknown> }>,
  order = 0,
): PlacedSection {
  return {
    sectionId,
    columnId: 'main',
    order,
    data: { semanticKind: sectionId.toUpperCase(), sectionTypeKey: sectionId, title, items },
    styles,
  };
}

function textSection(sectionId: string, title: string, content: string, order = 0): PlacedSection {
  return {
    sectionId,
    columnId: 'main',
    order,
    data: { semanticKind: sectionId.toUpperCase(), sectionTypeKey: sectionId, title, content },
    styles,
  };
}

function ast(partial: Partial<ResumeAst>): ResumeAst {
  return {
    meta: { version: '1.0.0', generatedAt: '2026-01-01T00:00:00.000Z' },
    page: {
      widthMm: 210,
      heightMm: 297,
      marginTopMm: 10,
      marginBottomMm: 10,
      marginLeftMm: 16,
      marginRightMm: 16,
      columns: [{ id: 'main', widthPercentage: 100, order: 0 }],
      columnGapMm: 0,
    },
    sections: [],
    globalStyles: {
      background: '#fff',
      textPrimary: '#1a1a1a',
      textSecondary: '#555',
      accent: '#1a1a1a',
    },
    ...partial,
  };
}

describe('AstHtmlRendererService — header', () => {
  test('renders name, job title and contact in Typst order (email, phone, linkedin, github)', () => {
    const html = renderer.render(
      ast({
        header: {
          fullName: 'Ada Lovelace',
          jobTitle: 'Engenheira de Software',
          phone: '+55 11 99999-0000',
          email: 'ada@example.com',
          location: 'São Paulo',
          linkedin: 'https://linkedin.com/in/ada',
          github: 'http://github.com/ada',
          website: 'https://ada.dev',
        },
      }),
    );

    expect(html).toContain('Ada Lovelace');
    expect(html).toContain('Engenheira de Software');
    // schemes stripped
    expect(html).toContain('linkedin.com/in/ada');
    expect(html).toContain('github.com/ada');
    expect(html).not.toContain('https://linkedin.com/in/ada');
    // location & website are NOT in the default-template contact line
    expect(html).not.toContain('São Paulo');
    expect(html).not.toContain('ada.dev');
    // email before phone before linkedin before github
    const iEmail = html.indexOf('ada@example.com');
    const iPhone = html.indexOf('+55 11');
    const iLinked = html.indexOf('linkedin.com/in/ada');
    const iGit = html.indexOf('github.com/ada');
    expect(iEmail).toBeLessThan(iPhone);
    expect(iPhone).toBeLessThan(iLinked);
    expect(iLinked).toBeLessThan(iGit);
  });
});

describe('AstHtmlRendererService — entries', () => {
  test('work experience: title, subtitle + translated employment type, date range, bullets, techs', () => {
    const html = renderer.render(
      ast({
        sections: [
          itemSection('work_experience_v1', 'Experiência', [
            {
              id: 'a',
              content: {
                role: 'Staff Engineer',
                company: 'Patch',
                employmentType: 'Full-time',
                startDate: '2022-03-01T00:00:00.000Z',
                endDate: null,
                isCurrent: true,
                description: '- Liderou squad\n- Reduziu custo',
                technologies: ['TypeScript', 'Bun'],
              },
            },
          ]),
        ],
      }),
    );

    expect(html).toContain('Staff Engineer');
    expect(html).toContain('Patch · Tempo integral'); // translated Full-time
    expect(html).toContain('Mar 2022 – Presente'); // long ISO formatted + current
    expect(html).toContain('<li>Liderou squad</li>'); // bullet "- " stripped
    expect(html).toContain('<li>Reduziu custo</li>');
    expect(html).toContain('Tecnologias:');
    expect(html).toContain('TypeScript, Bun');
  });

  test('education: "degree em field" composition', () => {
    const html = renderer.render(
      ast({
        sections: [
          itemSection('education_v1', 'Formação', [
            {
              id: 'e',
              content: { degree: 'Bacharelado', field: 'Computação', institution: 'USP' },
            },
          ]),
        ],
      }),
    );
    expect(html).toContain('Bacharelado em Computação');
    expect(html).toContain('USP');
  });

  test('achievements render as bullets, NOT under a "Tecnologias:" label', () => {
    const html = renderer.render(
      ast({
        sections: [
          itemSection('work_experience_v1', 'Experiência', [
            {
              id: 'a',
              content: {
                role: 'Engenheira de Software Plena',
                company: 'Patch Tech',
                description: 'Liderei a migração do app.',
                achievements: ['Reduzi o tempo de build em 40%', 'Migrei 30 telas'],
              },
            },
          ]),
        ],
      }),
    );
    // accomplishments become bullet points...
    expect(html).toContain('<li>Reduzi o tempo de build em 40%</li>');
    expect(html).toContain('<li>Migrei 30 telas</li>');
    expect(html).toContain('<li>Liderei a migração do app.</li>');
    // ...and are NOT mislabeled as technologies
    expect(html).not.toContain('Tecnologias:');
  });

  test('education degree already containing the field is not duplicated ("X em X")', () => {
    const html = renderer.render(
      ast({
        sections: [
          itemSection('education_v1', 'Formação', [
            {
              id: 'e',
              content: {
                degree: 'Bacharelado em Ciência da Computação',
                field: 'Ciência da Computação',
                institution: 'USP',
              },
            },
          ]),
        ],
      }),
    );
    expect(html).toContain('Bacharelado em Ciência da Computação');
    expect(html).not.toContain('Computação em Ciência da Computação');
  });

  test('short YYYY-MM-01 dates pass through unchanged (mirrors Typst len<=10 rule)', () => {
    const html = renderer.render(
      ast({
        sections: [
          itemSection('work_experience_v1', 'Exp', [
            {
              id: 'a',
              content: {
                role: 'Dev',
                company: 'X',
                description: 'algo',
                startDate: '2024-01-01',
                endDate: '2024-06-01',
              },
            },
          ]),
        ],
      }),
    );
    expect(html).toContain('2024-01-01 – 2024-06-01');
  });
});

describe('AstHtmlRendererService — simple list & text', () => {
  test('skills render as inline list with translated level', () => {
    const html = renderer.render(
      ast({
        sections: [
          itemSection('language_v1', 'Idiomas', [
            { id: '1', content: { name: 'Inglês', level: 'FLUENT' } },
            { id: '2', content: { name: 'Espanhol', level: 'INTERMEDIATE' } },
          ]),
        ],
      }),
    );
    expect(html).toContain('Inglês (Avançado (C1))');
    expect(html).toContain('Espanhol (Intermediário)');
    expect(html).toContain('simple-list');
  });

  test('summary renders as text section', () => {
    const html = renderer.render(
      ast({ sections: [textSection('summary', 'Resumo', 'Engenheira focada em DX.')] }),
    );
    expect(html).toContain('RESUMO'); // section title uppercased
    expect(html).toContain('Engenheira focada em DX.');
  });
});

describe('AstHtmlRendererService — safety & ordering', () => {
  test('escapes HTML in user content', () => {
    const html = renderer.render(
      ast({
        sections: [textSection('summary', 'Resumo', '<script>alert(1)</script> & "quotes"')],
      }),
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  test('sections render in `order`', () => {
    const html = renderer.render(
      ast({
        sections: [
          textSection('b', 'Segunda', 'segundo', 2),
          textSection('a', 'Primeira', 'primeiro', 1),
        ],
      }),
    );
    expect(html.indexOf('PRIMEIRA')).toBeLessThan(html.indexOf('SEGUNDA'));
  });
});

describe('AstHtmlRendererService — ATS template', () => {
  const ats = { template: 'ats' as const };

  test('serif page, no external font, contact carries website + location joined by |', () => {
    const html = renderer.render(
      ast({
        header: {
          fullName: 'Ada',
          jobTitle: 'Eng',
          phone: '+55',
          email: 'a@b.com',
          location: 'São Paulo',
          linkedin: 'https://linkedin.com/in/ada',
          github: 'https://github.com/ada',
          website: 'https://ada.dev',
        },
      }),
      ats,
    );
    expect(html).toContain('page page-ats');
    expect(html).toContain('Libertinus Serif');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).toContain('ada.dev');
    expect(html).toContain('São Paulo');
    expect(html).toContain(' | ');
    expect(html).not.toContain('section-bar');
  });

  test('entry: inline "title | date" (hyphen), location in subtitle, no "em field", plain bullets, achievements as bullets', () => {
    const html = renderer.render(
      ast({
        sections: [
          itemSection('work_experience_v1', 'Exp', [
            {
              id: 'a',
              content: {
                role: 'Dev',
                company: 'X',
                location: 'Remoto',
                field: 'Backend',
                employmentType: 'Full-time',
                startDate: '2022-03-01T00:00:00.000Z',
                isCurrent: true,
                description: '- a\n- b',
                achievements: ['Dobrei a cobertura de testes'],
                technologies: ['TypeScript'],
              },
            },
          ]),
        ],
      }),
      ats,
    );
    expect(html).toContain('Mar 2022 - Presente'); // hyphen, not en-dash
    expect(html).toContain('X · Tempo integral, Remoto');
    expect(html).not.toContain('em Backend');
    expect(html).toContain('bullet-ats');
    expect(html).not.toContain('<ul');
    // achievements render as bullets, not under "Tecnologias:"
    expect(html).toContain('- Dobrei a cobertura de testes');
    // "Tecnologias:" reserved for the real technologies list
    expect(html).toContain('Tecnologias:');
    expect(html).toContain('TypeScript');
  });

  test('simple list uses the raw level and comma join (no pt-BR translation)', () => {
    const html = renderer.render(
      ast({
        sections: [
          itemSection('language_v1', 'Idiomas', [
            { id: '1', content: { name: 'Inglês', level: 'FLUENT' } },
            { id: '2', content: { name: 'Espanhol', level: 'INTERMEDIATE' } },
          ]),
        ],
      }),
      ats,
    );
    expect(html).toContain('Inglês (FLUENT), Espanhol (INTERMEDIATE)');
    expect(html).not.toContain('Avançado');
  });
});
