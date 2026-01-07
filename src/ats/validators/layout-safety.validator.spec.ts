import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { LayoutSafetyValidator } from './layout-safety.validator';
import { ValidationSeverity } from '../interfaces';

describe('LayoutSafetyValidator', () => {
  let validator: LayoutSafetyValidator;

  beforeEach(() => {
    validator = new LayoutSafetyValidator();
  });

  describe('validate', () => {
    it('should pass validation for clean, ATS-friendly text', () => {
      const cleanText = `Professional Summary
- 5 years of experience in software development
- Expert in TypeScript and Node.js
- Strong problem-solving skills

Work Experience
Company A | Senior Developer | 2020-2024
* Led development of microservices architecture
* Mentored junior developers`;

      const result = validator.validate(cleanText);

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.metadata?.unsafeBulletCount).toBe(0);
      expect(result.metadata?.hasMultiColumn).toBe(false);
      expect(result.metadata?.hasTextInShapes).toBe(false);
    });

    it('should detect unsafe bullet characters', () => {
      const textWithUnsafeBullets = `Skills
● Advanced TypeScript programming
◆ Node.js backend development
■ AWS cloud infrastructure`;

      const result = validator.validate(textWithUnsafeBullets);

      expect(result.passed).toBe(true); // WARNING, not ERROR
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'UNSAFE_BULLET_CHARACTERS',
        severity: ValidationSeverity.WARNING,
      });
      expect(result.issues[0].message.includes('●')).toBe(true);
      expect(result.issues[0].message.includes('◆')).toBe(true);
      expect(result.issues[0].message.includes('■')).toBe(true);
      expect(result.metadata?.unsafeBulletCount).toBe(3);
    });

    it('should provide appropriate suggestion for unsafe bullets', () => {
      const textWithUnsafeBullets = `Skills
★ JavaScript
☆ Python`;

      const result = validator.validate(textWithUnsafeBullets);

      expect(result.issues[0].suggestion.includes('-, *, •')).toBe(true);
      expect(result.issues[0].suggestion.includes('ATS compatibility')).toBe(true);
    });

    it('should detect text inside shapes', () => {
      const textWithShapes = `Skills
┌────────────┐
│ TypeScript │
└────────────┘`;

      const result = validator.validate(textWithShapes);

      expect(result.passed).toBe(true); // WARNING, not ERROR
      expect(result.issues.some((i) => i.code === 'TEXT_IN_SHAPES')).toBe(true);
      const shapeIssue = result.issues.find((i) => i.code === 'TEXT_IN_SHAPES');
      expect(shapeIssue?.severity).toBe(ValidationSeverity.WARNING);
      expect(shapeIssue?.suggestion.includes('Move text out of shapes')).toBe(true);
      expect(result.metadata?.hasTextInShapes).toBe(true);
    });

    it('should detect text inside double-box shapes', () => {
      const textWithDoubleBox = `Profile
╔════════════╗
║ John Doe   ║
╚════════════╝`;

      const result = validator.validate(textWithDoubleBox);

      const shapeIssue = result.issues.find((i) => i.code === 'TEXT_IN_SHAPES');
      expect(shapeIssue).toBeDefined();
      expect(result.metadata?.hasTextInShapes).toBe(true);
    });

    it('should detect text inside ASCII box shapes', () => {
      const textWithAsciiBox = `Contact
+------------+
| Email      |
+------------+`;

      const result = validator.validate(textWithAsciiBox);

      const shapeIssue = result.issues.find((i) => i.code === 'TEXT_IN_SHAPES');
      expect(shapeIssue).toBeDefined();
    });

    it('should detect multi-column layout', () => {
      const multiColumnText = `Name: John Doe          Email: john@example.com
Position: Developer          Years: 5
Skills: TypeScript          Location: Remote`;

      const result = validator.validate(multiColumnText);

      expect(result.passed).toBe(true); // WARNING, not ERROR
      expect(
        result.issues.some((i) => i.code === 'MULTI_COLUMN_LAYOUT_DETECTED'),
      ).toBe(true);
      const columnIssue = result.issues.find(
        (i) => i.code === 'MULTI_COLUMN_LAYOUT_DETECTED',
      );
      expect(columnIssue?.severity).toBe(ValidationSeverity.WARNING);
      expect(columnIssue?.suggestion.includes('single-column layout')).toBe(true);
      expect(result.metadata?.hasMultiColumn).toBe(true);
    });

    it('should not detect multi-column for regular spacing', () => {
      const normalText = `Job Title: Senior Developer
Company: Tech Corp
Duration: 3 years`;

      const result = validator.validate(normalText);

      expect(
        result.issues.some((i) => i.code === 'MULTI_COLUMN_LAYOUT_DETECTED'),
      ).toBe(false);
      expect(result.metadata?.hasMultiColumn).toBe(false);
    });

    it('should detect excessive line breaks', () => {
      const textWithExcessiveBreaks = `Summary
Some text here



More text here



End`;

      const result = validator.validate(textWithExcessiveBreaks);

      expect(
        result.issues.some((i) => i.code === 'EXCESSIVE_LINE_BREAKS'),
      ).toBe(true);
      const breakIssue = result.issues.find(
        (i) => i.code === 'EXCESSIVE_LINE_BREAKS',
      );
      expect(breakIssue?.severity).toBe(ValidationSeverity.INFO);
      expect(breakIssue?.suggestion.includes('1-2 blank lines')).toBe(true);
    });

    it('should allow moderate blank lines (1-2)', () => {
      const normalSpacing = `Section 1

Content here

Section 2

More content`;

      const result = validator.validate(normalSpacing);

      expect(
        result.issues.some((i) => i.code === 'EXCESSIVE_LINE_BREAKS'),
      ).toBe(false);
    });

    it('should detect horizontal lines with dashes', () => {
      const textWithHorizontalLines = `Summary
-----
Professional developer`;

      const result = validator.validate(textWithHorizontalLines);

      expect(
        result.issues.some((i) => i.code === 'HORIZONTAL_LINES_DETECTED'),
      ).toBe(true);
      const lineIssue = result.issues.find(
        (i) => i.code === 'HORIZONTAL_LINES_DETECTED',
      );
      expect(lineIssue?.severity).toBe(ValidationSeverity.INFO);
    });

    it('should detect horizontal lines with equals signs', () => {
      const textWithEqualsLine = `Experience
=====
Senior Role`;

      const result = validator.validate(textWithEqualsLine);

      expect(
        result.issues.some((i) => i.code === 'HORIZONTAL_LINES_DETECTED'),
      ).toBe(true);
    });

    it('should detect horizontal lines with underscores', () => {
      const textWithUnderscores = `Education
_____
University Degree`;

      const result = validator.validate(textWithUnderscores);

      expect(
        result.issues.some((i) => i.code === 'HORIZONTAL_LINES_DETECTED'),
      ).toBe(true);
    });

    it('should detect horizontal lines with Unicode characters', () => {
      const textWithUnicodeLine = `Skills
───
TypeScript`;

      const result = validator.validate(textWithUnicodeLine);

      expect(
        result.issues.some((i) => i.code === 'HORIZONTAL_LINES_DETECTED'),
      ).toBe(true);
    });

    it('should not detect short dash sequences as horizontal lines', () => {
      const textWithShortDashes = `Node.js - Backend framework
React - Frontend library`;

      const result = validator.validate(textWithShortDashes);

      expect(
        result.issues.some((i) => i.code === 'HORIZONTAL_LINES_DETECTED'),
      ).toBe(false);
    });

    it('should detect multiple ATS layout issues simultaneously', () => {
      const problematicText = `Name: John                      Email: john@example.com
Position: Developer                      Years: 5
Skills: TypeScript                      Location: Remote
●●● Skills ●●●
───────────────
┌────────────┐
│ TypeScript │
└────────────┘



More content`;

      const result = validator.validate(problematicText);

      expect(result.passed).toBe(true); // All are WARNING/INFO, not ERROR
      expect(result.issues.length).toBeGreaterThan(3);

      // Should detect unsafe bullets, multi-column, text in shapes, horizontal lines, excessive breaks
      expect(
        result.issues.some((i) => i.code === 'UNSAFE_BULLET_CHARACTERS'),
      ).toBe(true);
      expect(
        result.issues.some((i) => i.code === 'MULTI_COLUMN_LAYOUT_DETECTED'),
      ).toBe(true);
      expect(result.issues.some((i) => i.code === 'TEXT_IN_SHAPES')).toBe(true);
      expect(
        result.issues.some((i) => i.code === 'HORIZONTAL_LINES_DETECTED'),
      ).toBe(true);
      expect(
        result.issues.some((i) => i.code === 'EXCESSIVE_LINE_BREAKS'),
      ).toBe(true);
    });

    it('should never fail with ERROR severity (all issues are WARNING/INFO)', () => {
      const worstCaseText = `
╔════════════════════════════════════════╗
║ Name: John          Email: john@test   ║
╚════════════════════════════════════════╝

★★★ Skills ★★★
───────────────────────────────────────
● JavaScript          ◆ TypeScript



● React               ■ Node.js



+------------+        +------------+
| Frontend   |        | Backend    |
+------------+        +------------+
`;

      const result = validator.validate(worstCaseText);

      expect(result.passed).toBe(true);
      const errorIssues = result.issues.filter(
        (i) => i.severity === ValidationSeverity.ERROR,
      );
      expect(errorIssues).toHaveLength(0);
    });

    it('should provide metadata summary', () => {
      const text = `
Skills
● TypeScript
● React
Name: John                      Email: john@example.com
Position: Developer                      Years: 5
Skills: TypeScript                      Location: Remote
┌────────┐
│ Info   │
└────────┘
`;

      const result = validator.validate(text);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.unsafeBulletCount).toBe(1); // Only ● is detected
      expect(result.metadata?.hasMultiColumn).toBe(true);
      expect(result.metadata?.hasTextInShapes).toBe(true);
    });

    it('should handle empty text gracefully', () => {
      const result = validator.validate('');

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.metadata?.unsafeBulletCount).toBe(0);
      expect(result.metadata?.hasMultiColumn).toBe(false);
      expect(result.metadata?.hasTextInShapes).toBe(false);
    });

    it('should handle text with only whitespace', () => {
      const result = validator.validate('   \n\n   \n   ');

      expect(result.passed).toBe(true);
      expect(result.metadata?.unsafeBulletCount).toBe(0);
    });

    it('should detect all defined unsafe bullet types', () => {
      const allUnsafeBullets = `Skills
● Filled circle
○ Empty circle
◆ Filled diamond
◇ Empty diamond
■ Filled square
□ Empty square
▪ Small filled square
▫ Small empty square
★ Filled star
☆ Empty star
► Right triangle
▼ Down triangle
▲ Up triangle
▶ Right pointer
◀ Left pointer
→ Right arrow
⇒ Double right arrow
➔ Arrow
➢ Pointer
➤ Arrow`;

      const result = validator.validate(allUnsafeBullets);

      const bulletIssue = result.issues.find(
        (i) => i.code === 'UNSAFE_BULLET_CHARACTERS',
      );
      expect(bulletIssue).toBeDefined();
      expect(result.metadata?.unsafeBulletCount).toBe(20); // All 20 unsafe bullets
    });
  });
});
