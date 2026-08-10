import { prisma } from "./prisma.js";

/**
 * Models that carry a tenant boundary. For each, we list which scope columns
 * exist so the extension only injects filters the model actually has.
 *
 *   org   -> has organizationId
 *   branch-> has branchId
 */
const TENANT_MODELS = {
  Branch: { org: true, branch: false },
  User: { org: true, branch: true },
  Role: { org: true, branch: false },
  Patient: { org: true, branch: true },
  TestCategory: { org: true, branch: false },
  Test: { org: true, branch: false },
  TestOrder: { org: true, branch: true },
  Sample: { org: true, branch: true },
  Result: { org: true, branch: true },
  Payment: { org: true, branch: true },
  Subscription: { org: true, branch: false },
  SubscriptionHistory: { org: true, branch: false },
  Document: { org: true, branch: false },
  OrganizationSetting: { org: true, branch: false },
  Notification: { org: true, branch: false },
  AuditLog: { org: true, branch: false },
};

const READ_OPS = new Set(["findFirst", "findMany", "findUnique", "count", "aggregate", "groupBy"]);
const WRITE_OPS = new Set(["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"]);

/**
 * Returns a tenant-scoped Prisma client.
 *
 * Given a request context { organizationId, branchId, isSuperAdmin, isOrgAdmin }
 * this transparently:
 *   - adds organizationId / branchId filters to every read on tenant models
 *   - stamps organizationId / branchId onto created rows
 *
 * Super Admin bypasses all scoping (platform-wide access). A Lab Admin is
 * org-scoped but NOT branch-scoped (sees all branches in their lab). Everyone
 * else is scoped to a single branch.
 *
 * This is defense-in-depth: even if a query in a repository forgets a where
 * clause, cross-tenant data cannot leak.
 */
export function forTenant(context) {
  const { organizationId, branchId, isSuperAdmin = false, isOrgAdmin = false } = context || {};

  if (isSuperAdmin) return prisma; // platform owner — unscoped

  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scope = TENANT_MODELS[model];
          if (!scope) return query(args); // non-tenant model, no scoping

          const filter = {};
          if (scope.org && organizationId) filter.organizationId = organizationId;
          // Branch filter applies only to non-org-admins.
          if (scope.branch && branchId && !isOrgAdmin) filter.branchId = branchId;

          if (READ_OPS.has(operation)) {
            args.where = { ...(args.where || {}), ...filter };
          } else if (WRITE_OPS.has(operation)) {
            // updateMany / deleteMany accept a where — scope it too.
            if ("where" in args || operation.endsWith("Many")) {
              args.where = { ...(args.where || {}), ...filter };
            }
            // Stamp scope columns onto created data.
            if (operation === "create" && args.data) {
              args.data = { ...filter, ...args.data };
            }
            if (operation === "createMany" && Array.isArray(args.data)) {
              args.data = args.data.map((d) => ({ ...filter, ...d }));
            }
            if (operation === "upsert") {
              args.where = { ...(args.where || {}), ...filter };
              if (args.create) args.create = { ...filter, ...args.create };
            }
          }

          return query(args);
        },
      },
    },
  });
}

export default forTenant;
