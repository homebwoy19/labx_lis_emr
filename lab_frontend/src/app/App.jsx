// import React, { useState } from "react";
// import {
//   HeartPulse,
//   LogOut,
//   Menu,
//   Bell,
//   LayoutDashboard,
//   Users,
//   ClipboardList,
//   FileText,
//   CreditCard,
//   UserCheck,
//   Building2,
//   ScrollText,
//   BarChart3,
//   FlaskConical,
//   Settings,
//   Plus,
//   Droplets,
//   Microscope,
//   RadioTower,
//   RefreshCw,
// } from "lucide-react";
// import {
//   Card,
//   FormField,
//   Input,
//   Alert,
//   Btn,
//   Select,
// } from "./components/UIComponents";
// import {
//   DashboardScreen,
//   UsersScreen,
//   CentresScreen,
//   AuditLogsScreen,
//   ReportsScreen,
//   SettingsScreen,
// } from "./components/Admin";
// import {
//   PatientsScreen,
//   PatientDetailScreen,
//   TestOrdersScreen,
//   CreateOrderScreen,
//   TestCatalogScreen,
//   ResultsScreen,
//   PaymentsScreen,
// } from "./components/Receptionist";
// import { PhlebotomistDashboard } from "./components/Phlebotomist";
// import { LabTechDashboard } from "./components/LabTech";
// import { RadiographerDashboard } from "./components/Radiographer";

// const NAV_ITEMS = [
//   { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
//   { id: "patients", label: "Patients", icon: Users },
//   { id: "test_orders", label: "Test Orders", icon: ClipboardList },
//   { id: "results", label: "Results", icon: FileText },
//   { id: "payments", label: "Payments", icon: CreditCard },
//   { id: "users", label: "Users", icon: UserCheck },
//   { id: "centres", label: "Centres", icon: Building2 },
//   { id: "audit_logs", label: "Audit Logs", icon: ScrollText },
//   { id: "reports", label: "Reports", icon: BarChart3 },
//   { id: "test_catalog", label: "Test Catalog", icon: FlaskConical },
//   { id: "settings", label: "Settings", icon: Settings },
// ];

// function LoginScreen({ onLogin }) {
//   const [email, setEmail] = useState("alice@medlab.co.ke");
//   const [password, setPassword] = useState("••••••••");
//   const [loading, setLoading] = useState(false);
//   const [screen, setScreen] = useState("login");

//   function handleLogin() {
//     setLoading(true);
//     setTimeout(() => {
//       setLoading(false);
//       onLogin("admin");
//     }, 1200);
//   }

//   if (screen === "forgot")
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-[#0f1e3d] to-[#1a3a6e] flex items-center justify-center p-4">
//         <div className="w-full max-w-sm">
//           <div className="text-center mb-8">
//             <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mx-auto mb-3">
//               <HeartPulse className="w-6 h-6 text-white" />
//             </div>
//             <h1 className="text-xl font-semibold text-white">Reset Password</h1>
//             <p className="text-sm text-white/60 mt-1">
//               Enter your email to receive a reset link
//             </p>
//           </div>
//           <Card className="p-6 space-y-4">
//             <Alert
//               type="info"
//               message="A reset link will be sent to your registered email address."
//             />
//             <FormField label="Email Address" required>
//               <Input type="email" placeholder="you@medlab.co.ke" />
//             </FormField>
//             <Btn
//               variant="primary"
//               className="w-full justify-center"
//               onClick={() => setScreen("login")}
//             >
//               Send Reset Link
//             </Btn>
//             <button
//               className="w-full text-sm text-center text-primary hover:underline"
//               onClick={() => setScreen("login")}
//             >
//               Back to Login
//             </button>
//           </Card>
//         </div>
//       </div>
//     );

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#0f1e3d] to-[#1a3a6e] flex items-center justify-center p-4">
//       <div className="w-full max-w-sm">
//         <div className="text-center mb-8">
//           <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mx-auto mb-3">
//             <HeartPulse className="w-6 h-6 text-white" />
//           </div>
//           <h1 className="text-xl font-semibold text-white">MedLab LIS</h1>
//           <p className="text-sm text-white/60 mt-1">
//             Laboratory Information System
//           </p>
//         </div>
//         <Card className="p-6 space-y-4">
//           <FormField label="Email Address">
//             <Input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//             />
//           </FormField>
//           <FormField label="Password">
//             <Input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//             />
//           </FormField>
//           <div className="flex items-center justify-between text-sm">
//             <label className="flex items-center gap-2 cursor-pointer">
//               <input type="checkbox" className="rounded" />{" "}
//               <span className="text-muted-foreground">Remember me</span>
//             </label>
//             <button
//               className="text-primary hover:underline"
//               onClick={() => setScreen("forgot")}
//             >
//               Forgot password?
//             </button>
//           </div>
//           <Btn
//             variant="primary"
//             className="w-full justify-center"
//             onClick={handleLogin}
//             disabled={loading}
//           >
//             {loading ? (
//               <>
//                 <RefreshCw className="w-4 h-4 animate-spin" />
//                 Signing in…
//               </>
//             ) : (
//               "Sign In"
//             )}
//           </Btn>
//           <p className="text-xs text-center text-muted-foreground">
//             Demo: Select role after login
//           </p>
//         </Card>
//         <div className="mt-4 grid grid-cols-5 gap-1.5">
//           {[
//             "admin",
//             "receptionist",
//             "phlebotomist",
//             "lab_tech",
//             "radiographer",
//           ].map((r) => (
//             <button
//               key={r}
//               onClick={() => onLogin(r)}
//               className="px-2 py-1.5 rounded text-xs bg-white/10 text-white hover:bg-white/20 transition-colors capitalize"
//             >
//               {r.replace("_", " ")}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// function getRoleDefaultScreen(role) {
//   return role === "phlebotomist"
//     ? "phlebotomist_dashboard"
//     : role === "lab_tech"
//       ? "lab_tech_dashboard"
//       : role === "radiographer"
//         ? "radiographer_dashboard"
//         : "dashboard";
// }

// function getRoleNav(role) {
//   if (role === "phlebotomist")
//     return [
//       { id: "phlebotomist_dashboard", label: "My Queue", icon: Droplets },
//     ];
//   if (role === "lab_tech")
//     return [{ id: "lab_tech_dashboard", label: "My Queue", icon: Microscope }];
//   if (role === "radiographer")
//     return [
//       {
//         id: "radiographer_dashboard",
//         label: "Imaging Queue",
//         icon: RadioTower,
//       },
//     ];
//   if (role === "receptionist")
//     return [
//       { id: "payments", label: "Dashboard", icon: LayoutDashboard },
//       { id: "patients", label: "Patients", icon: Users },
//       { id: "results", label: "Results", icon: ClipboardList },
//       { id: "create_order", label: "New Order", icon: Plus },
//     ];
//   return NAV_ITEMS;
// }

// function getScreenTitle(screen) {
//   const map = {
//     dashboard: {
//       title: "Dashboard",
//       subtitle: "Welcome back, Mrs. Judith N. Obiorah (BMLS)",
//     },
//     patients: { title: "Patient Management" },
//     patient_detail: { title: "Patient Details" },
//     test_orders: { title: "Test Orders" },
//     create_order: { title: "Create Test Order" },
//     test_catalog: { title: "Test Catalog" },
//     results: { title: "Results Management" },
//     payments: { title: "Payment Management" },
//     users: { title: "User Management" },
//     centres: { title: "Centre Management" },
//     audit_logs: { title: "Audit Logs" },
//     reports: { title: "Reports" },
//     settings: { title: "Settings" },

//     phlebotomist_dashboard: {
//       title: "Phlebotomist Dashboard",
//       subtitle: "James Olowoporoku — Foundation Lab Bode Thomas",
//     },

//     lab_tech_dashboard: {
//       title: "Lab Technician Dashboard",
//       subtitle: "Mercy Akiniyi — Foundation Lab Aguda",
//     },

//     radiographer_dashboard: {
//       title: "Radiographer Dashboard",
//       subtitle: "Peter Malomo — Foundation Lab Bode Thomas",
//     },
//   };
//   return map[screen] ?? { title: screen };
// }

// export default function App() {
//   const [authed, setAuthed] = useState(false);
//   const [role, setRole] = useState("admin");
//   const [screen, setScreen] = useState("dashboard");
//   const [selectedPatient, setSelectedPatient] = useState(null);
//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   function handleLogin(r) {
//     setRole(r);
//     setScreen(getRoleDefaultScreen(r));
//     setAuthed(true);
//   }

//   function navigate(s) {
//     setScreen(s);
//   }

//   if (!authed) return <LoginScreen onLogin={handleLogin} />;

//   const { title, subtitle } = getScreenTitle(screen);
//   const navItems = getRoleNav(role);

//   return (
//     <div className="flex h-screen overflow-hidden bg-background font-[DM_Sans,system-ui,sans-serif]">
//       <aside
//         className={`w-60 flex-shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0 overflow-y-auto transition-all ${sidebarOpen ? "" : "w-0 overflow-hidden"}`}
//       >
//         <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between">
//           <div className="flex items-center gap-2.5">
//             <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
//               <HeartPulse className="w-4 h-4 text-white" />
//             </div>
//             <div>
//               <p className="text-sm font-semibold text-white">Foundation Lab</p>
//               <p className="text-xs text-sidebar-foreground/50">v1.0.0</p>
//             </div>
//           </div>
//         </div>
//         <nav className="flex-1 px-3 py-4 space-y-0.5">
//           {navItems.map((item) => {
//             const Icon = item.icon;
//             const isActive = screen === item.id;
//             return (
//               <button
//                 key={item.id}
//                 onClick={() => navigate(item.id)}
//                 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${isActive ? "bg-sidebar-accent text-white font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"}`}
//               >
//                 <Icon className="w-4 h-4 flex-shrink-0" />
//                 {item.label}
//               </button>
//             );
//           })}
//         </nav>
//         <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
//           <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
//             <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
//               {role === "admin"
//                 ? "JO"
//                 : role === "receptionist"
//                   ? "GA"
//                   : role === "phlebotomist"
//                     ? "SO"
//                     : role === "lab_tech"
//                       ? "MA"
//                       : "PM"}
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="text-xs font-medium text-white truncate">
//                 {role === "admin"
//                   ? "Mrs. Judith N. Obiorah (BMLS)"
//                   : role === "receptionist"
//                     ? "Grace Anyaoba"
//                     : role === "phlebotomist"
//                       ? "Sidikat Olowoporoku"
//                       : role === "lab_tech"
//                         ? "Mercy Akiniyi"
//                         : "Peter Malomo"}
//               </p>
//               <p className="text-xs text-sidebar-foreground/50 capitalize">
//                 {role.replace("_", " ")}
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={() => {
//               setAuthed(false);
//               setScreen("dashboard");
//             }}
//             className="w-full flex items-center cursor-pointer gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white transition-colors"
//           >
//             <LogOut className="w-4 h-4" />
//             Logout
//           </button>
//         </div>
//       </aside>

//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between flex-shrink-0">
//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => setSidebarOpen((v) => !v)}
//               className="p-1.5 rounded-lg hover:bg-muted transition-colors"
//             >
//               <Menu className="w-4 h-4 text-muted-foreground" />
//             </button>
//             <div>
//               <h1 className="text-sm font-semibold text-foreground leading-tight">
//                 {title}
//               </h1>
//               {subtitle && (
//                 <p className="text-xs text-muted-foreground leading-tight">
//                   {subtitle}
//                 </p>
//               )}
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             <Select
//               className="text-xs py-1 w-36"
//               value={role}
//               onChange={(e) => handleLogin(e.target.value)}
//             >
//               <option value="admin">Admin</option>
//               <option value="receptionist">Receptionist</option>
//               <option value="phlebotomist">Phlebotomist</option>
//               <option value="lab_tech">Lab Technician</option>
//               <option value="radiographer">Radiographer</option>
//             </Select>
//             <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
//               <Bell className="w-4 h-4 text-muted-foreground" />
//               <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
//             </button>
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto">
//           {screen === "dashboard" && <DashboardScreen onNavigate={navigate} />}
//           {screen === "patients" && (
//             <PatientsScreen
//               onNavigate={navigate}
//               setSelectedPatient={setSelectedPatient}
//             />
//           )}
//           {screen === "patient_detail" && (
//             <PatientDetailScreen
//               patient={selectedPatient}
//               onNavigate={navigate}
//             />
//           )}
//           {screen === "test_orders" && (
//             <TestOrdersScreen onNavigate={navigate} />
//           )}
//           {screen === "create_order" && (
//             <CreateOrderScreen onNavigate={navigate} />
//           )}
//           {screen === "test_catalog" && <TestCatalogScreen />}
//           {screen === "results" && <ResultsScreen />}
//           {screen === "payments" && <PaymentsScreen />}
//           {screen === "users" && <UsersScreen />}
//           {screen === "centres" && <CentresScreen />}
//           {screen === "audit_logs" && <AuditLogsScreen />}
//           {screen === "reports" && <ReportsScreen />}
//           {screen === "settings" && <SettingsScreen />}
//           {screen === "phlebotomist_dashboard" && <PhlebotomistDashboard />}
//           {screen === "lab_tech_dashboard" && <LabTechDashboard />}
//           {screen === "radiographer_dashboard" && <RadiographerDashboard />}
//         </main>
//       </div>
//     </div>
//   );
// }

import React, { useState } from "react";
import {
  HeartPulse,
  LogOut,
  Menu,
  Bell,
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  CreditCard,
  UserCheck,
  Building2,
  ScrollText,
  BarChart3,
  FlaskConical,
  Settings,
  Plus,
  Droplets,
  Microscope,
  RadioTower,
  X,
} from "lucide-react";
import {
  Card,
  FormField,
  Input,
  Alert,
  Btn,
  Select,
  Modal,
} from "./components/UIComponents";
import { LoginScreen } from "./components/Login";
import { ResetPasswordScreen } from "./components/ResetPassword";

import {
  DashboardScreen,
  PatientsScreen,
  PatientDetailScreen,
  AdminTestOrders,
  AdminResultsScreen,
  AdminPaymentsScreen,
  UsersScreen,
  CentresScreen,
  AuditLogsScreen,
  ReportsScreen,
  TestCatalogScreen,
  SettingsScreen,
} from "./components/Admin";

import {
  ReceptionistDashboard,
  ReceptionistPatientsScreen,
  ReceptionistPatientDetailScreen,
  CreateOrderScreen,
  TestOrdersScreen,
  ReceptionistResultsScreen,
} from "./components/Receptionist";

import { PhlebotomistDashboard } from "./components/Phlebotomist";
import { LabTechDashboard } from "./components/LabTech";
import { RadiographerDashboard } from "./components/Radiographer";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [role, setRole] = useState("admin");
  const [screen, setScreen] = useState("dashboard");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [orderInitialConfig, setOrderInitialConfig] = useState(null);

  // Responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  function handleLogin(r) {
    setRole(r);
    setAuthed(true);
    setScreen(
      r === "phlebotomist"
        ? "phlebotomist_dashboard"
        : r === "lab_tech"
          ? "lab_tech_dashboard"
          : r === "radiographer"
            ? "radiographer_dashboard"
            : r === "receptionist"
              ? "receptionist_dashboard"
              : "dashboard",
    );
  }

  function navigate(s, params) {
    if (s === "create_order" && params?.patient) {
      setOrderInitialConfig(params);
    } else {
      setOrderInitialConfig(null);
    }
    setScreen(s);
    setSidebarOpen(false); // Close sidebar on mobile item selection
  }

  if (!authed) return <LoginScreen onLogin={handleLogin} />;
  if (isResettingPassword)
    return (
      <ResetPasswordScreen onComplete={() => setIsResettingPassword(false)} />
    );

  const getNavItems = () => {
    if (role === "receptionist") {
      return [
        {
          id: "receptionist_dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        { id: "patients", label: "Patients", icon: Users },
        { id: "create_order", label: "New Order", icon: Plus },
        { id: "test_orders", label: "Test Orders", icon: ClipboardList },
        { id: "results", label: "Results", icon: FileText },
      ];
    }
    if (role === "phlebotomist")
      return [
        { id: "phlebotomist_dashboard", label: "My Queue", icon: Droplets },
      ];
    if (role === "lab_tech")
      return [
        { id: "lab_tech_dashboard", label: "My Queue", icon: Microscope },
      ];
    if (role === "radiographer")
      return [
        {
          id: "radiographer_dashboard",
          label: "Imaging Queue",
          icon: RadioTower,
        },
      ];

    // Admin Nav
    return [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "patients", label: "Patients", icon: Users },
      { id: "test_orders", label: "Test Orders", icon: ClipboardList },
      { id: "results", label: "Results", icon: FileText },
      { id: "payments", label: "Payments", icon: CreditCard },
      { id: "users", label: "Users", icon: UserCheck },
      { id: "centres", label: "Centres", icon: Building2 },
      { id: "audit_logs", label: "Audit Logs", icon: ScrollText },
      { id: "reports", label: "Reports", icon: BarChart3 },
      { id: "test_catalog", label: "Test Catalog", icon: FlaskConical },
      { id: "settings", label: "Settings", icon: Settings },
    ];
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Backdrop for small screens when sidebar is toggled */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HeartPulse className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">Foundation Lab</span>
          </div>
          {/* Close menu button on mobile screen split */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {getNavItems().map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  screen === item.id
                    ? "bg-sidebar-accent text-white font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => {
              setAuthed(false);
              setScreen("dashboard");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button visible on smaller screens */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-sm font-semibold capitalize">
              {screen.replace("_", " ")}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Role selection switcher strictly restricted to Admin */}
            {/* {role === "admin" && (
              <Select
                className="text-xs py-1 w-32"
                value={role}
                onChange={(e) => handleLogin(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="receptionist">Receptionist</option>
                <option value="phlebotomist">Phlebotomist</option>
                <option value="lab_tech">Lab Tech</option>
                <option value="radiographer">Radiographer</option>
              </Select>
            )} */}

            {/* Bell Notifications Button */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-lg hover:bg-muted"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Admin Routes */}
          {role === "admin" && (
            <>
              {screen === "dashboard" && (
                <DashboardScreen onNavigate={navigate} />
              )}
              {screen === "patients" && (
                <PatientsScreen
                  onNavigate={navigate}
                  setSelectedPatient={setSelectedPatient}
                />
              )}
              {screen === "patient_detail" && (
                <PatientDetailScreen
                  patient={selectedPatient}
                  onNavigate={navigate}
                />
              )}
              {screen === "create_order" && (
                <CreateOrderScreen
                  onNavigate={navigate}
                  initialPatient={orderInitialConfig?.patient}
                  startStep={orderInitialConfig?.startAtStep || 1}
                />
              )}
              {screen === "test_orders" && (
                <AdminTestOrders onNavigate={navigate} />
              )}
              {screen === "results" && <AdminResultsScreen />}
              {screen === "payments" && <AdminPaymentsScreen />}
              {screen === "users" && <UsersScreen />}
              {screen === "centres" && <CentresScreen />}
              {screen === "audit_logs" && <AuditLogsScreen />}
              {screen === "reports" && <ReportsScreen />}
              {screen === "test_catalog" && <TestCatalogScreen />}
              {screen === "settings" && <SettingsScreen />}
            </>
          )}

          {/* Receptionist Routes */}
          {role === "receptionist" && (
            <>
              {screen === "receptionist_dashboard" && (
                <ReceptionistDashboard
                  onNavigate={navigate}
                  userCentre="Aguda Lab"
                />
              )}
              {screen === "patients" && (
                <ReceptionistPatientsScreen
                  onNavigate={navigate}
                  setSelectedPatient={setSelectedPatient}
                  userCentre="Aguda Lab"
                />
              )}
              {screen === "patient_detail" && (
                <ReceptionistPatientDetailScreen
                  patient={selectedPatient}
                  onNavigate={navigate}
                />
              )}
              {screen === "create_order" && (
                <CreateOrderScreen
                  onNavigate={navigate}
                  initialPatient={orderInitialConfig?.patient}
                  startStep={orderInitialConfig?.startAtStep || 1}
                />
              )}
              {screen === "test_orders" && (
                <TestOrdersScreen
                  onNavigate={navigate}
                  userCentre="Aguda Lab"
                />
              )}
              {screen === "results" && (
                <ReceptionistResultsScreen userCentre="Aguda Lab" />
              )}
            </>
          )}

          {/* Operational Role Dashboards */}
          {role === "phlebotomist" && <PhlebotomistDashboard />}
          {role === "lab_tech" && <LabTechDashboard />}
          {role === "radiographer" && <RadiographerDashboard />}
        </main>
      </div>

      {/* Notifications Modal Popup */}
      {showNotifications && (
        <Modal
          title="System Notifications"
          onClose={() => setShowNotifications(false)}
        >
          <div className="space-y-3">
            <div className="p-3 bg-muted/40 rounded-lg text-sm">
              <p className="font-medium">New Order Created</p>
              <p className="text-xs text-muted-foreground">
                Order ORD-2026-0143 submitted at Aguda Lab.
              </p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg text-sm">
              <p className="font-medium">Result Pending Approval</p>
              <p className="text-xs text-muted-foreground">
                Chest X-Ray result ready for admin review.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
