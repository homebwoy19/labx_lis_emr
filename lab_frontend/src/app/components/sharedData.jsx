export const CENTRES = [];

export const USERS = [];

export const PATIENTS = [];

export const TESTS = [
  {
    id: "t1",
    code: "CBC-001",
    name: "Complete Blood Count (CBC)",
    category: "Haematology",
    price: "₦1200",
    turnaround: "4 hrs",
    sampleType: "Whole Blood",
  },
  {
    id: "t2",
    code: "LFT-002",
    name: "Liver Function Tests",
    category: "Biochemistry",
    price: "₦2500",
    turnaround: "6 hrs",
    sampleType: "Serum",
  },
  {
    id: "t3",
    code: "KFT-003",
    name: "Kidney Function Tests",
    category: "Biochemistry",
    price: "₦2200",
    turnaround: "6 hrs",
    sampleType: "Serum",
  },
  {
    id: "t4",
    code: "FBS-004",
    name: "Fasting Blood Sugar",
    category: "Biochemistry",
    price: "₦600",
    turnaround: "2 hrs",
    sampleType: "Serum",
  },
  {
    id: "t5",
    code: "TSH-005",
    name: "Thyroid Stimulating Hormone",
    category: "Endocrinology",
    price: "₦3500",
    turnaround: "8 hrs",
    sampleType: "Serum",
  },
  {
    id: "t6",
    code: "URI-006",
    name: "Urinalysis",
    category: "Microbiology",
    price: "₦800",
    turnaround: "2 hrs",
    sampleType: "Urine",
  },
  {
    id: "t7",
    code: "XRY-007",
    name: "Chest X-Ray",
    category: "Radiology",
    price: "₦4500",
    turnaround: "1 hr",
    sampleType: "N/A",
  },
  {
    id: "t8",
    code: "ULS-008",
    name: "Abdominal Ultrasound",
    category: "Radiology",
    price: "₦6000",
    turnaround: "1 hr",
    sampleType: "N/A",
  },
  {
    id: "t9",
    code: "HBA-009",
    name: "HbA1c",
    category: "Endocrinology",
    price: "₦2800",
    turnaround: "4 hrs",
    sampleType: "Whole Blood",
  },
  {
    id: "t10",
    code: "LPS-010",
    name: "Lipid Profile",
    category: "Biochemistry",
    price: "₦2000",
    turnaround: "6 hrs",
    sampleType: "Serum",
  },
];

export const TEST_ORDERS = [];

export const RESULTS = [];

export const PAYMENTS = [];

export const AUDIT_LOGS = [];

export const revenueData = [
  { month: "Jan", Aguda: 2000000, BodeThomas: 1900000 },
  { month: "Feb", Aguda: 1350000, BodeThomas: 2000000 },
  { month: "Mar", Aguda: 1280000, BodeThomas: 890000 },
  { month: "Apr", Aguda: 1420000, BodeThomas: 1050000 },
  { month: "May", Aguda: 1580000, BodeThomas: 1110000 },
  { month: "Jun", Aguda: 2650000, BodeThomas: 2180000 },
];

export const testsByCategoryData = [
  { name: "Biochemistry", value: 34 },
  { name: "Haematology", value: 22 },
  { name: "Radiology", value: 18 },
  { name: "Endocrinology", value: 14 },
  { name: "Microbiology", value: 12 },
];

export const testsByDayData = [
  { day: "Mon", Aguda: 32, BodeThomas: 26, tests: 58 },
  { day: "Tue", Aguda: 40, BodeThomas: 32, tests: 72 },
  { day: "Wed", Aguda: 35, BodeThomas: 30, tests: 65 },
  { day: "Thu", Aguda: 45, BodeThomas: 36, tests: 81 },
  { day: "Fri", Aguda: 52, BodeThomas: 42, tests: 94 },
  { day: "Sat", Aguda: 25, BodeThomas: 22, tests: 47 },
  { day: "Sun", Aguda: 13, BodeThomas: 10, tests: 23 },
];

export const PIE_COLORS = [
  "#1a6bcc",
  "#0ea5a0",
  "#7c3aed",
  "#f59e0b",
  "#10b981",
];

// ============================================================================
// PLATFORM (SUPER ADMIN) DATA
// Tenants of the platform. A "laboratory" here is an Organization in the API;
// its centres are Branches. Super Admin works across every tenant.
// ============================================================================
export const PLATFORM_ORGS = [

];

// Branch creation requests awaiting Super Admin approval (BRANCH_APPROVE).
export const BRANCH_REQUESTS = [
  {
    id: "br1",
    orgId: "org2",
    orgName: "Aguda Lab",
    name: "Aguda Lab — Surulere",
    code: "SUR",
    city: "Lagos",
    address: "14 Bode Thomas Street, Surulere",
    phone: "+2348022114512",
    manager: "Susan Batholomew",
    requestedBy: "Judith Obiorah",
    requestedAt: "2026-08-05",
    status: "pending",
  },
  {
    id: "br2",
    orgId: "org1",
    orgName: "Foundation Medical Diagnostic Lab",
    name: "Foundation Lab — Ikeja GRA",
    code: "IKJ",
    city: "Lagos",
    address: "3 Joel Ogunnaike Street, Ikeja GRA",
    phone: "+2348033812188",
    manager: "Kevin Ikeduba",
    requestedBy: "Mrs. Judith N. Obiorah (BMLS)",
    requestedAt: "2026-08-04",
    status: "pending",
  },
  {
    id: "br3",
    orgId: "org3",
    orgName: "Crestview Diagnostics",
    name: "Crestview — Abuja Central",
    code: "ABJ",
    city: "Abuja",
    address: "Plot 22 Ademola Adetokunbo Crescent, Wuse II",
    phone: "+2347066231190",
    manager: "Dr. Emeka Nwosu",
    requestedAt: "2026-08-02",
    requestedBy: "Dr. Emeka Nwosu",
    status: "pending",
  },
  {
    id: "br4",
    orgId: "org1",
    orgName: "Foundation Medical Diagnostic Lab",
    name: "Foundation Lab — Bode Thomas",
    code: "BDT",
    city: "Lagos",
    address: "27 Bode Thomas Street, Surulere",
    phone: "+2348033812170",
    manager: "Mrs. Judith N. Obiorah (BMLS)",
    requestedBy: "Mrs. Judith N. Obiorah (BMLS)",
    requestedAt: "2026-06-28",
    status: "approved",
  },
  {
    id: "br5",
    orgId: "org4",
    orgName: "Sahel Medical Laboratories",
    name: "Sahel — Kano Annex",
    code: "KAN",
    city: "Kano",
    address: "8 Murtala Mohammed Way",
    phone: "+2349044120099",
    manager: "Hauwa Danjuma",
    requestedBy: "Hauwa Danjuma",
    requestedAt: "2026-06-15",
    status: "rejected",
    reason: "Facility licence document expired.",
  },
];

// Plan catalog the Super Admin assigns to tenants (SUBSCRIPTION_MANAGE).
export const PLATFORM_PLANS = [
  { id: "trial", name: "Trial", price: 0, branchLimit: 1, userLimit: 5 },
  { id: "starter", name: "Starter", price: 75000, branchLimit: 2, userLimit: 15 },
  { id: "growth", name: "Growth", price: 180000, branchLimit: 5, userLimit: 50 },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 420000,
    branchLimit: 25,
    userLimit: 250,
  },
];

export const SUBSCRIPTIONS = [
  {
    id: "sub1",
    orgId: "org1",
    orgName: "Foundation Medical Diagnostic Lab",
    plan: "Enterprise",
    amount: 420000,
    cycle: "Monthly",
    status: "active",
    seats: 250,
    seatsUsed: 7,
    startedAt: "2025-11-02",
    renewsAt: "2026-09-02",
  },
  {
    id: "sub2",
    orgId: "org2",
    orgName: "Aguda Lab",
    plan: "Growth",
    amount: 180000,
    cycle: "Monthly",
    status: "active",
    seats: 50,
    seatsUsed: 5,
    startedAt: "2026-01-18",
    renewsAt: "2026-08-18",
  },
  {
    id: "sub3",
    orgId: "org3",
    orgName: "Crestview Diagnostics",
    plan: "Trial",
    amount: 0,
    cycle: "14 days",
    status: "trial",
    seats: 5,
    seatsUsed: 3,
    startedAt: "2026-07-21",
    renewsAt: "2026-08-11",
  },
  {
    id: "sub4",
    orgId: "org4",
    orgName: "Sahel Medical Laboratories",
    plan: "Starter",
    amount: 75000,
    cycle: "Monthly",
    status: "past_due",
    seats: 15,
    seatsUsed: 11,
    startedAt: "2025-09-09",
    renewsAt: "2026-07-09",
  },
];

// Platform-wide audit trail — spans every tenant (PLATFORM_AUDIT_READ).
export const PLATFORM_AUDIT_LOGS = [
  {
    id: "pa1",
    actor: "Platform Administrator",
    action: "Approved",
    entity: "Branch",
    entityId: "BDT",
    org: "Foundation Medical Diagnostic Lab",
    date: "2026-08-06",
    time: "09:12:40",
    ip: "102.89.34.12",
  },
  {
    id: "pa2",
    actor: "Platform Administrator",
    action: "Suspended",
    entity: "Organization",
    entityId: "org4",
    org: "Sahel Medical Laboratories",
    date: "2026-08-05",
    time: "17:48:02",
    ip: "102.89.34.12",
  },
  {
    id: "pa3",
    actor: "Platform Administrator",
    action: "Created",
    entity: "Organization",
    entityId: "org3",
    org: "Crestview Diagnostics",
    date: "2026-07-21",
    time: "11:03:55",
    ip: "102.89.34.12",
  },
  {
    id: "pa4",
    actor: "Platform Administrator",
    action: "Updated",
    entity: "Subscription",
    entityId: "sub2",
    org: "Aguda Lab",
    date: "2026-07-18",
    time: "14:26:31",
    ip: "197.210.55.8",
  },
  {
    id: "pa5",
    actor: "Platform Administrator",
    action: "Rejected",
    entity: "Branch",
    entityId: "KAN",
    org: "Sahel Medical Laboratories",
    date: "2026-06-15",
    time: "10:19:07",
    ip: "197.210.55.8",
  },
  {
    id: "pa6",
    actor: "Platform Administrator",
    action: "Created",
    entity: "Organization",
    entityId: "org2",
    org: "Aguda Lab",
    date: "2026-01-18",
    time: "08:41:22",
    ip: "102.89.34.12",
  },
];

// Tenant growth — new labs onboarded and platform MRR per month.
export const platformGrowthData = [
  { month: "Mar", labs: 1, mrr: 420000 },
  { month: "Apr", labs: 1, mrr: 420000 },
  { month: "May", labs: 2, mrr: 600000 },
  { month: "Jun", labs: 3, mrr: 675000 },
  { month: "Jul", labs: 4, mrr: 675000 },
  { month: "Aug", labs: 4, mrr: 600000 },
];

export const planDistributionData = [
  { name: "Enterprise", value: 1 },
  { name: "Growth", value: 1 },
  { name: "Starter", value: 1 },
  { name: "Trial", value: 1 },
];
