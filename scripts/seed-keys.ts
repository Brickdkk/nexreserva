/**
 * Script: seed-keys.ts
 * Genera 10 keys de prueba gratis (30 días, plan basico — $14.990) e inserta en BD.
 * Uso: npx tsx scripts/seed-keys.ts
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import crypto from "crypto";

function generateKey(): string {
  // Formato: NXRV-XXXX-XXXX-XXXX
  const seg = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `NXRV-${seg()}-${seg()}-${seg()}`;
}

async function main() {
  const keys: string[] = [];

  for (let i = 0; i < 10; i++) {
    const code = generateKey();
    await prisma.subscriptionKey.create({
      data: { code, plan: "basico", duration: 30 },
    });
    keys.push(code);
  }

  console.log("\n✅ 10 keys generadas (Plan Básico — $14.990/mes — 30 días gratis):\n");
  keys.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));
  console.log("");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
