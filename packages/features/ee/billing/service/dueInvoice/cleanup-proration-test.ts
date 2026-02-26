#!/usr/bin/env npx tsx
/**
 * Cleanup script for proration test data
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/service/dueInvoice/cleanup-proration-test.ts
 *
 * Options:
 *   --skip-stripe    Skip Stripe API cleanup
 */

import { config } from "dotenv";
import { resolve } from "node:path";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), ".env") });

import Stripe from "stripe";

import { prisma } from "@calcom/prisma";

const SKIP_STRIPE = process.argv.includes("--skip-stripe");

function getStripeClient(): Stripe | null {
  if (SKIP_STRIPE) {
    logger.log("Skipping Stripe cleanup (--skip-stripe flag)");
    return null;
  }

  if (!process.env.STRIPE_PRIVATE_KEY) {
    logger.log("STRIPE_PRIVATE_KEY not set, skipping Stripe cleanup");
    return null;
  }

  return new Stripe(process.env.STRIPE_PRIVATE_KEY, {
    apiVersion: "2020-08-27",
  });
}

async function cleanupStripeResources(stripe: Stripe) {
  logger.log("\nCleaning up Stripe resources...");

  // Find and delete test customers by email
  const customers = await stripe.customers.list({
    limit: 100,
    email: "proration-admin@example.com",
  });

  for (const customer of customers.data) {
    try {
      // Cancel all subscriptions first
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
      });

      for (const sub of subscriptions.data) {
        if (sub.status !== "canceled") {
          await stripe.subscriptions.cancel(sub.id);
          logger.log(`  Cancelled subscription: ${sub.id}`);
        }
      }

      // Void any open invoices
      const invoices = await stripe.invoices.list({
        customer: customer.id,
        status: "open",
      });

      for (const invoice of invoices.data) {
        try {
          await stripe.invoices.voidInvoice(invoice.id);
          logger.log(`  Voided invoice: ${invoice.id}`);
        } catch {
          logger.log(`  Could not void invoice ${invoice.id}`);
        }
      }

      // Delete the customer
      await stripe.customers.del(customer.id);
      logger.log(`  Deleted customer: ${customer.id}`);
    } catch (error) {
      console.log(`  Error cleaning up customer ${customer.id}:`, error);
    }
  }

  // Archive test products
  const products = await stripe.products.list({ limit: 100 });

  for (const product of products.data) {
    if (product.name.startsWith("Proration Test") && product.active) {
      try {
        await stripe.products.update(product.id, { active: false });
        logger.log(`  Archived product: ${product.id}`);
      } catch {
        logger.log(`  Could not archive product ${product.id}`);
      }
    }
  }

  logger.log("Stripe cleanup complete");
}

async function cleanupDatabaseResources() {
  logger.log("\nCleaning up database resources...");

  // Find test organization
  const org = await prisma.team.findFirst({
    where: { slug: "proration-test-org" },
  });

  if (!org) {
    logger.log("  No test organization found");
    return;
  }

  logger.log(`  Found test organization: ${org.name} (ID: ${org.id})`);

  // Delete proration records
  const deletedProrations = await prisma.monthlyProration.deleteMany({
    where: { teamId: org.id },
  });
  logger.log(`  Deleted ${deletedProrations.count} proration records`);

  // Delete seat change logs
  const deletedLogs = await prisma.seatChangeLog.deleteMany({
    where: { teamId: org.id },
  });
  logger.log(`  Deleted ${deletedLogs.count} seat change logs`);

  // Delete organization billing
  await prisma.organizationBilling
    .delete({ where: { teamId: org.id } })
    .catch(() => logger.log("  No organization billing to delete"));

  // Delete organization settings
  await prisma.organizationSettings
    .delete({ where: { organizationId: org.id } })
    .catch(() => logger.log("  No organization settings to delete"));

  // Delete profiles for org members
  await prisma.profile.deleteMany({ where: { organizationId: org.id } });
  logger.log("  Deleted profiles");

  // Find and delete child teams
  const childTeams = await prisma.team.findMany({
    where: { parentId: org.id },
  });

  for (const team of childTeams) {
    await prisma.membership.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
    logger.log(`  Deleted team: ${team.name}`);
  }

  // Delete org memberships
  const deletedMemberships = await prisma.membership.deleteMany({
    where: { teamId: org.id },
  });
  logger.log(`  Deleted ${deletedMemberships.count} memberships`);

  // Delete organization
  await prisma.team.delete({ where: { id: org.id } });
  logger.log(`  Deleted organization: ${org.name}`);

  // Delete test users (admin, member, and additional users 1-6)
  const testEmails = [
    "proration-admin@example.com",
    "proration-member@example.com",
    ...Array.from({ length: 6 }, (_, i) => `proration-user-${i + 1}@example.com`),
  ];
  for (const email of testEmails) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.password.deleteMany({ where: { userId: user.id } });
        await prisma.membership.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
        logger.log(`  Deleted user: ${email}`);
      }
    } catch {
      // Ignore errors
    }
  }

  logger.log("Database cleanup complete");
}

async function main() {
  logger.log("=== Proration Test Cleanup Script ===");
  logger.log("\nOptions:");
  logger.log(`  --skip-stripe: ${SKIP_STRIPE}`);

  const stripe = getStripeClient();

  try {
    await cleanupDatabaseResources();

    if (stripe) {
      await cleanupStripeResources(stripe);
    }

    logger.log("\n=== Cleanup Complete ===");
  } catch (error) {
    console.error("\nCleanup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
