import React from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export function Badge({ variant, children }) {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    neutral: "bg-gray-50 text-gray-600 border border-gray-200",
    teal: "bg-teal-50 text-teal-700 border border-teal-200",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active: { variant: "success", label: "Active" },
    inactive: { variant: "neutral", label: "Inactive" },
    paid: { variant: "success", label: "Paid" },
    pending: { variant: "warning", label: "Pending" },
    partial: { variant: "info", label: "Partial" },
    completed: { variant: "success", label: "Completed" },
    approved: { variant: "success", label: "Approved" },
    collected: { variant: "teal", label: "Collected" },
    processing: { variant: "info", label: "Processing" },
    cancelled: { variant: "danger", label: "Cancelled" },
    ready: { variant: "success", label: "Ready" },
    reviewed: { variant: "teal", label: "Reviewed" },
    refunded: { variant: "neutral", label: "Refunded" },
  };
  const config = map[status] ?? { variant: "neutral", label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-card border border-border rounded-lg shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

export function Table({ headers, children, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {empty ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-12 text-center text-muted-foreground text-sm"
              >
                No records found.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, total, perPage, onChange }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
      <span>
        Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of{" "}
        {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-1 rounded border transition-colors ${p === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"}
        className="w-full pl-9 pr-4 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
      />
    </div>
  );
}

export function Modal({ title, onClose, children, width = "max-w-lg" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-card rounded-xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Alert({ type, message, onClose }) {
  const styles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };
  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    error: <XCircle className="w-4 h-4 text-red-600" />,
    info: <AlertCircle className="w-4 h-4 text-blue-600" />,
  };
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}
    >
      {icons[type]}
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function FormField({ label, children, required }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors ${props.className ?? ""}`}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors ${props.className ?? ""}`}
    >
      {children}
    </select>
  );
}

export function Btn({
  variant = "primary",
  size = "md",
  onClick,
  children,
  type = "button",
  disabled,
  className = "",
}) {
  const base =
    "inline-flex items-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary:
      "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
    danger:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
