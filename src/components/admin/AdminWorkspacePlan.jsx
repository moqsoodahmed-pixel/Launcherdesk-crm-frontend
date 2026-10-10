// src/components/admin/AdminWorkspacePlan.jsx
// Shows the real plan already loaded into Dashboard's state (companyPlan for
// admin, superAdminPlan for super_admin — both come from existing endpoints:
// GET /admin/company/me and GET /razorpay/subscription respectively). No
// payment details, no Razorpay internals — just the plan name/status and a
// link to the existing Manage Plan page.
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowRight } from "lucide-react";
import { Pill } from "../ui/Primitives.jsx";

export default function AdminWorkspacePlan({ isSuperAdmin, plan, readOnlyMode, subscriptionStatus }) {
  const navigate = useNavigate();
  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "—";

  return (
    <div className="surface-card surface-card-hover p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white">
          Workspace plan
        </h2>
        <Wallet className="w-4 h-4 text-violet-500" />
      </div>

      <div className="flex-1">
        <div className="text-[20px] font-extrabold text-slate-900 dark:text-white leading-none mb-1.5">
          {planLabel}
        </div>
        <Pill tone={readOnlyMode ? "rose" : "emerald"}>
          {readOnlyMode ? (subscriptionStatus || "Read-only") : "Active"}
        </Pill>
      </div>

      {isSuperAdmin ? (
        <button onClick={() => navigate("/upgrade-plan")} className="btn-secondary btn-sm mt-4 w-full">
          Manage plan <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ) : (
        <p className="text-[10.5px] text-slate-500 dark:text-slate-500 mt-4">
          Plan changes are managed by your Super Admin.
        </p>
      )}
    </div>
  );
}