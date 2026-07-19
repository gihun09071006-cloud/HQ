import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { syncAll } from "../src/services/sync.service";

const prisma = new PrismaClient();

const CATEGORIES = [
  ["game", "Games"],
  ["survey", "Surveys"],
  ["crypto", "Crypto"],
  ["finance", "Finance"],
  ["video", "Video"],
  ["signup", "Sign-ups"],
  ["app", "Apps"],
  ["other", "Other"],
] as const;

const COUNTRIES = [
  "US", "GB", "CA", "AU", "DE", "FR", "NL", "SE", "NO", "DK", "FI", "IE",
  "ES", "IT", "PT", "PL", "CZ", "AT", "CH", "BE", "JP", "KR", "SG", "HK",
  "TW", "IN", "ID", "PH", "TH", "VN", "MY", "BR", "MX", "AR", "TR", "AE",
] as const;

function regionName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

async function main() {
  console.log("→ Seeding categories…");
  for (const [slug, name] of CATEGORIES) {
    await prisma.category.upsert({ where: { slug }, create: { slug, name }, update: { name } });
  }

  console.log("→ Seeding countries…");
  await prisma.country.createMany({
    data: COUNTRIES.map((code) => ({ code, name: regionName(code) })),
    skipDuplicates: true,
  });

  console.log("→ Registering providers…");
  await prisma.offerProvider.upsert({
    where: { slug: "mock" },
    create: { slug: "mock", name: "SampleWall", status: "ACTIVE" },
    update: {},
  });
  // AdGem starts PAUSED so an unconfigured adapter never shows as ERROR.
  // Flip to ACTIVE in the DB (or via admin) once ADGEM_APP_ID is set.
  await prisma.offerProvider.upsert({
    where: { slug: "adgem" },
    create: { slug: "adgem", name: "AdGem", status: "PAUSED" },
    update: {},
  });

  console.log("→ Running initial sync (mock provider)…");
  const report = await syncAll();
  console.table(report);

  console.log("\n✓ Seed complete. Start the app with: npm run dev");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
