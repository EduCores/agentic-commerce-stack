import "dotenv/config";
import { ensureBuiltinTemplates, ensureDefaultSequence, BUILTIN_TEMPLATES } from "../src/lib/emails/templates";
import { prisma } from "../src/lib/adapters/prisma";

async function main() {
  await ensureBuiltinTemplates();
  await ensureDefaultSequence();
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { key: "asc" },
    select: { key: true, name: true, isActive: true },
  });
  console.log("OK plantillas:");
  for (const t of templates) console.log(` - ${t.key} → ${t.name} (activa: ${t.isActive})`);
  const seqs = await prisma.emailSequence.findMany({ select: { name: true, trigger: true, isActive: true } });
  console.log("OK secuencias:");
  for (const s of seqs) console.log(` - ${s.name} [${s.trigger}] (activa: ${s.isActive})`);
  console.log(`BUILTIN: ${BUILTIN_TEMPLATES.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
