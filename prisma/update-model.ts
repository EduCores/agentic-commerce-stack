import { prisma } from '../src/lib/adapters/prisma';
async function main() {
  const r = await prisma.agent.updateMany({ where: { slug: 'sales-assistant' }, data: { model: 'qwen/qwen3-30b-a3b' } });
  console.log('modelo actualizado:', r.count);
}
main().finally(() => prisma.$disconnect());
