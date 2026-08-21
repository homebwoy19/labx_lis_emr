/* eslint-disable no-console */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ALL_PERMISSIONS } from "../src/constants/permissions.js";
import { ROLE_PERMISSIONS } from "../src/constants/roles.js";

/**
 * Idempotent permission (re)grant — WITHOUT reseeding.
 *
 * Use this to roll out newly-added permissions (e.g. RESULT_PREPARE /
 * RESULT_SEND) to an ALREADY-provisioned database. Unlike `seed.js`, it does NO
 * destructive cleanup and touches NO tenant data: it only
 *   1. upserts the full permission catalog, and
 *   2. re-applies the ROLE_PERMISSIONS grants to every EXISTING role — both the
 *      system role templates (organizationId = null) and each organization's
 *      cloned roles — matched by role key.
 *
 * Existing grants are left as-is; only missing grants are added. It never
 * revokes a permission and never deletes a row, so it is safe to run repeatedly
 * against live data. It self-heals future permission additions the same way.
 */
const prisma = new PrismaClient();

async function main() {
  console.log("Granting permissions (idempotent, non-destructive)…");

  // 1. Ensure the full permission catalog exists.
  const permByKey = new Map();
  for (const key of ALL_PERMISSIONS) {
    const [resource, ...rest] = key.split(":");
    const action = rest.join(":");
    const perm = await prisma.permission.upsert({
      where: { key },
      update: { resource, action },
      create: { key, resource, action },
    });
    permByKey.set(key, perm);
  }
  console.log(`  ✓ ${permByKey.size} permissions in catalog`);

  // 2. Re-apply ROLE_PERMISSIONS to every existing role (templates + org clones),
  //    matched by key. Roles whose key has no mapping are skipped.
  const roles = await prisma.role.findMany({
    select: { id: true, key: true, organizationId: true },
  });

  let rolesTouched = 0;
  for (const role of roles) {
    const keys = ROLE_PERMISSIONS[role.key];
    if (!keys) continue;
    rolesTouched += 1;
    for (const key of keys) {
      const perm = permByKey.get(key);
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  console.log(
    `  ✓ re-applied grants to ${rolesTouched} mapped role row(s) of ${roles.length} total`,
  );
  console.log("Done. No data was deleted.");
}

main()
  .catch((err) => {
    console.error("Grant failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
