import { PERMISSIONS as P } from "./permissions.js";

/**
 * System role definitions.
 *
 * `key` maps to the frontend role identifiers where applicable:
 *   admin        -> LAB_ADMIN
 *   receptionist -> RECEPTIONIST
 *   phlebotomist -> PHLEBOTOMIST
 *   lab_tech     -> LAB_SCIENTIST
 *   radiographer -> RADIOGRAPHER
 * plus the platform-only SUPER_ADMIN.
 *
 * Adding a future role = add an entry here + grant permissions in
 * ROLE_PERMISSIONS, then reseed. No hard-coded role checks live in the codebase;
 * authorization is always permission-based.
 */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  LAB_ADMIN: "LAB_ADMIN",
  RECEPTIONIST: "RECEPTIONIST",
  PHLEBOTOMIST: "PHLEBOTOMIST",
  LAB_SCIENTIST: "LAB_SCIENTIST",
  RADIOGRAPHER: "RADIOGRAPHER",
};

export const ROLE_SCOPE = {
  [ROLES.SUPER_ADMIN]: "PLATFORM",
  [ROLES.LAB_ADMIN]: "ORGANIZATION",
  [ROLES.RECEPTIONIST]: "BRANCH",
  [ROLES.PHLEBOTOMIST]: "BRANCH",
  [ROLES.LAB_SCIENTIST]: "BRANCH",
  [ROLES.RADIOGRAPHER]: "BRANCH",
};

/** Maps legacy/frontend role identifiers to canonical role keys. */
export const FRONTEND_ROLE_MAP = {
  admin: ROLES.LAB_ADMIN,
  receptionist: ROLES.RECEPTIONIST,
  phlebotomist: ROLES.PHLEBOTOMIST,
  lab_tech: ROLES.LAB_SCIENTIST,
  radiographer: ROLES.RADIOGRAPHER,
};

export const ROLE_METADATA = {
  [ROLES.SUPER_ADMIN]: { name: "Super Admin", description: "Platform owner with full access" },
  [ROLES.LAB_ADMIN]: { name: "Lab Admin", description: "Owns and manages one laboratory" },
  [ROLES.RECEPTIONIST]: { name: "Receptionist", description: "Front desk: patients, orders, payments, results release" },
  [ROLES.PHLEBOTOMIST]: { name: "Phlebotomist", description: "Sample collection" },
  [ROLES.LAB_SCIENTIST]: { name: "Laboratory Scientist", description: "Performs laboratory investigations" },
  [ROLES.RADIOGRAPHER]: { name: "Radiographer", description: "Performs radiology investigations" },
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    P.ORG_CREATE, P.ORG_READ, P.ORG_UPDATE, P.ORG_SUSPEND,
    P.BRANCH_APPROVE, P.SUBSCRIPTION_MANAGE, P.SUBSCRIPTION_READ, P.PLATFORM_AUDIT_READ,
    P.DASHBOARD_READ,
  ],

  [ROLES.LAB_ADMIN]: [
    P.BRANCH_CREATE, P.BRANCH_READ, P.BRANCH_UPDATE,
    P.USER_CREATE, P.USER_READ, P.USER_UPDATE, P.USER_DELETE, P.ROLE_MANAGE,
    P.PATIENT_READ,
    P.TEST_CREATE, P.TEST_READ, P.TEST_UPDATE, P.TEST_DELETE,
    P.ORDER_READ,
    P.RESULT_READ, P.RESULT_APPROVE, P.RESULT_REJECT,
    P.PAYMENT_READ,
    P.LETTERHEAD_MANAGE, P.SETTINGS_MANAGE, P.AUDIT_READ,
    P.SUBSCRIPTION_READ, P.DASHBOARD_READ,
  ],

  [ROLES.RECEPTIONIST]: [
    P.PATIENT_CREATE, P.PATIENT_READ, P.PATIENT_UPDATE,
    P.TEST_READ,
    P.ORDER_CREATE, P.ORDER_READ, P.ORDER_UPDATE, P.ORDER_CANCEL,
    P.PAYMENT_CREATE, P.PAYMENT_READ,
    P.RESULT_ENTER, P.RESULT_READ, P.RESULT_RELEASE,
    P.SAMPLE_READ,
    P.DASHBOARD_READ,
  ],

  [ROLES.PHLEBOTOMIST]: [
    P.PATIENT_READ, P.ORDER_READ,
    P.SAMPLE_COLLECT, P.SAMPLE_READ,
    P.DASHBOARD_READ,
  ],

  [ROLES.LAB_SCIENTIST]: [
    P.PATIENT_READ, P.ORDER_READ, P.SAMPLE_READ,
    P.RESULT_ENTER, P.RESULT_READ,
    P.DASHBOARD_READ,
  ],

  [ROLES.RADIOGRAPHER]: [
    P.PATIENT_READ, P.ORDER_READ, P.SAMPLE_READ,
    P.RESULT_ENTER, P.RESULT_READ,
    P.DASHBOARD_READ,
  ],
};

export default ROLES;
