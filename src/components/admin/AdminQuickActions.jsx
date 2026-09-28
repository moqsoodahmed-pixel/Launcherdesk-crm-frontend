// src/components/admin/AdminQuickActions.jsx
// Every action below navigates to a route that already exists in App.jsx.
// No dead buttons, no invented endpoints.
import { useNavigate } from "react-router-dom";
import { UserPlus, Megaphone, BarChart2, MessageSquare, CalendarCheck2, FileBarChart } from "lucide-react";

export default function AdminQuickActions({ isSuperAdmin }) {
  const navigate = useNavigate();

  const actions = [
    { label: "Add Lead", icon: UserPlus, to: "/leads", primary: true },
    { label: "Create Campaign", icon: Megaphone, to: "/campaigns" },
    { label: "View Reports", icon: BarChart2, to: "/reportpage" },
    { label: "Open Communications", icon: MessageSquare, to: "/communications" },
    { label: "View Attendance", icon: CalendarCheck2, to: "/attendance" },
    ...(isSuperAdmin
      ? [{ label: "Create Custom Report", icon: FileBarChart, to: "/custom-reports" }]
      : []),
  ];

  return (
    <div className="surface-card p-4 sm:p-5 mb-5 sm:mb-6">
      <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
        Quick actions
      </h2>
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className={a.primary ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            >
              <Icon className="w-3.5 h-3.5" />
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}