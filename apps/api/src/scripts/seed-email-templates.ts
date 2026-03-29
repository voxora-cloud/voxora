import { connectDatabase, disconnectDatabase } from "@shared/config/database";
import { seedEmailTemplates } from "@shared/seeds/emailTemplates.seed";

async function run() {
  await connectDatabase();
  try {
    const result = await seedEmailTemplates();
    console.log(
      `[EmailTemplate Seeder] Done. inserted=${result.inserted}`,
    );
  } finally {
    await disconnectDatabase();
  }
}

run().catch((error) => {
  console.error("[EmailTemplate Seeder] Failed:", error);
  process.exit(1);
});
