import { connectDatabase, disconnectDatabase } from "@shared/infra/database";
import { seedEmailTemplates } from "@shared/seeds/emailTemplates.seed";

async function runSeedEmailTemplates(): Promise<void> {
  await connectDatabase();
  try {
    const result = await seedEmailTemplates();
    console.log(`[EmailTemplate Seeder] Done. inserted=${result.inserted}`);
  } finally {
    await disconnectDatabase();
  }
}

runSeedEmailTemplates().catch((error) => {
  console.error("[EmailTemplate Seeder] Failed:", error);
  process.exit(1);
});
