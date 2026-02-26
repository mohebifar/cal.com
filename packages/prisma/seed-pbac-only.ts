#!/usr/bin/env tsx

/**
 * Standalone script to create a PBAC-enabled organization with custom roles
 * Run with: npx tsx packages/prisma/seed-pbac-only.ts
 */
import { createPBACOrganization } from "./seed-pbac-organization";

async function main() {
  logger.log("🚀 Starting PBAC organization seed...");

  try {
    const result = await createPBACOrganization();

    logger.log("\n🎉 PBAC Organization created successfully!");
    logger.log("\n📋 Summary:");
    logger.log(`Organization: ${result.organization.name} (${result.organization.slug})`);
    logger.log(`Custom Roles: ${Object.keys(result.customRoles).length}`);
    logger.log(`Users: ${result.users.length}`);
    logger.log(`Team: ${result.team?.name || "None"} (${result.team?.slug || "N/A"})`);

    logger.log("\n🔐 Login Credentials:");
    result.users.forEach(({ user, role, customRole }) => {
      const roleText = customRole ? `${role} + ${customRole}` : role;
      logger.log(`  - ${user.name}: ${user.email} / password (${roleText})`);
    });

    logger.log(`\n🌐 Access URLs:`);
    logger.log(`Organization: ${process.env.NEXT_PUBLIC_WEBAPP_URL}/org/${result.organization.slug}`);
    if (result.team) {
      logger.log(`Team: ${process.env.NEXT_PUBLIC_WEBAPP_URL}/team/${result.team.slug}`);
    }
  } catch (error) {
    console.error("❌ Error creating PBAC organization:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    logger.log("\n✅ Seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
