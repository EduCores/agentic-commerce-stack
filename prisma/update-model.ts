import { prisma } from '../src/lib/adapters/prisma';
async function main() {
  const r = await prisma.agent.updateMany({ where: { slug: 'sales-assistant' }, data: { model: 'nvidia/nemotron-3-ultra' } });
  console.log('modelo actualizado:', r.count);
}
main().finally(() => prisma.$disconnect());
