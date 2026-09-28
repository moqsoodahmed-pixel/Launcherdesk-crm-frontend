// src/components/admin/AdminCommunicationsOverview.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The Communications page (WhatsApp/SMS/Email blasts + inbox) already has its
// own message-level data (sent/delivered/failed) scoped per conversation —
// duplicating that fetch here just to show a dashboard number isn't done, per
// "don't invent delivery percentages" and "don't fetch the same data twice."
// Instead this card shows what's REAL and already available in Dashboard's
// state: which channels are enabled for this company's plan (from
// useEntitlements, the same source Sidebar/FeatureGate use), plus a straight
// link through to the full Communications page.
import { useNavigate } from "react-router-dom";
import { MessageCircle, Smartphone, Mail, ArrowRight } from "lucide-react";
import { Pill } from "../ui/Primitives.jsx";

export default function AdminCommunicationsOverview({ hasFeature }) {
  const navigate = useNavigate();

  const channels = [
    { key: "whatsapp-blast", label: "WhatsApp", icon: MessageCircle, color: "#059669" },
    { key: "sms-blast", label: "SMS", icon: Smartphone, color: "#4F46E5" },
    { key: "email-blast", label: "Email", icon: Mail, color: "#D97706" },
  ];

  return (
    <div className="surface-card surface-card-hover p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white">
          Communications
        </h2>
        <button
          onClick={() => navigate("/communications")}
          className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-300 hover:underline"
        >
          Open <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-2.5">
        {channels.map((c) => {
          const Icon = c.icon;
          const enabled = hasFeature(c.key);
          return (
            <div key={c.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${c.color}1A`, color: c.color }}
                >
                  <Icon className="w-3 h-3" />
                </span>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{c.label}</span>
              </div>
              <Pill tone={enabled ? "emerald" : "slate"}>
                {enabled ? "Enabled" : "Not on plan"}
              </Pill>
            </div>
          );
        })}
      </div>
    </div>
  );
}