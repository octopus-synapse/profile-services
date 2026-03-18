const { PrismaClient } = require('./src/generated/prisma-client');
const prisma = new PrismaClient();
async function main() {
  const types = await prisma.sectionType.findMany({
    where: { key: { in: ['skill_set_v1', 'work_experience_v1', 'language_v1'] } },
    select: { key: true, renderHints: true, fieldStyles: true },
  });
  console.log(JSON.stringify(types, null, 2));
  await prisma.$disconnect();
}
main();
