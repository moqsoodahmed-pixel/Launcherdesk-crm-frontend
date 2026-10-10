import { useState, useEffect } from "react";
import { fetchAttendanceUsers } from "../services/attendanceService";

const STATUS_OPTIONS = [
  { value: "",         label: "All Statuses" },
  { value: "present",  label: "Present" },
  { value: "absent",   label: "Absent" },
  { value: "late",     label: "Late" },
  { value: "half_day", label: "Half-Day" },
  { value: "leave",    label: "Leave" },
];

function getQuickRange(type) {
  // Use local date to avoid UTC timezone shift (critical for IST +5:30)
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const localDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  if (type === "today") return { startDate: localToday, endDate: localToday };

if (type === "week") {
  const start = new Date(now);
  start.setDate(now.getDate() - 7); // today minus 7 days
  return {
    startDate: localDate(start),   // ← use localDate, not toISOString
    endDate:   localToday,
  };
}

  if (type === "month") {
    const y = now.getFullYear(), m = now.getMonth();
    return {
      startDate: localDate(new Date(y, m, 1)),
      endDate:   localToday, // ← today, not end of month
    };
  }

  if (type === "year") {
    return {
      startDate: `${now.getFullYear()}-01-01`,
      endDate:   localToday, // ← today, not Dec 31
    };
  }

  return { startDate: localToday, endDate: localToday };
}

export default function AttendanceFilters({ filters, onChange }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchAttendanceUsers()
      .then(setUsers)
      .catch(() => {});
  }, []);

  const set = (key, val) =>
    onChange({ ...filters, [key]: val, quick: "" });

  const applyQuick = (type) => {
    const { startDate, endDate } = getQuickRange(type);
    onChange({ ...filters, startDate, endDate, quick: type });
  };

  const reset = () => {
    const today = new Date().toISOString().slice(0, 10);
    onChange({ startDate: today, endDate: today, userId: "", crmStatus: "", quick: "today" });
  };

  const QUICK_BTNS = [
    { label: "Today", key: "today" },
    { label: "Week",  key: "week"  },
    { label: "Month", key: "month" },
    { label: "Year",  key: "year"  },
  ];

  const inputCls = "input-field w-auto px-3 py-1.5 text-[12px]";

  return (
    <div className="surface-card p-4 mb-4">
      {/* Quick range buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_BTNS.map(({ label, key }) => (
          <button
            key={key}
            onClick={() => applyQuick(key)}
            className={`btn btn-sm ${filters.quick === key
                ? "bg-brand-gradient text-white shadow-glow-brand"
                : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-300"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">From</label>
          <input
            type="date"
            value={filters.startDate}
            max={filters.endDate || new Date().toISOString().slice(0, 10)}
            onChange={e => set("startDate", e.target.value)}
            aria-label="From date"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">To</label>
          <input
            type="date"
            value={filters.endDate}
            min={filters.startDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => set("endDate", e.target.value)}
            aria-label="To date"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Employee</label>
          <select
            value={filters.userId || ""}
            onChange={e => set("userId", e.target.value)}
            aria-label="Filter by employee"
            className={inputCls}
          >
            <option value="">All Employees</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Status</label>
          <select
            value={filters.crmStatus || ""}
            onChange={e => set("crmStatus", e.target.value)}
            aria-label="Filter by status"
            className={inputCls}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={reset}
          className="btn btn-sm btn-ghost hover:!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
        >
          Reset
        </button>
      </div>

      {/* Active range display */}
      {(filters.startDate || filters.endDate) && (
        <p className="mt-2 text-[11px] text-violet-600 dark:text-violet-400 font-medium">
          Showing: {filters.startDate} → {filters.endDate}
        </p>
      )}
    </div>
  );
}
