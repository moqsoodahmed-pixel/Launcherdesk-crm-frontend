// ─────────────────────────────────────────────────────────────────────────────
//  DowngradeWarningModal.jsx
//  Drop-in replacement for the modal used inside UpgradePlan.jsx
//
//  PROPS
//    targetPlan         — plan object (id, name, color, monthlyPrice, …)
//    currentAdmins      — full admin array from UserManagement state
//    currentUsers       — full user array from UserManagement state
//    targetAdminLimit   — max admins allowed on target plan (e.g. 1)
//    targetUserLimit    — max users  allowed on target plan (e.g. 10)
//    onConfirm(adminsToRemove, usersToRemove) — called when user clicks confirm
//    onCancel           — called when user clicks "keep current plan"
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import { AlertTriangle, ArrowDown, CheckCircle2 } from "lucide-react";
import { Avatar, Pill } from "./ui/Primitives";

// ── Checkbox UI ──────────────────────────────────────────────────────────────
function Checkbox({ checked }) {
  return (
    <div
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
        checked
          ? "bg-rose-500 border-rose-500"
          : "border-slate-300 dark:border-white/15"
      }`}
    >
      {checked && (
        <svg
          className="w-3 h-3 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

// ── Selectable member row ────────────────────────────────────────────────────
function SelectableRow({ member, selected, onToggle, isLast }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(member)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        !isLast ? "border-b border-slate-200 dark:border-white/10" : ""
      } ${
        selected
          ? "bg-rose-50 dark:bg-rose-500/10"
          : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
      }`}
    >
      <Avatar name={member.name} size={8} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">
          {member.name}
        </p>
        <p className="text-[11px] text-slate-500 truncate">
          {member.email}
        </p>
      </div>
      {selected && (
        <Pill tone="rose" className="shrink-0 mr-1">
          Removing
        </Pill>
      )}
      <Checkbox checked={selected} />
    </button>
  );
}

// ── Section header with progress badge ──────────────────────────────────────
function SectionHeader({ label, sublabel, selected, needed }) {
  const done = selected >= needed;
  return (
    <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
      <div>
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </span>
        {sublabel && (
          <span className="ml-1.5 text-[11px] text-slate-500">
            {sublabel}
          </span>
        )}
      </div>
      <Pill tone={done ? "emerald" : "amber"}>
        {done ? (
          <>✓ {selected} selected</>
        ) : (
          <>{selected} / {needed} selected</>
        )}
      </Pill>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function DowngradeWarningModal({
  targetPlan,
  currentAdmins,
  currentUsers,
  targetAdminLimit,
  targetUserLimit,
  onConfirm,
  onCancel,
}) {
  // Super admins are fixed — exclude them from the count and the selectable list
  const selectableAdmins = currentAdmins.filter(
    (a) => a.role !== "super_admin" && a.role !== "superadmin"
  );

  // How many need to be removed (super admin never counts)
  const mustRemoveAdmins = Math.max(0, selectableAdmins.length - targetAdminLimit);
  const mustRemoveUsers  = Math.max(0, currentUsers.length      - targetUserLimit);
  const hasAnyRequired   = mustRemoveAdmins > 0 || mustRemoveUsers > 0;

  // Selected IDs (Sets)
  const [selectedAdminIds, setSelectedAdminIds] = useState(new Set());
  const [selectedUserIds,  setSelectedUserIds]  = useState(new Set());

  // Show-all toggles for long user lists
  const VISIBLE_LIMIT = 6;
  const [showAllUsers, setShowAllUsers] = useState(false);

  const visibleUsers = showAllUsers
    ? currentUsers
    : currentUsers.slice(0, VISIBLE_LIMIT);

  // Toggle helpers
  function toggleAdmin(member) {
    const id = member._id || member.id;
    setSelectedAdminIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleUser(member) {
    const id = member._id || member.id;
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Derived
  const selectedAdmins = useMemo(
    () => selectableAdmins.filter((m) => selectedAdminIds.has(m._id || m.id)),
    [currentAdmins, selectedAdminIds]
  );
  const selectedUsers = useMemo(
    () => currentUsers.filter((m) => selectedUserIds.has(m._id || m.id)),
    [currentUsers, selectedUserIds]
  );

  const adminsDone = selectedAdmins.length >= mustRemoveAdmins;
  const usersDone  = selectedUsers.length  >= mustRemoveUsers;
  const canConfirm = adminsDone && usersDone;

  // Status line text
  const statusParts = [];
  if (!adminsDone) {
    const n = mustRemoveAdmins - selectedAdmins.length;
    statusParts.push(`${n} more admin${n > 1 ? "s" : ""}`);
  }
  if (!usersDone) {
    const n = mustRemoveUsers - selectedUsers.length;
    statusParts.push(`${n} more user${n > 1 ? "s" : ""}`);
  }

  // Just pass selections up — UpgradePlan handles payment then deletion
  function handleConfirm() {
    onConfirm(selectedAdmins, selectedUsers);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="surface-card !rounded-2xl shadow-popover w-full max-w-md overflow-hidden flex flex-col animate-scale-in"
        style={{ maxHeight: "90vh" }}
      >
        {/* Amber accent bar */}
        <div className="h-1.5 w-full bg-amber-500 shrink-0" />

        {/* Scrollable content */}
        <div className="overflow-y-auto scrollbar-thin flex-1">
          <div className="p-6">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-100 dark:border-amber-500/20 flex items-center justify-center">
                <ArrowDown className="w-7 h-7 text-amber-500" strokeWidth={2} />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white text-center mb-1">
              Downgrade to {targetPlan.name}?
            </h2>

            {hasAnyRequired ? (
              <p className="text-[12px] text-slate-500 dark:text-slate-400 text-center mb-5 leading-relaxed">
                The {targetPlan.name} plan allows{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {targetAdminLimit} admin{targetAdminLimit !== 1 ? "s" : ""}
                </span>{" "}
                and{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {targetUserLimit} users
                </span>
                . Select who to remove to proceed.
              </p>
            ) : (
              <p className="text-[12px] text-slate-500 dark:text-slate-400 text-center mb-5 leading-relaxed">
                Your current team fits within {targetPlan.name} plan limits. No
                members need to be removed.
              </p>
            )}

            {/* ── Admins section ── */}
            {mustRemoveAdmins > 0 && (
              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden mb-3">
                <SectionHeader
                  label="Admins"
                  sublabel={`(keep ${targetAdminLimit}, remove at least ${mustRemoveAdmins})`}
                  selected={selectedAdmins.length}
                  needed={mustRemoveAdmins}
                />
                {selectableAdmins.map((m, i) => (
                  <SelectableRow
                    key={m._id || m.id || m.email}
                    member={m}
                    selected={selectedAdminIds.has(m._id || m.id)}
                    onToggle={toggleAdmin}
                    isLast={i === selectableAdmins.length - 1}
                  />
                ))}
              </div>
            )}

            {/* ── Users section ── */}
            {mustRemoveUsers > 0 && (
              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden mb-3">
                <SectionHeader
                  label="Employees"
                  sublabel={`(keep ${targetUserLimit}, remove at least ${mustRemoveUsers})`}
                  selected={selectedUsers.length}
                  needed={mustRemoveUsers}
                />
                {visibleUsers.map((m, i) => (
                  <SelectableRow
                    key={m._id || m.id || m.email}
                    member={m}
                    selected={selectedUserIds.has(m._id || m.id)}
                    onToggle={toggleUser}
                    isLast={i === visibleUsers.length - 1 && showAllUsers}
                  />
                ))}
                {!showAllUsers && currentUsers.length > VISIBLE_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setShowAllUsers(true)}
                    className="w-full px-4 py-2.5 text-[11px] font-semibold text-launcher-600 dark:text-launcher-400
                      hover:bg-slate-50 dark:hover:bg-white/[0.04] transition border-t
                      border-slate-200 dark:border-white/10 text-center"
                  >
                    Show {currentUsers.length - VISIBLE_LIMIT} more users
                  </button>
                )}
              </div>
            )}

            {/* Status line */}
            {hasAnyRequired && (
              <div className="mb-4">
                {canConfirm ? (
                  <p className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                    Ready — {selectedAdmins.length + selectedUsers.length} account
                    {selectedAdmins.length + selectedUsers.length !== 1 ? "s" : ""}{" "}
                    selected for removal.
                  </p>
                ) : (
                  <p className="text-[12px] text-slate-500">
                    Select{" "}
                    <span className="font-semibold text-rose-500">
                      {statusParts.join(" and ")}
                    </span>{" "}
                    to enable confirm.
                  </p>
                )}
              </div>
            )}

            {/* Warning */}
            {hasAnyRequired && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Selected accounts will be removed <strong>only after payment succeeds</strong>.
                  If you cancel payment, no one is removed. Once removed, their
                  active leads will be unassigned and access cannot be restored.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-6 pb-6 shrink-0 bg-white dark:bg-[#181029]">
          {/* Plan chips */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-[11px] text-slate-500">Switching to:</span>
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{
                background: targetPlan.color + "18",
                color: targetPlan.color,
              }}
            >
              {targetPlan.name}
            </span>
            <span className="text-[11px] text-slate-500">·</span>
            <span className="text-[11px] text-slate-500">
              Max {targetAdminLimit} admin{targetAdminLimit !== 1 ? "s" : ""} /{" "}
              {targetUserLimit} users
            </span>
          </div>

          <div className="flex gap-2.5">
            <button onClick={onCancel} className="btn-secondary btn-md flex-1">
              Keep current plan
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="btn-danger btn-md flex-1"
            >
              <ArrowDown className="w-4 h-4" />
              Proceed to pay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
