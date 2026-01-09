#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SECTIONS = [
  'achievement',
  'award',
  'bug-bounty',
  'certification',
  'education',
  'experience',
  'hackathon',
  'interest',
  'language',
  'open-source',
  'project',
  'publication',
  'recommendation',
  'skill',
  'talk',
];

const dirs = [
  'src/resumes/controllers',
  'src/resumes/services',
  'src/resumes/repositories',
];

let totalFiles = 0;
let totalUpdates = 0;

dirs.forEach((dir) => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts'));

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Replace specific DTO imports with barrel import
    SECTIONS.forEach((section) => {
      const regex = new RegExp(
        `from ['"]\\.\\.\/dto\/${section}\\.dto['"];?`,
        'g',
      );
      if (regex.test(content)) {
        content = content.replace(regex, `from '../dto';`);
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalUpdates++;
      console.log(`✓ Updated: ${filePath}`);
    }
    totalFiles++;
  });
});

console.log(`\n✅ Processed ${totalFiles} files, updated ${totalUpdates}`);
