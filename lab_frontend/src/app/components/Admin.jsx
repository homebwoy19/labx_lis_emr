// import React, { useState } from "react";
// import {
//   DollarSign,
//   TrendingUp,
//   Users,
//   CheckCircle,
//   Clock,
//   Building2,
//   ArrowRight,
//   Eye,
//   Plus,
//   Edit2,
//   XCircle,
//   Download,
//   Activity,
//   Settings,
// } from "lucide-react";
// import {
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   PieChart,
//   Pie,
//   Cell,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
// } from "recharts";
// import {
//   Card,
//   StatCard,
//   Table,
//   StatusBadge,
//   Badge,
//   Btn,
//   Select,
//   SearchBar,
//   Modal,
//   Alert,
//   FormField,
//   Input,
// } from "./UIComponents";
// import {
//   CENTRES,
//   USERS,
//   TEST_ORDERS,
//   AUDIT_LOGS,
//   revenueData,
//   testsByCategoryData,
//   testsByDayData,
//   PIE_COLORS,
// } from "./sharedData";

// export function DashboardScreen({ onNavigate }) {
//   return (
//     <div className="p-6 space-y-6">
//       <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
//         <StatCard
//           icon={DollarSign}
//           label="Total Revenue"
//           value="₦20.4M"
//           sub="All centres · All time"
//           color="bg-blue-500"
//         />
//         <StatCard
//           icon={TrendingUp}
//           label="Today's Revenue"
//           value="₦311,100"
//           sub="+12% vs yesterday"
//           color="bg-teal-500"
//         />
//         <StatCard
//           icon={Users}
//           label="Total Patients"
//           value="4,821"
//           sub="106 new this month"
//           color="bg-violet-500"
//         />
//         <StatCard
//           icon={CheckCircle}
//           label="Tests Completed"
//           value="247"
//           sub="This month"
//           color="bg-emerald-500"
//         />
//         <StatCard
//           icon={Clock}
//           label="Pending Tests"
//           value="18"
//           sub="Across all centres"
//           color="bg-amber-500"
//         />
//         <StatCard
//           icon={Building2}
//           label="Active Centres"
//           value="2 / 2"
//           sub="All online"
//           color="bg-rose-500"
//         />
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         <Card className="lg:col-span-2 p-5">
//           <div className="flex items-center justify-between mb-4">
//             <h3 className="text-sm font-semibold text-foreground">
//               Revenue Trend (6 months)
//             </h3>
//             <Select className="w-36 text-xs py-1">
//               <option>All Branches</option>
//               <option>Aguda Branch</option>
//               <option>Bode Thomas Branch</option>
//             </Select>
//           </div>
//           <ResponsiveContainer width="100%" height={220}>
//             <LineChart data={revenueData}>
//               <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
//               <XAxis
//                 dataKey="month"
//                 tick={{ fontSize: 11 }}
//                 stroke="var(--border)"
//               />
//               <YAxis
//                 tick={{ fontSize: 11 }}
//                 stroke="var(--border)"
//                 tickFormatter={(v) => `${(v / 20000).toFixed(0)}k`}
//               />
//               <Tooltip formatter={(v) => `₦${v.toLocaleString()}`} />
//               <Legend wrapperStyle={{ fontSize: 11 }} />
//               <Line
//                 dataKey="Aguda"
//                 stroke="#1a6bcc"
//                 strokeWidth={2}
//                 dot={false}
//               />
//               <Line
//                 dataKey="BodeThomas"
//                 stroke="#7c3aed"
//                 strokeWidth={2}
//                 dot={false}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         </Card>
//         <Card className="p-5">
//           <h3 className="text-sm font-semibold text-foreground mb-4">
//             Tests by Category
//           </h3>
//           <Select className="w-16 text-xs py-1">
//             <option>All Branches</option>
//             <option>Aguda Branch</option>
//             <option>Bode Thomas Branch</option>
//           </Select>
//           <ResponsiveContainer width="100%" height={220}>
//             <PieChart>
//               <Pie
//                 data={testsByCategoryData}
//                 cx="50%"
//                 cy="50%"
//                 innerRadius={55}
//                 outerRadius={85}
//                 dataKey="value"
//                 paddingAngle={3}
//               >
//                 {testsByCategoryData.map((_, i) => (
//                   <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//           <div className="mt-2 space-y-1">
//             {testsByCategoryData.map((d, i) => (
//               <div
//                 key={d.name}
//                 className="flex items-center justify-between text-xs"
//               >
//                 <div className="flex items-center gap-1.5">
//                   <span
//                     className="w-2 h-2 rounded-full"
//                     style={{ background: PIE_COLORS[i] }}
//                   />
//                   <span className="text-muted-foreground">{d.name}</span>
//                 </div>
//                 <span className="font-medium">{d.value}%</span>
//               </div>
//             ))}
//           </div>
//         </Card>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//         <Card className="p-5">
//           <h3 className="text-sm font-semibold text-foreground mb-4">
//             Tests This Week
//           </h3>
//           <ResponsiveContainer width="100%" height={180}>
//             <BarChart data={testsByDayData} barSize={24}>
//               <CartesianGrid
//                 strokeDasharray="3 3"
//                 stroke="var(--border)"
//                 vertical={false}
//               />
//               <CartesianGrid
//                 strokeDasharray=" 3"
//                 stroke="var(--border)"
//                 vertical={false}
//               />
//               <XAxis
//                 dataKey="day"
//                 tick={{ fontSize: 11 }}
//                 stroke="var(--border)"
//               />
//               <YAxis tick={{ fontSize: 11 }} stroke="var(--border)" />
//               <Tooltip />
//               <Bar dataKey="tests" fill="#1a6bcc" radius={[4, 4, 0, 0]} />
//               <Bar dataKey="tests" fill="#7c3aed" radius={[4, 4, 0, 0]} />
//               <Legend wrapperStyle={{ fontSize: 11 }} />
//               <Line
//                 dataKey="Aguda"
//                 stroke="#1a6bcc"
//                 strokeWidth={2}
//                 dot={false}
//               />
//               <Line
//                 dataKey="BodeThomas"
//                 stroke="#7c3aed"
//                 strokeWidth={2}
//                 dot={false}
//               />
//             </BarChart>
//           </ResponsiveContainer>
//         </Card>
//         <Card className="p-5">
//           <div className="flex items-center justify-between mb-4">
//             <h3 className="text-sm font-semibold text-foreground">
//               Centre Comparison
//             </h3>
//           </div>
//           <div className="space-y-3">
//             {CENTRES.map((c) => (
//               <div key={c.id} className="flex items-center gap-3">
//                 <div className="w-24 text-xs text-muted-foreground truncate">
//                   {c.name.replace("MedLab ", "")}
//                 </div>
//                 <div className="flex-1 bg-muted rounded-full h-2">
//                   <div
//                     className="h-2 rounded-full bg-primary"
//                     style={{ width: `${(c.patientsToday / 60) * 100}%` }}
//                   />
//                 </div>
//                 <div className="w-8 text-xs font-medium text-right">
//                   {c.patientsToday}
//                 </div>
//                 <StatusBadge status={c.status} />
//               </div>
//             ))}
//           </div>
//           <div className="mt-4 pt-3 border-t border-border">
//             <p className="text-xs text-muted-foreground">
//               Today's patient arrivals across centres
//             </p>
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// }

// export function UsersScreen() {
//   const [search, setSearch] = useState("");
//   const [showAdd, setShowAdd] = useState(false);
//   const [showDeactivate, setShowDeactivate] = useState(null);
//   const [alert, setAlert] = useState(null);
//   const filtered = USERS.filter(
//     (u) =>
//       u.name.toLowerCase().includes(search.toLowerCase()) ||
//       u.email.includes(search),
//   );
//   const roleBadge = {
//     admin: "danger",
//     receptionist: "info",
//     phlebotomist: "teal",
//     lab_tech: "warning",
//     radiographer: "success",
//   };
//   return (
//     <div className="p-6 space-y-4">
//       {alert && (
//         <Alert type="success" message={alert} onClose={() => setAlert(null)} />
//       )}
//       <div className="flex items-center justify-between gap-4">
//         <div className="w-80">
//           <SearchBar
//             value={search}
//             onChange={setSearch}
//             placeholder="Search users…"
//           />
//         </div>
//         <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}>
//           <Plus className="w-3.5 h-3.5" />
//           Add User
//         </Btn>
//       </div>
//       <Card>
//         <Table
//           headers={["Name", "Email", "Role", "Centre", "Status", "Actions"]}
//         >
//           {filtered.map((u) => (
//             <tr key={u.id} className="hover:bg-muted/30 transition-colors">
//               <td className="px-4 py-3">
//                 <div className="flex items-center gap-2">
//                   <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-primary">
//                     {u.name
//                       .split(" ")
//                       .map((n) => n[0])
//                       .slice(0, 2)
//                       .join("")}
//                   </div>
//                   <span className="text-sm font-medium">{u.name}</span>
//                 </div>
//               </td>
//               <td className="px-4 py-3 text-sm text-muted-foreground">
//                 {u.email}
//               </td>
//               <td className="px-4 py-3">
//                 <Badge variant={roleBadge[u.role]}>
//                   {u.role.replace("_", " ")}
//                 </Badge>
//               </td>
//               <td className="px-4 py-3 text-sm text-muted-foreground">
//                 {u.centre}
//               </td>
//               <td className="px-4 py-3">
//                 <StatusBadge status={u.status} />
//               </td>
//               <td className="px-4 py-3">
//                 <div className="flex gap-1">
//                   <Btn variant="ghost" size="sm">
//                     <Edit2 className="w-3.5 h-3.5" />
//                   </Btn>
//                   <Btn
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => setShowDeactivate(u)}
//                   >
//                     <XCircle className="w-3.5 h-3.5 text-red-400" />
//                   </Btn>
//                 </div>
//               </td>
//             </tr>
//           ))}
//         </Table>
//       </Card>

//       {showAdd && (
//         <Modal title="Add New User" onClose={() => setShowAdd(false)}>
//           <div className="space-y-4">
//             <div className="grid grid-cols-2 gap-3">
//               <FormField label="First Name" required>
//                 <Input placeholder="First name" />
//               </FormField>
//               <FormField label="Last Name" required>
//                 <Input placeholder="Last name" />
//               </FormField>
//             </div>
//             <FormField label="Email" required>
//               <Input type="email" placeholder="user@medlab.co.ke" />
//             </FormField>
//             <FormField label="Role" required>
//               <Select>
//                 <option>receptionist</option>
//                 <option>phlebotomist</option>
//                 <option>lab_tech</option>
//                 <option>radiographer</option>
//                 <option>admin</option>
//               </Select>
//             </FormField>
//             <FormField label="Centre" required>
//               <Select>
//                 {CENTRES.map((c) => (
//                   <option key={c.id}>{c.name}</option>
//                 ))}
//               </Select>
//             </FormField>
//             <FormField label="Temporary Password" required>
//               <Input type="password" placeholder="••••••••" />
//             </FormField>
//             <div className="flex justify-end gap-3">
//               <Btn variant="secondary" onClick={() => setShowAdd(false)}>
//                 Cancel
//               </Btn>
//               <Btn
//                 variant="primary"
//                 onClick={() => {
//                   setShowAdd(false);
//                   setAlert(
//                     "User created successfully. A welcome email has been sent.",
//                   );
//                 }}
//               >
//                 Create User
//               </Btn>
//             </div>
//           </div>
//         </Modal>
//       )}

//       {showDeactivate && (
//         <Modal title="Deactivate User" onClose={() => setShowDeactivate(null)}>
//           <div className="space-y-4">
//             <Alert
//               type="warning"
//               message={`You are about to deactivate ${showDeactivate.name}. They will lose access immediately.`}
//             />
//             <p className="text-sm text-muted-foreground">
//               This action can be reversed by reactivating the user from the
//               users table.
//             </p>
//             <div className="flex justify-end gap-3">
//               <Btn variant="secondary" onClick={() => setShowDeactivate(null)}>
//                 Cancel
//               </Btn>
//               <Btn
//                 variant="danger"
//                 onClick={() => {
//                   setShowDeactivate(null);
//                   setAlert(`${showDeactivate.name} has been deactivated.`);
//                 }}
//               >
//                 Deactivate
//               </Btn>
//             </div>
//           </div>
//         </Modal>
//       )}
//     </div>
//   );
// }

// export function CentresScreen() {
//   const [showAdd, setShowAdd] = useState(false);
//   return (
//     <div className="p-6 space-y-4">
//       <div className="flex justify-end">
//         <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}>
//           <Plus className="w-3.5 h-3.5" />
//           Add Centre
//         </Btn>
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {CENTRES.map((c) => (
//           <Card key={c.id} className="p-5">
//             <div className="flex items-start justify-between mb-3">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
//                   <Building2 className="w-5 h-5 text-primary" />
//                 </div>
//                 <div>
//                   <h3 className="text-sm font-semibold">{c.name}</h3>
//                   <p className="text-xs text-muted-foreground flex items-center gap-1">
//                     {c.city}
//                   </p>
//                 </div>
//               </div>
//               <StatusBadge status={c.status} />
//             </div>
//             <div className="space-y-1.5 text-sm">
//               <div className="flex items-center gap-2 text-muted-foreground">
//                 {c.phone}
//               </div>
//               <div className="flex items-center gap-2 text-muted-foreground">
//                 {c.email}
//               </div>
//               <div className="flex items-center gap-2 text-muted-foreground">
//                 {c.manager}
//               </div>
//             </div>
//             <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
//               <div className="text-sm">
//                 <span className="font-semibold text-primary">
//                   {c.patientsToday}
//                 </span>{" "}
//                 <span className="text-muted-foreground">patients today</span>
//               </div>
//               <div className="flex gap-1">
//                 <Btn variant="ghost" size="sm">
//                   <Edit2 className="w-3.5 h-3.5" />
//                 </Btn>
//                 <Btn variant="ghost" size="sm">
//                   <Settings className="w-3.5 h-3.5" />
//                 </Btn>
//               </div>
//             </div>
//           </Card>
//         ))}
//       </div>
//       {showAdd && (
//         <Modal title="Add Centre" onClose={() => setShowAdd(false)}>
//           <div className="space-y-4">
//             <FormField label="Centre Name" required>
//               <Input placeholder="e.g. MedLab Karen" />
//             </FormField>
//             <div className="grid grid-cols-2 gap-3">
//               <FormField label="City" required>
//                 <Input placeholder="e.g. Nairobi" />
//               </FormField>
//               <FormField label="Phone" required>
//                 <Input placeholder="+254 20 XXX XXXX" />
//               </FormField>
//             </div>
//             <FormField label="Email">
//               <Input type="email" placeholder="centre@medlab.co.ke" />
//             </FormField>
//             <FormField label="Manager">
//               <Select>
//                 {USERS.map((u) => (
//                   <option key={u.id}>{u.name}</option>
//                 ))}
//               </Select>
//             </FormField>
//             <div className="flex justify-end gap-3">
//               <Btn variant="secondary" onClick={() => setShowAdd(false)}>
//                 Cancel
//               </Btn>
//               <Btn variant="primary">Create Centre</Btn>
//             </div>
//           </div>
//         </Modal>
//       )}
//     </div>
//   );
// }

// export function AuditLogsScreen() {
//   const [search, setSearch] = useState("");
//   const filtered = AUDIT_LOGS.filter(
//     (a) =>
//       a.user.toLowerCase().includes(search.toLowerCase()) ||
//       a.action.includes(search) ||
//       a.entity.includes(search),
//   );
//   return (
//     <div className="p-6 space-y-4">
//       <div className="flex items-center gap-4">
//         <div className="w-80">
//           <SearchBar
//             value={search}
//             onChange={setSearch}
//             placeholder="Search logs…"
//           />
//         </div>
//         <Select className="w-40">
//           <option>All Actions</option>
//           <option>Created</option>
//           <option>Updated</option>
//           <option>Deleted</option>
//           <option>Uploaded</option>
//         </Select>
//         <Select className="w-40">
//           <option>All Centres</option>
//           {CENTRES.map((c) => (
//             <option key={c.id}>{c.name}</option>
//           ))}
//         </Select>
//       </div>
//       <Card>
//         <Table
//           headers={[
//             "User",
//             "Action",
//             "Entity",
//             "Entity ID",
//             "Centre",
//             "Date",
//             "Time",
//           ]}
//         >
//           {filtered.map((a) => (
//             <tr key={a.id} className="hover:bg-muted/30 transition-colors">
//               <td className="px-4 py-3 text-sm font-medium">{a.user}</td>
//               <td className="px-4 py-3">
//                 <Badge
//                   variant={
//                     a.action === "Created"
//                       ? "success"
//                       : a.action === "Deleted"
//                         ? "danger"
//                         : a.action === "Uploaded"
//                           ? "teal"
//                           : "info"
//                   }
//                 >
//                   {a.action}
//                 </Badge>
//               </td>
//               <td className="px-4 py-3 text-sm">{a.entity}</td>
//               <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
//                 {a.entityId}
//               </td>
//               <td className="px-4 py-3 text-sm text-muted-foreground">
//                 {a.centre}
//               </td>
//               <td className="px-4 py-3 text-sm text-muted-foreground">
//                 {a.date}
//               </td>
//               <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
//                 {a.time}
//               </td>
//             </tr>
//           ))}
//         </Table>
//       </Card>
//     </div>
//   );
// }

// export function ReportsScreen() {
//   const [tab, setTab] = useState("revenue");
//   const tabs = [
//     { id: "revenue", label: "Revenue" },
//     { id: "patients", label: "Patients" },
//     { id: "staff", label: "Staff Performance" },
//     { id: "centres", label: "Centre Comparison" },
//   ];
//   return (
//     <div className="p-6 space-y-5">
//       <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
//         {tabs.map((t) => (
//           <button
//             key={t.id}
//             onClick={() => setTab(t.id)}
//             className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>

//       {tab === "revenue" && (
//         <div className="space-y-4">
//           <div className="grid grid-cols-3 gap-4">
//             <StatCard
//               icon={DollarSign}
//               label="Total Revenue (YTD)"
//               value="₦2.4M"
//               color="bg-blue-500"
//             />
//             <StatCard
//               icon={TrendingUp}
//               label="Growth vs Last Year"
//               value="+18.4%"
//               color="bg-teal-500"
//             />
//             <StatCard
//               icon={Activity}
//               label="Avg. Monthly Revenue"
//               value="₦392K"
//               color="bg-violet-500"
//             />
//           </div>
//           <Card className="p-5">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-sm font-semibold">
//                 Monthly Revenue by Centre
//               </h3>
//               <div className="flex gap-2">
//                 <Btn variant="secondary" size="sm">
//                   <Download className="w-3.5 h-3.5" />
//                   Export CSV
//                 </Btn>
//               </div>
//             </div>
//             <ResponsiveContainer width="100%" height={280}>
//               <BarChart data={revenueData}>
//                 <CartesianGrid
//                   strokeDasharray="3 3"
//                   stroke="var(--border)"
//                   vertical={false}
//                 />
//                 <XAxis
//                   dataKey="month"
//                   tick={{ fontSize: 11 }}
//                   stroke="var(--border)"
//                 />
//                 <YAxis
//                   tick={{ fontSize: 11 }}
//                   stroke="var(--border)"
//                   tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
//                 />
//                 <Tooltip formatter={(v) => `₦${v.toLocaleString()}`} />
//                 <Legend wrapperStyle={{ fontSize: 11 }} />
//                 <Bar
//                   dataKey="Aguda"
//                   fill="#1a6bcc"
//                   radius={[4, 4, 0, 0]}
//                   stackId="a"
//                 />
//                 <Bar
//                   dataKey="Bode Thomas"
//                   fill="#7c3aed"
//                   radius={[4, 4, 0, 0]}
//                   stackId="b"
//                 />
//               </BarChart>
//             </ResponsiveContainer>
//           </Card>
//         </div>
//       )}

//       {tab === "patients" && (
//         <Card className="p-5">
//           <h3 className="text-sm font-semibold mb-4">
//             Patient Registration Trend
//           </h3>
//           <Table
//             headers={["Centre", "New Patients", "Total Patients", "% Growth"]}
//           >
//             {CENTRES.map((c) => (
//               <tr key={c.id} className="hover:bg-muted/30">
//                 <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
//                 <td className="px-4 py-3 text-sm">{c.patientsToday * 8}</td>
//                 <td className="px-4 py-3 text-sm">{c.patientsToday * 42}</td>
//                 <td className="px-4 py-3">
//                   <Badge variant="success">
//                     +{(Math.random() * 20 + 5).toFixed(1)}%
//                   </Badge>
//                 </td>
//               </tr>
//             ))}
//           </Table>
//         </Card>
//       )}

//       {tab === "staff" && (
//         <Card className="p-5">
//           <h3 className="text-sm font-semibold mb-4">
//             Staff Performance This Month
//           </h3>
//           <Table
//             headers={[
//               "Staff Member",
//               "Role",
//               "Tests Processed",
//               "Orders Created",
//               "Avg TAT",
//             ]}
//           >
//             {USERS.map((u) => (
//               <tr key={u.id} className="hover:bg-muted/30">
//                 <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
//                 <td className="px-4 py-3">
//                   <Badge variant="info">{u.role.replace("_", " ")}</Badge>
//                 </td>
//                 <td className="px-4 py-3 text-sm">
//                   {Math.floor(Math.random() * 80 + 20)}
//                 </td>
//                 <td className="px-4 py-3 text-sm">
//                   {Math.floor(Math.random() * 50 + 10)}
//                 </td>
//                 <td className="px-4 py-3 text-sm">
//                   {(Math.random() * 3 + 2).toFixed(1)} hrs
//                 </td>
//               </tr>
//             ))}
//           </Table>
//         </Card>
//       )}

//       {tab === "centres" && (
//         <Card className="p-5">
//           <h3 className="text-sm font-semibold mb-4">
//             Centre Performance Comparison
//           </h3>
//           <ResponsiveContainer width="100%" height={280}>
//             <BarChart
//               data={CENTRES.map((c) => ({
//                 name: c.name.replace("MedLab ", ""),
//                 patients: c.patientsToday,
//                 revenue: c.patientsToday * 800,
//               }))}
//               barSize={32}
//             >
//               <CartesianGrid
//                 strokeDasharray="3 3"
//                 stroke="var(--border)"
//                 vertical={false}
//               />
//               <XAxis
//                 dataKey="name"
//                 tick={{ fontSize: 11 }}
//                 stroke="var(--border)"
//               />
//               <YAxis tick={{ fontSize: 11 }} stroke="var(--border)" />
//               <Tooltip />
//               <Bar
//                 dataKey="patients"
//                 fill="#1a6bcc"
//                 radius={[4, 4, 0, 0]}
//                 name="Patients Today"
//               />
//             </BarChart>
//           </ResponsiveContainer>
//         </Card>
//       )}
//     </div>
//   );
// }

// export function SettingsScreen() {
//   return (
//     <div className="p-6 space-y-5 max-w-2xl">
//       <Card className="p-5 space-y-4">
//         <h3 className="text-sm font-semibold border-b border-border pb-2">
//           General Settings
//         </h3>
//         <FormField label="Organisation Name">
//           <Input defaultValue="Foundation Medical Diagnostic Lab" />
//         </FormField>
//         <FormField label="Default Currency">
//           <Select>
//             <option>N — Nigerian Naira</option>
//             <option>USD — US Dollar</option>
//           </Select>
//         </FormField>
//       </Card>
//       <Card className="p-5 space-y-4">
//         <h3 className="text-sm font-semibold border-b border-border pb-2">
//           Notification Settings
//         </h3>
//         {[
//           "Email alerts for new orders",
//           "SMS on sample collection",
//           "Notify patient on result ready",
//           "Daily revenue summary to admin",
//         ].map((s) => (
//           <div key={s} className="flex items-center justify-between">
//             <span className="text-sm">{s}</span>
//             <button className="w-10 h-5 rounded-full bg-primary transition-colors relative flex-shrink-0">
//               <span className="w-4 h-4 rounded-full bg-white absolute right-0.5 top-0.5 shadow-sm" />
//             </button>
//           </div>
//         ))}
//       </Card>
//       <div className="flex justify-end">
//         <Btn variant="primary">
//           <CheckCircle className="w-3.5 h-3.5" />
//           Save Settings
//         </Btn>
//       </div>
//     </div>
//   );
// }

import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
  Edit2,
  XCircle,
  FileText,
  Trash2,
  Download,
  Activity,
  Settings,
  Bell,
  Check,
  LeafyGreen,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  StatCard,
  Table,
  StatusBadge,
  Badge,
  Btn,
  Select,
  SearchBar,
  Pagination,
  Modal,
  Alert,
  FormField,
  Input,
} from "./UIComponents";
import {
  CENTRES,
  PATIENTS,
  USERS,
  PAYMENTS,
  RESULTS,
  TESTS,
  AUDIT_LOGS,
  TEST_ORDERS,
  revenueData,
  testsByCategoryData,
  testsByDayData,
  PIE_COLORS,
} from "./sharedData";

// Helper: Calculate exact last 6 months ending at current month
const getLast6Months = () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const result = [];

  for (let i = 5; i >= 0; i--) {
    let idx = (currentMonthIdx - i + 12) % 12;
    result.push(months[idx]);
  }
  return result;
};

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
export function DashboardScreen({ onNavigate }) {
  const [revenueBranch, setRevenueBranch] = useState("all");
  const [categoryBranch, setCategoryBranch] = useState("all");

  const last6Months = useMemo(() => getLast6Months(), []);

  // Filter 6-month revenue trend dynamically based on login date & branch selection
  const filteredRevenueData = useMemo(() => {
    return last6Months.map((month) => {
      const match = revenueData.find((r) => r.month === month) || {
        month,
        Aguda: 1200000,
        BodeThomas: 950000,
      };

      if (revenueBranch === "aguda") {
        return { month, Aguda: match.Aguda };
      }
      if (revenueBranch === "bodethomas") {
        return { month, BodeThomas: match.BodeThomas };
      }
      return { month, Aguda: match.Aguda, BodeThomas: match.BodeThomas };
    });
  }, [revenueBranch, last6Months]);

  // Dynamic pie chart category data based on selected branch
  const filteredCategoryData = useMemo(() => {
    if (categoryBranch === "aguda") {
      return testsByCategoryData.map((d) => ({
        ...d,
        value: Math.round(d.value * 0.55),
      }));
    }
    if (categoryBranch === "bodethomas") {
      return testsByCategoryData.map((d) => ({
        ...d,
        value: Math.round(d.value * 0.45),
      }));
    }
    return testsByCategoryData;
  }, [categoryBranch]);

  // Daily test carried out by centre (last 7 days)
  const filteredTestsByDayData = useMemo(() => {
    return testsByDayData.map((d) => ({
      ...d,
      Aguda: d.Aguda || Math.floor(Math.random() * 20 + 10),
      BodeThomas: d.BodeThomas || Math.floor(Math.random() * 15 + 5),
    }));
  }, []);

  // Center Comparison data on the day
  const centreComparison = useMemo(() => {
    return CENTRES.map((c) => ({
      ...c,
      patientsToday: c.patientsToday || (c.id === "1" ? 42 : 35),
    }));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value="₦20.4M"
          sub="All centres · All time"
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Today's Revenue"
          value="₦311,100"
          sub="+12% vs yesterday"
          color="bg-teal-500"
        />
        <StatCard
          icon={Users}
          label="Total Patients"
          value="4,821"
          sub="106 new this month"
          color="bg-violet-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Tests Completed"
          value="247"
          sub="This month"
          color="bg-emerald-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Tests"
          value="18"
          sub="Across all centres"
          color="bg-amber-500"
        />
        <StatCard
          icon={Building2}
          label="Active Centres"
          value="2 / 2"
          sub="All online"
          color="bg-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Revenue Trend (6 Months ending today) */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Revenue Trend (Last 6 Months)
            </h3>
            {/* Reduced width select */}
            <Select
              className="w-28 text-xs py-1"
              value={revenueBranch}
              onChange={(e) => setRevenueBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value="aguda">Aguda</option>
              <option value="bodethomas">Bode Thomas</option>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={filteredRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#333333" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#333333"
                tickFormatter={(v) => `₦${(v / 1000000).toFixed(0)}m`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", color: "#000000" }}
                formatter={(v) => `₦${Number(v).toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#334155" }} />
              {(revenueBranch === "all" || revenueBranch === "aguda") && (
                <Line
                  name="Aguda"
                  dataKey="Aguda"
                  stroke="#1a6bcc"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {(revenueBranch === "all" || revenueBranch === "bodethomas") && (
                <Line
                  name="Bode Thomas"
                  dataKey="BodeThomas"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* 2. Tests by Category */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Tests by Category
            </h3>
            <Select
              className="w-28 text-xs py-1"
              value={categoryBranch}
              onChange={(e) => setCategoryBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value="aguda">Aguda</option>
              <option value="bodethomas">Bode Thomas</option>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={filteredCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                paddingAngle={3}
              >
                {filteredCategoryData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", color: "#000000" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 space-y-1">
            {filteredCategoryData.map((d, i) => (
              <div
                key={d.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">{d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 3. Tests This Week by Center */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Tests Completed This Week by Center
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={filteredTestsByDayData}
              barSize={16}
              margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#333333"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#475569" }}
                stroke="#333333"
              />
              <YAxis
                width={35}
                tick={{ fontSize: 11, fill: "#475569" }}
                stroke="#333333"
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  borderRadius: "8px",
                  borderColor: "#cbd5e1",
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  color: "#334155",
                  paddingTop: "8px",
                }}
              />
              <Bar
                name="Aguda"
                dataKey="Aguda"
                fill="#1a6bcc"
                radius={[4, 4, 0, 0]}
                minPointSize={2}
              />
              <Bar
                name="Bode Thomas"
                dataKey="BodeThomas"
                fill="#7c3aed"
                radius={[4, 4, 0, 0]}
                minPointSize={2}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 4. Center Comparison (Daily Tests / Patient Flow) */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Center Comparison (Daily Tests & Patients)
            </h3>
          </div>
          <div className="space-y-4">
            {centreComparison.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-muted-foreground">
                    {c.patientsToday} tests / patients today
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${
                        c.name.includes("Aguda")
                          ? "bg-blue-600"
                          : "bg-purple-600"
                      }`}
                      style={{
                        width: `${Math.min((c.patientsToday / 60) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Real-time daily lab test volume across all operating diagnostic
              centers.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN PATIENTS
// ============================================================================
export function PatientsScreen({
  onNavigate,
  setSelectedPatient,
  userCentre = "Aguda Lab",
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [alert, setAlert] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const perPage = 10;

  // Filter patients by receptionist center
  const centerPatients = PATIENTS.filter((p) => p.centre === userCentre);
  const filtered = centerPatients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.pid.includes(search) ||
      p.phone.includes(search),
  );

  function handleCreate() {
    setShowCreate(false);
    setAlert(true);
    setTimeout(() => setAlert(false), 3000);
  }

  function handleEditPatient() {
    setEditingPatient(false);
    setAlert(true);
    settimeout(() => setAlert(false), 3000);
  }

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type="success"
          message="Patient created successfully."
          onClose={() => setAlert(false)}
        />
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search patients…"
          />
        </div>
        <div className="flex gap-2">
          <Btn
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Patient
          </Btn>
        </div>
      </div>

      <Card>
        <Table
          headers={[
            "Patient ID",
            "Name",
            "DOB",
            "Gender",
            "Phone",
            "Center",
            "Last Visit",
            "Tests",
            "Actions",
          ]}
        >
          {filtered.slice((page - 1) * perPage, page * perPage).map((p) => (
            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {p.pid}
              </td>
              <td
                className="px-4 py-3 text-sm font-medium cursor-pointer hover:text-primary"
                onClick={() => {
                  setSelectedPatient(p);
                  onNavigate("patient_detail");
                }}
              >
                {p.name}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.dob}
              </td>
              <td className="px-4 py-3 text-sm">{p.gender}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.phone}
              </td>
              <td className="px-4 py-3 text-sm">{p.centre}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.lastVisit}
              </td>
              <td className="px-4 py-3 text-sm">{p.tests}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(p);
                      onNavigate("patient_detail");
                    }}
                    className="cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 cursor-pointer" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPatient(p)}
                    className="cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Btn>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={page}
          total={filtered.length}
          perPage={perPage}
          onChange={setPage}
        />
      </Card>
      {/* create patient Modal */}
      {showCreate && (
        <Modal
          title="Create New Patient"
          onClose={() => setShowCreate(false)}
          width="max-w-2xl"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <Input placeholder="e.g. Amina" />
            </FormField>
            <FormField label="Last Name" required>
              <Input placeholder="e.g. Hassan" />
            </FormField>
            <FormField label="Date of Birth" required>
              <Input type="date" />
            </FormField>
            <FormField label="Gender" required>
              <Select>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </Select>
            </FormField>
            <FormField label="Phone Number" required>
              <Input placeholder="+254 7XX XXX XXX" />
            </FormField>
            <FormField label="Email">
              <Input type="email" placeholder="patient@email.com" />
            </FormField>
            <FormField label="Centre" required>
              <Select>
                {CENTRES.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
            <div className="col-span-2">
              <FormField label="Address">
                <Input placeholder="Street, City" />
              </FormField>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Btn variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleCreate}>
              Create Patient
            </Btn>
          </div>
        </Modal>
      )}
      {/* Edit Patient Modal */}
      {editingPatient && (
        <Modal
          title="Edit Patient Information"
          onClose={() => setEditingPatient(null)}
          width="max-w-2xl"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <Input placeholder="e.g. Amina" />
            </FormField>
            <FormField label="Last Name" required>
              <Input placeholder="e.g. Hassan" />
            </FormField>
            <FormField label="Date of Birth" required>
              <Input type="date" />
            </FormField>
            <FormField label="Gender" required>
              <Select>
                <option>Female</option>
                <option>Male</option>
              </Select>
            </FormField>
            <FormField label="Phone Number" required>
              <Input placeholder="+254 7XX XXX XXX" />
            </FormField>
            <FormField label="Email">
              <Input type="email" placeholder="patient@email.com" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Address">
                <Input placeholder="Street, City" />
              </FormField>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Btn variant="secondary" onClick={() => setEditingPatient(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleEditPatient}>
              Save Changes
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN PATIENTS DETAILS
// ============================================================================
export function PatientDetailScreen({ patient, onNavigate }) {
  if (!patient)
    return (
      <div className="p-6 text-muted-foreground">No patient selected.</div>
    );
  const orders = TEST_ORDERS.filter((o) => o.patientId === patient.id);
  return (
    <div className="p-6 space-y-5">
      <button
        onClick={() => onNavigate("patients")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Patients
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Header: Avatar, Name, PID */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-lg font-semibold text-primary">
                {patient.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <h2 className="text-base font-semibold leading-tight">
                  {patient.name}
                </h2>
                <p className="text-xs font-mono text-muted-foreground">
                  {patient.pid}
                </p>
              </div>
            </div>
            {/* Details List */}
            <div className="space-y-2 text-sm pt-2">
              {[
                ["DOB", patient.dob],
                ["Gender", patient.gender],
                ["Phone", patient.phone],
                ["Email", patient.email],
                ["Centre", patient.centre],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Action Buttons at Bottom */}
          <div className="flex gap-2 pt-3 border-t border-border">
            <Btn
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() =>
                onNavigate("create_order", { patient, startAtStep: 2 })
              }
            >
              <Plus className="w-3 h-3 cursor-pointer" />
              New Order
            </Btn>
            <Btn variant="secondary" size="sm" className="flex-1">
              <Edit2 className="w-3 h-3 cursor-pointer" />
              Edit
            </Btn>
          </div>
        </Card>
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Order History</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders found.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-primary">
                          {o.orderId}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {o.date}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {o.items.map((item) => (
                          <span
                            key={item.id}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full"
                          >
                            {item.testName}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="text-xs font-medium">
                          {o.totalAmount.toLocaleString()}
                        </span>
                        <StatusBadge status={o.paymentStatus} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Results</h3>
            <div className="space-y-2">
              {RESULTS.filter((r) =>
                orders.some((o) => o.orderId === r.orderId),
              ).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 rounded border border-border text-sm"
                >
                  <span>{r.testName}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === "ready" && (
                      <Btn variant="ghost" size="sm">
                        <Download className="w-3.5 h-3.5 cursor-pointer" />
                      </Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN TEST ORDERS
// ============================================================================
export function AdminTestOrders({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [alert, setAlert] = useState(null);
  const perPage = 5;

  const filtered = TEST_ORDERS.filter(
    (o) =>
      o.patientName.toLowerCase().includes(search.toLowerCase()) ||
      o.orderId.includes(search),
  );

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert type="success" message={alert} onClose={() => setAlert(null)} />
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search orders…"
          />
        </div>
      </div>
      <Card>
        <Table
          headers={[
            "Order ID",
            "Patient",
            "Centre",
            "Items",
            "Total",
            "Payment",
            "Date",
            "Actions",
          ]}
        >
          {filtered.slice((page - 1) * perPage, page * perPage).map((o) => (
            <tr key={o.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {o.orderId}
              </td>
              <td className="px-4 py-3 text-sm font-medium">{o.patientName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {o.centre || "Aguda Lab"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {o.items.map((it) => (
                    <StatusBadge key={it.id} status={it.status} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {o.totalAmount.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={o.paymentStatus} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {o.date}
              </td>
              <td className="px-4 py-3">
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrder(o)}
                >
                  <Eye className="w-3.5 h-3.5" />
                </Btn>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={page}
          total={filtered.length}
          perPage={perPage}
          onChange={setPage}
        />
      </Card>

      {/* Result View & Approval Modal */}
      {selectedOrder && (
        <Modal
          title={`Result Approval — ${selectedOrder.orderId}`}
          onClose={() => setSelectedOrder(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm bg-muted/40 p-3 rounded-lg">
              <p>
                <strong>Patient:</strong> {selectedOrder.patientName}
              </p>
              <p>
                <strong>Centre:</strong> {selectedOrder.centre || "Aguda Lab"}
              </p>
              <p>
                <strong>Date:</strong> {selectedOrder.date}
              </p>
              <p>
                <strong>Status:</strong> {selectedOrder.paymentStatus}
              </p>
            </div>
            <div className="border border-border p-4 rounded-lg bg-card">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Test Findings
              </h4>
              {selectedOrder.items.map((it) => (
                <div
                  key={it.id}
                  className="flex justify-between text-sm py-1 border-b border-border last:border-0"
                >
                  <span>{it.testName}</span>
                  <StatusBadge status={it.status} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn
                variant="danger"
                onClick={() => {
                  setAlert(`Result for ${selectedOrder.orderId} cancelled.`);
                  setSelectedOrder(null);
                }}
              >
                Cancel Result
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setAlert(
                    `Result for ${selectedOrder.orderId} approved successfully.`,
                  );
                  setSelectedOrder(null);
                }}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve Result
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN RESULTS
// ============================================================================
export function AdminResultsScreen() {
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);

  const filtered = RESULTS.filter(
    (r) =>
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r.orderId.includes(search),
  );

  return (
    <div className="p-6 space-y-4">
      <div className="w-80">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search results…"
        />
      </div>
      <Card>
        <Table
          headers={[
            "Order ID",
            "Patient",
            "Centre",
            "Test",
            "Date",
            "Status",
            "Actions",
          ]}
        >
          {filtered.map((r) => {
            const displayStatus = r.status === "ready" ? "ready" : "pending";
            return (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-primary">
                  {r.orderId}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {r.patientName}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {r.centre}
                </td>
                <td className="px-4 py-3 text-sm">{r.testName}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {r.date}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={displayStatus} />
                </td>
                <td className="px-4 py-3">
                  <Btn variant="ghost" size="sm" onClick={() => setPreview(r)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Btn>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {preview && (
        <Modal title="Result Details" onClose={() => setPreview(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Patient</p>
                <p className="font-medium">{preview.patientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Order</p>
                <p className="font-medium">{preview.orderId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Test</p>
                <p className="font-medium">{preview.testName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Centre</p>
                <p className="font-medium">{preview.centre}</p>
              </div>
            </div>
            <div className="h-40 bg-muted rounded-lg flex items-center justify-center border border-border">
              <p className="text-sm text-muted-foreground">
                PDF Result Document
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN PAYMENTS
// ============================================================================
export function AdminPaymentsScreen() {
  const [search, setSearch] = useState("");
  const completedPayments = PAYMENTS.filter((p) => p.status === "completed");

  const filtered = completedPayments.filter(
    (p) =>
      p.patientName.toLowerCase().includes(search.toLowerCase()) ||
      p.orderId.includes(search),
  );

  return (
    <div className="p-6 space-y-5">
      <div className="w-80">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search payments…"
        />
      </div>
      <Card>
        <Table
          headers={[
            "Order ID",
            "Patient",
            "Centre",
            "Amount",
            "Method",
            "Status",
            "Date",
          ]}
        >
          {filtered.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {p.orderId}
              </td>
              <td className="px-4 py-3 text-sm font-medium">{p.patientName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.centre}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {p.amount.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <Badge variant="neutral">{p.method}</Badge>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.date}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

// ============================================================================
// ADMIN USERS
// ============================================================================
export function UsersScreen() {
  const [users, setUsers] = useState(USERS);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(null);
  const [alert, setAlert] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const roleBadge = {
    Admin: "danger",
    Receptionist: "info",
    Phlebotomist: "teal",
    Labtech: "warning",
    Radiographer: "success",
  };

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert type="success" message={alert} onClose={() => setAlert(null)} />
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search users…"
          />
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add User
        </Btn>
      </div>
      <Card>
        <Table
          headers={["Name", "Email", "Role", "Centre", "Status", "Actions"]}
        >
          {filtered.map((u) => (
            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-primary">
                    {u.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <span className="text-sm font-medium">{u.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {u.email}
              </td>
              <td className="px-4 py-3">
                <Badge variant={roleBadge[u.role] || "info"}>
                  {u.role ? u.role.replace("_", " ") : "staff"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {u.centre}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={u.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingUser(u)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeactivate(u)}
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  </Btn>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      {editingUser && (
        <Modal
          title={
            editingUser.status === "inactive"
              ? "Reactivate / Edit User"
              : "Edit User Information"
          }
          onClose={() => setEditingUser(null)}
        >
          <div className="space-y-4">
            <FormField label="Full Name" required>
              <Input
                value={editingUser.name}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, name: e.target.value })
                }
              />
            </FormField>
            <FormField label="Email" required>
              <Input
                type="email"
                value={editingUser.email}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, email: e.target.value })
                }
              />
            </FormField>
            <FormField label="Role" required>
              <Select
                value={editingUser.role}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, role: e.target.value })
                }
              >
                <option value="receptionist">Receptionist</option>
                <option value="phlebotomist">Phlebotomist</option>
                <option value="lab_tech">Lab Tech</option>
                <option value="radiographer">Radiographer</option>
                <option value="admin">Admin</option>
              </Select>
            </FormField>
            <FormField label="Centre" required>
              <Select
                value={editingUser.centre}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, centre: e.target.value })
                }
              >
                {CENTRES.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Button dynamic rendering depending on status */}
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" onClick={() => setEditingUser(null)}>
                Cancel
              </Btn>
              {editingUser.status === "inactive" ? (
                <Btn
                  variant="primary"
                  onClick={() => {
                    setUsers((prev) =>
                      prev.map((u) =>
                        u.id === editingUser.id
                          ? { ...editingUser, status: "active" }
                          : u,
                      ),
                    );
                    setEditingUser(null);
                    setAlert(
                      `${editingUser.name} has been reactivated successfully.`,
                    );
                  }}
                >
                  Reactivate User
                </Btn>
              ) : (
                <Btn
                  variant="primary"
                  onClick={() => {
                    setUsers((prev) =>
                      prev.map((u) =>
                        u.id === editingUser.id ? editingUser : u,
                      ),
                    );
                    setEditingUser(null);
                    setAlert("User information updated.");
                  }}
                >
                  Update User
                </Btn>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" required>
                <Input placeholder="First name" />
              </FormField>
              <FormField label="Last Name" required>
                <Input placeholder="Last name" />
              </FormField>
            </div>
            <FormField label="Email" required>
              <Input type="email" placeholder="user@medlab.co.ke" />
            </FormField>
            <FormField label="Role" required>
              <Select>
                <option>Receptionist</option>
                <option>Phlebotomist</option>
                <option>Labtech</option>
                <option>Radiographer</option>
                <option>Admin</option>
              </Select>
            </FormField>
            <FormField label="Centre" required>
              <Select>
                {CENTRES.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Temporary Password" required>
              <Input type="password" placeholder="••••••••" />
            </FormField>
            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setShowAdd(false);
                  setAlert("User created successfully.");
                }}
              >
                Create User
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {showDeactivate && (
        <Modal title="Deactivate User" onClose={() => setShowDeactivate(null)}>
          <div className="space-y-4">
            <Alert
              type="warning"
              message={`You are about to deactivate ${showDeactivate.name}. They will lose access immediately.`}
            />
            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setShowDeactivate(null)}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                onClick={() => {
                  setUsers((prev) =>
                    prev.map((u) =>
                      u.id === showDeactivate.id
                        ? { ...u, status: "inactive" }
                        : u,
                    ),
                  );
                  setShowDeactivate(null);
                  setAlert(`${showDeactivate.name} has been deactivated.`);
                }}
              >
                Deactivate
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN CENTERS
// ============================================================================
export function CentresScreen() {
  const [centresList, setCentresList] = useState(CENTRES);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCentre, setEditingCentre] = useState(null);
  const [settingsCentre, setSettingsCentre] = useState(null);
  const [alert, setAlert] = useState(null);

  // Center Settings State
  const [centreSettings, setCentreSettings] = useState({
    testApprovalNotif: true,
    newOrderNotif: true,
  });

  const handleSaveCentreEdit = (e) => {
    e.preventDefault();
    setCentresList((prev) =>
      prev.map((c) => (c.id === editingCentre.id ? editingCentre : c)),
    );
    setEditingCentre(null);
    setAlert("Centre details updated successfully.");
  };

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert type="success" message={alert} onClose={() => setAlert(null)} />
      )}
      <div className="flex justify-end">
        <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add Centre
        </Btn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {centresList.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {c.city}
                  </p>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                Phone: {c.phone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                Email: {c.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                Manager: {c.manager}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div className="text-sm">
                <span className="font-semibold text-primary">
                  {c.patientsToday || 35}
                </span>{" "}
                <span className="text-muted-foreground">patients today</span>
              </div>
              <div className="flex gap-1">
                {/* Edit Center Information */}
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCentre({ ...c })}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Btn>
                {/* Center Settings Modal */}
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsCentre(c)}
                >
                  <Settings className="w-3.5 h-3.5" />
                </Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Center Modal */}
      {editingCentre && (
        <Modal
          title="Edit Centre Information"
          onClose={() => setEditingCentre(null)}
        >
          <form onSubmit={handleSaveCentreEdit} className="space-y-4">
            <FormField label="Centre Name" required>
              <Input
                value={editingCentre.name}
                onChange={(e) =>
                  setEditingCentre({ ...editingCentre, name: e.target.value })
                }
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="City" required>
                <Input
                  value={editingCentre.city}
                  onChange={(e) =>
                    setEditingCentre({ ...editingCentre, city: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Phone" required>
                <Input
                  value={editingCentre.phone}
                  onChange={(e) =>
                    setEditingCentre({
                      ...editingCentre,
                      phone: e.target.value,
                    })
                  }
                />
              </FormField>
            </div>
            <FormField label="Email">
              <Input
                type="email"
                value={editingCentre.email}
                onChange={(e) =>
                  setEditingCentre({ ...editingCentre, email: e.target.value })
                }
              />
            </FormField>
            <FormField label="Manager">
              <Input
                value={editingCentre.manager}
                onChange={(e) =>
                  setEditingCentre({
                    ...editingCentre,
                    manager: e.target.value,
                  })
                }
              />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" onClick={() => setEditingCentre(null)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit">
                Save Changes
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Settings Modal */}
      {settingsCentre && (
        <Modal
          title={`${settingsCentre.name} — Settings`}
          onClose={() => setSettingsCentre(null)}
        >
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    Notification for Test Approval
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Send email & in-app alerts when tests are ready for
                    approval.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-primary accent-primary"
                  checked={centreSettings.testApprovalNotif}
                  onChange={(e) =>
                    setCentreSettings({
                      ...centreSettings,
                      testApprovalNotif: e.target.checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    Notification for New Order
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Alert phlebotomy and lab techs immediately on new test
                    requests.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-primary accent-primary"
                  checked={centreSettings.newOrderNotif}
                  onChange={(e) =>
                    setCentreSettings({
                      ...centreSettings,
                      newOrderNotif: e.target.checked,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setSettingsCentre(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setSettingsCentre(null);
                  setAlert(
                    `Centre settings for ${settingsCentre.name} updated.`,
                  );
                }}
              >
                Save Settings
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="Add Centre" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <FormField label="Centre Name" required>
              <Input placeholder="e.g. MedLab Karen" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="City" required>
                <Input placeholder="e.g. Lagos" />
              </FormField>
              <FormField label="Phone" required>
                <Input placeholder="+234 800 XXX XXXX" />
              </FormField>
            </div>
            <FormField label="Email">
              <Input type="email" placeholder="centre@medlab.ng" />
            </FormField>
            <FormField label="Manager">
              <Select>
                {USERS.map((u) => (
                  <option key={u.id}>{u.name}</option>
                ))}
              </Select>
            </FormField>
            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setShowAdd(false);
                  setAlert("New centre created successfully.");
                }}
              >
                Create Centre
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN AUDIT LOGS
// ============================================================================
export function AuditLogsScreen() {
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedCenter, setSelectedCenter] = useState("all");

  const filtered = AUDIT_LOGS.filter((a) => {
    const matchesSearch =
      a.user.toLowerCase().includes(search.toLowerCase()) ||
      a.action.toLowerCase().includes(search.toLowerCase()) ||
      a.entity.toLowerCase().includes(search.toLowerCase());

    // Action Filter
    const matchesAction =
      selectedAction === "all" ||
      a.action.toLowerCase() === selectedAction.toLowerCase();

    // Strip out spaces, hyphens, and lowercase both strings to force match
    const normalizedLogCentre = a.centre.toLowerCase().replace(/[\s-]/g, "");
    const normalizedSelectedCentre = selectedCenter
      .toLowerCase()
      .replace(/[\s-]/g, "");

    // Center Filter
    const matchesCenter =
      selectedCenter === "all" ||
      normalizedLogCentre.includes(normalizedSelectedCentre);

    return matchesSearch && matchesAction && matchesCenter;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search logs…"
          />
        </div>
        {/* Actions bar filter */}
        <Select
          className="w-40"
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
        >
          <option value="all">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="approved">Approved</option>
          <option value="deleted">Deleted</option>
          <option value="uploaded">Uploaded</option>
        </Select>

        {/* Centers filter */}
        <Select
          className="w-40"
          value={selectedCenter}
          onChange={(e) => setSelectedCenter(e.target.value)}
        >
          <option value="all">All Centres</option>
          <option value="aguda">Aguda</option>
          <option value="bodethomas">Bode Thomas</option>
        </Select>
      </div>

      <Card>
        <Table
          headers={[
            "User",
            "Action",
            "Entity",
            "Entity ID",
            "Centre",
            "Date",
            "Time",
          ]}
        >
          {filtered.map((a) => (
            <tr key={a.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-sm font-medium">{a.user}</td>
              <td className="px-4 py-3">
                <Badge
                  variant={
                    a.action === "Created"
                      ? "success"
                      : a.action === "Approved"
                        ? "emerald"
                        : a.action === "Deleted"
                          ? "danger"
                          : a.action === "Uploaded"
                            ? "teal"
                            : "info"
                  }
                >
                  {a.action}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm">{a.entity}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {a.entityId}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {a.centre}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {a.date}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {a.time}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

// ============================================================================
// ADMIN REPORTS
// ============================================================================
export function ReportsScreen() {
  const [tab, setTab] = useState("revenue");
  const tabs = [
    { id: "revenue", label: "Revenue" },
    { id: "patients", label: "Patients" },
    { id: "staff", label: "Staff Performance" },
    { id: "centres", label: "Centre Performance" },
  ];

  // Dynamic Patient Monthly Stats
  const patientData = useMemo(() => {
    return CENTRES.map((c) => ({
      id: c.id,
      name: c.name,
      newPatientsMonth: c.patientsToday ? c.patientsToday * 12 : 320,
      totalPatients: c.patientsToday ? c.patientsToday * 85 : 2400,
      monthlyGrowth: c.id === "1" ? "+14.2%" : "+11.8%",
    }));
  }, []);

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "revenue" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={DollarSign}
              label="Total Revenue (YTD)"
              value="₦24.8M"
              sub="Jan 1 - Present"
              color="bg-blue-500"
            />
            <StatCard
              icon={TrendingUp}
              label="Growth vs Last Year"
              value="+18.4%"
              sub="Yearly financial growth"
              color="bg-teal-500"
            />
            <StatCard
              icon={Activity}
              label="Avg. Monthly Revenue"
              value="₦3.54M"
              sub="Calculated YTD average"
              color="bg-violet-500"
            />
          </div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">
                Monthly Revenue by Centre Performance
              </h3>
              <Btn variant="secondary" size="sm">
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Btn>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#334155" }}
                  stroke="#94a3b8"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#334155" }}
                  stroke="#94a3b8"
                  tickFormatter={(v) => `₦${(v / 1000000).toFixed(0)}m`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                  }}
                  formatter={(v) => `₦${Number(v).toLocaleString()}`}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    color: "#1e293b",
                    paddingTop: "10px",
                  }}
                />
                <Bar
                  dataKey="Aguda"
                  fill="#1a6bcc"
                  radius={[4, 4, 0, 0]}
                  name="Aguda Centre"
                />
                <Bar
                  dataKey="BodeThomas"
                  fill="#7c3aed"
                  radius={[4, 4, 0, 0]}
                  name="Bode Thomas Centre"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {tab === "patients" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">
            Monthly Patient Registration & Growth Summary
          </h3>
          <Table
            headers={[
              "Centre Name",
              "New Patients (M)",
              "Total Patients",
              "Monthly Growth Rate",
            ]}
          >
            {patientData.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                <td className="px-4 py-3 text-sm">{p.newPatientsMonth}</td>
                <td className="px-4 py-3 text-sm">{p.totalPatients}</td>
                <td className="px-4 py-3">
                  <Badge variant="success">{p.monthlyGrowth}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "staff" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">
            Staff Performance Tracker
          </h3>
          <Table
            headers={[
              "Staff Member",
              "Role",
              "Tests Processed",
              "Orders Created",
              "Avg Turnaround Time",
            ]}
          >
            {USERS.map((u, i) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="info">{u.role.replace("_", " ")}</Badge>
                </td>
                <td className="px-4 py-3 text-sm">{65 + i * 14}</td>
                <td className="px-4 py-3 text-sm">{40 + i * 9}</td>
                <td className="px-4 py-3 text-sm">
                  {(1.8 + i * 0.4).toFixed(1)} hrs
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "centres" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">
            Daily Centre Performance & Patient Volume Comparison
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={CENTRES.map((c) => ({
                name: c.name,
                patients: c.patientsToday || 38,
                revenue: (c.patientsToday || 38) * 8500,
              }))}
              barSize={32}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155" }}
                stroke="#94a3b8"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#334155" }}
                stroke="#94a3b8"
              />
              <Tooltip />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  color: "#1e293b",
                  paddingTop: "10px",
                }}
              />
              <Bar
                dataKey="patients"
                fill="#1a6bcc"
                radius={[4, 4, 0, 0]}
                name="Daily Patient Volume"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN TEST CATALOG
// ============================================================================
export function TestCatalogScreen() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const filtered = TESTS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.includes(search) ||
      t.category.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search tests…"
          />
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add Test
        </Btn>
      </div>
      <Card>
        <Table
          headers={[
            "Code",
            "Test Name",
            "Category",
            "Sample Type",
            "Price",
            "TAT",
            "Actions",
          ]}
        >
          {filtered.map((t) => (
            <tr key={t.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {t.code}
              </td>
              <td className="px-4 py-3 text-sm font-medium">{t.name}</td>
              <td className="px-4 py-3">
                <Badge variant="info">{t.category}</Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {t.sampleType}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {t.price.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {t.turnaround}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn variant="ghost" size="sm" onClick={() => setShowEdit(t)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Btn>
                  <Btn variant="ghost" size="sm">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Btn>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      {(showAdd || showEdit) && (
        <Modal
          title={showEdit ? "Edit Test" : "Add Test"}
          onClose={() => {
            setShowAdd(false);
            setShowEdit(null);
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Test Code" required>
                <Input
                  defaultValue={showEdit?.code}
                  placeholder="e.g. CBC-001"
                />
              </FormField>
              <FormField label="Category" required>
                <Select defaultValue={showEdit?.category}>
                  <option>Haematology</option>
                  <option>Biochemistry</option>
                  <option>Radiology</option>
                  <option>Endocrinology</option>
                  <option>Microbiology</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Test Name" required>
              <Input
                defaultValue={showEdit?.name}
                placeholder="Full test name"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Sample Type">
                <Input
                  defaultValue={showEdit?.sampleType}
                  placeholder="e.g. Serum"
                />
              </FormField>
              <FormField label="Turnaround Time">
                <Input
                  defaultValue={showEdit?.turnaround}
                  placeholder="e.g. 4 hrs"
                />
              </FormField>
              <FormField label="Price (KES)" required>
                <Input
                  type="number"
                  defaultValue={showEdit?.price}
                  placeholder="0"
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-3">
              <Btn
                variant="secondary"
                onClick={() => {
                  setShowAdd(false);
                  setShowEdit(null);
                }}
              >
                Cancel
              </Btn>
              <Btn variant="primary">Save Test</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN SETTINGS
// ============================================================================
export function SettingsScreen() {
  const [generalSettings, setGeneralSettings] = useState({
    orgName: "Foundation Medical Diagnostic Lab",
    currency: "NGN",
    licenseNo: "LAB-NG-2026-8891",
    defaultTurnaround: "24",
    labEmail: "admin@foundationlab.ng",
  });

  const [notifications, setNotifications] = useState([
    { id: 1, label: "Email alerts for new orders", enabled: true },
    { id: 2, label: "SMS on sample collection", enabled: true },
    { id: 3, label: "Notify patient on result ready", enabled: true },
    { id: 4, label: "Daily revenue summary to admin", enabled: false },
    { id: 5, label: "Emergency critical lab result warnings", enabled: true },
  ]);

  const [alert, setAlert] = useState(null);

  const toggleNotification = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)),
    );
  };

  const handleSaveSettings = () => {
    // Ready for backend POST / PUT API request
    setAlert("All laboratory settings updated successfully.");
  };

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      {alert && (
        <Alert type="success" message={alert} onClose={() => setAlert(null)} />
      )}

      {/* 1. Diagnostics Lab General Settings */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold border-b border-border pb-2">
          Diagnostic Laboratory Settings
        </h3>
        <FormField label="Organisation / Diagnostic Centre Name">
          <Input
            value={generalSettings.orgName}
            onChange={(e) =>
              setGeneralSettings({
                ...generalSettings,
                orgName: e.target.value,
              })
            }
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Lab Accreditation / License No.">
            <Input
              value={generalSettings.licenseNo}
              onChange={(e) =>
                setGeneralSettings({
                  ...generalSettings,
                  licenseNo: e.target.value,
                })
              }
            />
          </FormField>
          <FormField label="Default Result TAT (Hours)">
            <Input
              type="number"
              value={generalSettings.defaultTurnaround}
              onChange={(e) =>
                setGeneralSettings({
                  ...generalSettings,
                  defaultTurnaround: e.target.value,
                })
              }
            />
          </FormField>
        </div>
        <FormField label="Default Currency">
          <Select
            value={generalSettings.currency}
            onChange={(e) =>
              setGeneralSettings({
                ...generalSettings,
                currency: e.target.value,
              })
            }
          >
            <option value="NGN">₦ — Nigerian Naira (NGN)</option>
            <option value="USD">$ — US Dollar (USD)</option>
          </Select>
        </FormField>
      </Card>

      {/* 2. Interactive Notification Settings */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold border-b border-border pb-2">
          Notification & Alert Settings
        </h3>
        {notifications.map((n) => (
          <div key={n.id} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{n.label}</span>
            <button
              type="button"
              onClick={() => toggleNotification(n.id)}
              className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                n.enabled ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-all ${
                  n.enabled ? "right-0.5" : "left-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </Card>

      {/* 3. Save Settings Handler */}
      <div className="flex justify-end">
        <Btn variant="primary" onClick={handleSaveSettings}>
          <CheckCircle className="w-3.5 h-3.5" />
          Save Settings
        </Btn>
      </div>
    </div>
  );
}
