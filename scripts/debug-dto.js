const { readFileSync, readdirSync } = require('fs');
const { join } = require('path');

function findFiles(dir, pattern) {
  const files = [];
  function scan(currentDir) {
    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          scan(fullPath);
        } else if (pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (e) {}
  }
  scan(dir);
  return files;
}

const dtoFiles = findFiles('src', /\.(dto|controller)\.ts$/);
console.log('Total files found:', dtoFiles.length);

const targetDtos = ['ImportJsonDto', 'UpdateRoleDto', 'InviteCollaboratorDto'];
for (const dto of targetDtos) {
  for (const f of dtoFiles) {
    const content = readFileSync(f, 'utf-8');
    if (content.includes('class ' + dto)) {
      console.log(dto, 'found in:', f);
    }
  }
}
