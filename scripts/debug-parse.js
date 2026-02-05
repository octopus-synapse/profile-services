const { readFileSync } = require('fs');

function parseDtoClass(content, className) {
  // Find class definition - handle extends and implements, with or without export
  const classRegex = new RegExp(
    `(?:export\\s+)?class ${className}(?:\\s+extends\\s+\\w+)?(?:\\s+implements\\s+[\\w,\\s]+)?\\s*\\{`,
    's',
  );
  const classStart = content.search(classRegex);
  if (classStart === -1) {
    console.log('  Class not found with regex');
    return null;
  }

  // Find the matching closing brace
  let braceCount = 0;
  let classEnd = classStart;
  let foundStart = false;

  for (let i = classStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      foundStart = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (foundStart && braceCount === 0) {
        classEnd = i;
        break;
      }
    }
  }

  const classBody = content.substring(classStart, classEnd + 1);
  console.log('  Class body length:', classBody.length);

  const properties = {};
  const required = [];

  // Parse properties with @ApiProperty
  const propRegex =
    /@ApiProperty\(\s*\{([^}]*)\}\s*\)\s*(?:readonly\s+)?(\w+)(\?)?:\s*([^;=]+)/g;

  let propMatch;
  while ((propMatch = propRegex.exec(classBody)) !== null) {
    const propName = propMatch[2];
    console.log('  Found property:', propName);
    properties[propName] = { type: 'string' };
    if (propMatch[3] !== '?') {
      required.push(propName);
    }
  }

  console.log('  Properties found:', Object.keys(properties).length);
  return { type: 'object', properties, required };
}

// Test ImportJsonDto
console.log('\n=== Testing ImportJsonDto ===');
const importContent = readFileSync(
  'src/bounded-contexts/import/resume-import/dto/import.dto.ts',
  'utf-8',
);
const importResult = parseDtoClass(importContent, 'ImportJsonDto');
console.log('Result:', importResult);

// Test UpdateRoleDto
console.log('\n=== Testing UpdateRoleDto ===');
const collabContent = readFileSync(
  'src/bounded-contexts/collaboration/collaboration/dto/collaboration.dto.ts',
  'utf-8',
);
const roleResult = parseDtoClass(collabContent, 'UpdateRoleDto');
console.log('Result:', roleResult);

// Test InviteCollaboratorDto
console.log('\n=== Testing InviteCollaboratorDto ===');
const inviteResult = parseDtoClass(collabContent, 'InviteCollaboratorDto');
console.log('Result:', inviteResult);
