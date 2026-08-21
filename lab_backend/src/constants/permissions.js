/**
 * Canonical permission catalog — the single source of truth.
 *
 * Format: "<resource>:<action>". Roles are granted subsets of these. Adding a
 * new capability means adding a key here and granting it in ROLE_PERMISSIONS,
 * then reseeding — no code branches on role names anywhere else.
 */
export const PERMISSIONS = {
  // Platform (Super Admin)
  ORG_CREATE: "organization:create",
  ORG_READ: "organization:read",
  ORG_UPDATE: "organization:update",
  ORG_SUSPEND: "organization:suspend",
  BRANCH_APPROVE: "branch:approve",
  SUBSCRIPTION_MANAGE: "subscription:manage",
  SUBSCRIPTION_READ: "subscription:read",
  PLATFORM_AUDIT_READ: "platform:audit:read",

  // Dashboards (scoped live data)
  DASHBOARD_READ: "dashboard:read",

  // Branches
  BRANCH_CREATE: "branch:create",
  BRANCH_READ: "branch:read",
  BRANCH_UPDATE: "branch:update",

  // Users / RBAC
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  ROLE_MANAGE: "role:manage",

  // Patients
  PATIENT_CREATE: "patient:create",
  PATIENT_READ: "patient:read",
  PATIENT_UPDATE: "patient:update",
  PATIENT_DELETE: "patient:delete",

  // Test catalog
  TEST_CREATE: "test:create",
  TEST_READ: "test:read",
  TEST_UPDATE: "test:update",
  TEST_DELETE: "test:delete",

  // Orders
  ORDER_CREATE: "order:create",
  ORDER_READ: "order:read",
  ORDER_UPDATE: "order:update",
  ORDER_CANCEL: "order:cancel",

  // Samples
  SAMPLE_COLLECT: "sample:collect",
  SAMPLE_READ: "sample:read",

  // Results
  RESULT_ENTER: "result:enter",
  RESULT_READ: "result:read",
  // Receptionist types/edits the narrative report and submits it to the Lab
  // Admin for approval (does NOT grant approval — that stays RESULT_APPROVE).
  RESULT_PREPARE: "result:prepare",
  RESULT_APPROVE: "result:approve",
  RESULT_REJECT: "result:reject",
  RESULT_RELEASE: "result:release",
  // Send an approved/released report to the patient's registered contact.
  RESULT_SEND: "result:send",

  // Payments
  PAYMENT_CREATE: "payment:create",
  PAYMENT_READ: "payment:read",

  // Branding / settings
  LETTERHEAD_MANAGE: "letterhead:manage",
  SETTINGS_MANAGE: "settings:manage",

  // Audit
  AUDIT_READ: "audit:read",
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export default PERMISSIONS;
