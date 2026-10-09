import { useMemo, useState, useEffect } from "react";
import { X, Flame, Sun, Snowflake, CheckCircle2, AlertTriangle, Clock, Handshake, MapPin, Monitor, Video, Phone, CalendarClock, CalendarDays, Paperclip, Mic, User, RefreshCw, ClipboardList, Inbox, Map as MapIcon, Users, BarChart3, PartyPopper, XCircle, Zap, Sparkles } from "lucide-react";
import QualificationScore from "./QualificationScore";
import { Pill } from "./ui/Primitives";
import api from "../data/axiosConfig";
import useEntitlements from "../hooks/useEntitlements";

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return fmtDate(iso) + " · " + fmtTime(iso);
}
function daysSince(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// Per-status accent — dot hex is used for dynamic inline styling (progress bar,
// status summary panel) where a Tailwind class can't carry a runtime value.
const STATUS_COLOR = {
  "New":            { bg: "bg-violet-100 dark:bg-violet-500/15",  text: "text-violet-600 dark:text-violet-400",  dot: "#7E14FF" },
  "In Progress":    { bg: "bg-amber-100 dark:bg-amber-500/15",    text: "text-amber-600 dark:text-amber-400",    dot: "#D97706" },
  "Converted":      { bg: "bg-emerald-100 dark:bg-emerald-500/15",text: "text-emerald-600 dark:text-emerald-400",dot: "#059669" },
  "Not Interested": { bg: "bg-rose-100 dark:bg-rose-500/15",      text: "text-rose-600 dark:text-rose-400",      dot: "#E11D48" },
};

const TEMP_ICON = { Hot: Flame, Warm: Sun, Cold: Snowflake };
const TEMP_STYLE = {
  Hot:  { bg: "bg-rose-100 dark:bg-rose-500/15",  text: "text-rose-600 dark:text-rose-400" },
  Warm: { bg: "bg-amber-100 dark:bg-amber-500/15",text: "text-amber-600 dark:text-amber-400" },
  Cold: { bg: "bg-cyan-100 dark:bg-cyan-500/15",  text: "text-cyan-600 dark:text-cyan-400" },
};

const OUTCOME_STYLE = {
  "Not Interested":   { bg: "bg-rose-50 dark:bg-rose-500/10",     text: "text-rose-600 dark:text-rose-400" },
  "Invalid":          { bg: "bg-rose-50 dark:bg-rose-500/10",     text: "text-rose-700 dark:text-rose-400" },
  "Invalid Rejected": { bg: "bg-amber-50 dark:bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400" },
  "Interested":       { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  "Converted":        { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  "Call Back":        { bg: "bg-amber-50 dark:bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400" },
  "No Answer":        { bg: "bg-slate-100 dark:bg-white/[0.06]",  text: "text-slate-500 dark:text-slate-400" },
  "Not Reachable":    { bg: "bg-slate-100 dark:bg-white/[0.06]",  text: "text-slate-500 dark:text-slate-400" },
};

function SectionLabel({ icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-launcher-600 dark:text-launcher-400">{icon}</span>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

function JourneyProgressBar({ lead, totalCalls, scheduledCalls }) {
  const sc = STATUS_COLOR[lead.status] || STATUS_COLOR["New"];
  const stages = [
    { key: "created",   label: "Lead In",   done: true },
    { key: "assigned",  label: "Assigned",  done: !!lead.agent },
    { key: "contacted", label: "Contacted", done: totalCalls > 0 },
    { key: "followup",  label: "Follow-up", done: scheduledCalls.some(c => c.done) },
    { key: "converted", label: "Converted", done: lead.status === "Converted" },
  ];
  const doneCount = stages.filter(s => s.done).length;
  const pct = Math.round((doneCount / stages.length) * 100);

  return (
    <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Journey Progress</p>
        <span className="text-[12px] font-black" style={{ color: sc.dot }}>{pct}%</span>
      </div>
      <div className="flex items-center gap-1 mb-2">
        {stages.map(s => (
          <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: s.done ? "100%" : "0%", background: sc.dot }} />
            </div>
            <span
              className="text-[9px] font-semibold whitespace-nowrap"
              style={s.done ? { color: sc.dot } : { color: "#94A3B8" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CallCard({ call, displayIndex }) {
  const outcome = call.outcome || "No Answer";
  const os = OUTCOME_STYLE[outcome] || OUTCOME_STYLE["No Answer"];
  return (
    <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 p-3 mb-2">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center text-[10px] font-black text-cyan-600 dark:text-cyan-400 shrink-0">
            #{displayIndex}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-slate-900 dark:text-white">
              {call.userName || "Employee"}
            </p>
            <p className="text-[10px] text-slate-400">{fmtDateTime(call.calledAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${os.bg} ${os.text}`}>
            {outcome}
          </span>
          {call.calledAt && (
            <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-md font-medium">
              {daysSince(call.calledAt)}
            </span>
          )}
        </div>
      </div>
      {call.remark && (
        <div className="ml-8 mt-1">
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">Remark:</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic">"{call.remark}"</p>
          </div>
        </div>
      )}
      {call.numberType && (
        <div className="ml-8 mt-1 flex items-center gap-1.5">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              call.numberType === "Primary"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
            }`}
          >
            {call.numberType}
            {call.calledNumber ? ` · ${call.calledNumber.slice(-4).padStart(call.calledNumber.length, "•")}` : ""}
          </span>
        </div>
      )}
      {call.duration && (
        <div className="ml-8 mt-1">
          <span className="text-[9px] text-slate-400">Duration: {call.duration}</span>
        </div>
      )}
    </div>
  );
}

function ScheduledCard({ sc: call }) {
  const isPast = new Date(call.scheduledAt) < new Date();
  const isOverdue = !call.done && isPast;
  const statusLabel = call.done ? "Completed" : isOverdue ? "Overdue" : "Pending";
  const statusStyle = call.done
    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : isOverdue
    ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
    : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400";
  const Icon = call.done ? CheckCircle2 : isOverdue ? AlertTriangle : Clock;

  return (
    <div className={`rounded-xl border p-3 mb-2 ${
      call.done
        ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5"
        : isOverdue
        ? "border-rose-200 dark:border-rose-500/20 bg-rose-50/30 dark:bg-rose-500/5"
        : "border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-400"><Icon className="w-3.5 h-3.5" /></span>
          <div>
            <p className="text-[12px] font-semibold text-slate-900 dark:text-white">
              {call.type === "follow-up" ? "Follow-up Call" : "Verification Call"}
            </p>
            <p className="text-[10px] text-slate-400">Scheduled: {fmtDate(call.scheduledAt)}</p>
            {call.done && call.doneAt && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Completed: {fmtDateTime(call.doneAt)}
              </p>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>
      {call.note && (
        <div className="mt-2 ml-6">
          <p className="text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed">"{call.note}"</p>
        </div>
      )}
    </div>
  );
}

// ── Client visit / meeting card ───────────────────────────────────────────────
const MEETING_TYPE_ICON = {
  "In-Person":  Handshake,
  "Site Visit": MapPin,
  "Demo":       Monitor,
  "Video Call": Video,
  "Phone Call": Phone,
};

function MeetingCard({ visit }) {
  const MIcon = MEETING_TYPE_ICON[visit.meetingType] || CalendarClock;
  const oStyle = OUTCOME_STYLE[visit.outcome] || { bg: "bg-slate-100 dark:bg-white/[0.06]", text: "text-slate-500 dark:text-slate-400" };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-3 mb-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-launcher-600 dark:text-launcher-400"><MIcon className="w-3.5 h-3.5" /></span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-900 dark:text-white">
              {visit.meetingType || "Visit"}
              {visit.userName ? <span className="font-normal text-slate-400"> · {visit.userName}</span> : null}
            </p>
            <p className="text-[10px] text-slate-400">{fmtDateTime(visit.metAt)}</p>
          </div>
        </div>
        {visit.outcome ? (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${oStyle.bg} ${oStyle.text}`}>
            {visit.outcome}
          </span>
        ) : null}
      </div>

      {visit.remark ? (
        <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed">"{visit.remark}"</p>
      ) : null}

      {visit.location ? (
        <p className="mt-1.5 text-[10px] text-slate-400 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{visit.location}</span>
        </p>
      ) : null}

      {visit.followUpDate ? (
        <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <CalendarDays className="w-3 h-3 shrink-0" /><span>Follow-up: {fmtDateTime(visit.followUpDate)}</span>
        </p>
      ) : null}

      {(visit.documentUrl || visit.recordingUrl) ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {visit.documentUrl ? (
            <a
              href={visit.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition"
            >
              <Paperclip className="w-3 h-3" />{visit.documentName || "View attachment"}
            </a>
          ) : null}
          {visit.recordingUrl ? (
            <a
              href={visit.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition"
            >
              <Mic className="w-3 h-3" />{visit.recordingName || "Play recording"}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EmployeeCard({ agent, isCurrent }) {
  const name = typeof agent === "string" ? agent : agent.name || "Unknown";
  const initial = name.charAt(0).toUpperCase();
  const assignedAt = typeof agent === "object" ? agent.assignedAt : null;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
      <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center text-[11px] font-black text-violet-600 dark:text-violet-400 shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">{name}</p>
        {assignedAt && (
          <p className="text-[10px] text-slate-400">{fmtDate(assignedAt)}</p>
        )}
      </div>
      {isCurrent
        ? <Pill tone="violet" className="shrink-0">Current</Pill>
        : <Pill tone="slate" className="shrink-0">Previous</Pill>
      }
    </div>
  );
}

// ── Default fallback masker ───────────────────────────────────────────────────
function defaultMaskPhone(phone, isSuperAdmin) {
  if (!phone) return "—";
  if (isSuperAdmin) return phone;
  const str = String(phone);
  if (str.length <= 2) return "••••••••";
  return "•".repeat(str.length - 2) + str.slice(-2);
}

// ── Default email masker ──────────────────────────────────────────────────────
function defaultMaskEmail(email, isSuperAdmin) {
  if (!email) return null;
  if (isSuperAdmin) return email;
  const atIdx = email.indexOf("@");
  if (atIdx < 0) return "•".repeat(8);
  const local  = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  let maskedLocal;
  if (local.length <= 2) {
    maskedLocal = "•".repeat(local.length);
  } else {
    const mid = Math.max(1, local.length - 4);
    maskedLocal = local.slice(0, 2) + "•".repeat(mid) + local.slice(-2);
  }
  const dotIdx = domain.lastIndexOf(".");
  const maskedDomain = dotIdx > 0
    ? "•".repeat(dotIdx) + domain.slice(dotIdx)
    : "•".repeat(domain.length);
  return `${maskedLocal}@${maskedDomain}`;
}

// ── Main drawer ───────────────────────────────────────────────────────────────
export default function LeadJourneyDrawer({ lead, onClose, isSuperAdmin = false, maskPhone, maskEmail, onLeadUpdated, onToast, showNurtureFields: showNurtureFieldsProp }) {
  // Hooks below must run unconditionally — keep the null check AFTER them.
  const safeLead = lead || {};

  const masker      = maskPhone  || defaultMaskPhone;
  const emailMasker = maskEmail  || defaultMaskEmail;

  // ── Feature gate — show Industry/Service only when leadNurtureSequence is enabled
  // Accepts prop from parent (AdminLeadsPage) or computes internally (UserLeadsPage)
  const { hasFeature } = useEntitlements();
  const showNurtureFields = showNurtureFieldsProp !== undefined
    ? showNurtureFieldsProp
    : hasFeature('leadNurtureSequence');

  // ── AI Action Summary ─────────────────────────────────────────────────────
  const [aiSummary,        setAiSummary]        = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError,   setAiSummaryError]   = useState("");

  const leadId = safeLead._id || safeLead.id || null;

  const fetchActionSummary = async (refresh = false) => {
    if (!leadId) return;
    setAiSummaryLoading(true);
    setAiSummaryError("");
    try {
      const base = isSuperAdmin ? `/lead/admin/${leadId}` : `/lead/admin/${leadId}`;
      const { data } = await api.get(`${base}/action-summary${refresh ? "?refresh=1" : ""}`);
      setAiSummary(data);
    } catch (e) {
      const code = e?.response?.data?.code;
      setAiSummaryError(
        code === "GROK_NOT_CONFIGURED"
          ? "AI summary is not configured on the server."
          : code === "GROK_UNAVAILABLE"
          ? "AI summary service is busy. Please try again."
          : (e?.response?.data?.message || "Could not generate summary."),
      );
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Reset summary when switching leads.
  useEffect(() => {
    setAiSummary(null);
    setAiSummaryError("");
    setAiSummaryLoading(false);
  }, [leadId]);

  const displayPhone          = masker(safeLead.primaryPhone || safeLead.phone || safeLead.mobile, isSuperAdmin);
  const displaySecondaryPhone = safeLead.secondaryPhone ? masker(safeLead.secondaryPhone, isSuperAdmin) : null;
  const displayEmail          = emailMasker(safeLead.email, isSuperAdmin);

  // Raw (unmasked) numbers for tel: / WhatsApp actions. The number stays
  // visually masked for non-superadmins, but the action still needs to dial.
  const rawPrimary   = safeLead.primaryPhone || safeLead.phone || safeLead.mobile || "";
  const rawSecondary = safeLead.secondaryPhone || "";
  // WhatsApp needs international format with no "+". Default missing country
  // code to 91 for bare 10-digit Indian numbers.
  const toWaNumber = (raw) => {
    const d = String(raw || "").replace(/\D/g, "");
    if (!d) return "";
    // Already has country code (12-digit Indian: 91XXXXXXXXXX) — return as-is
    if (d.length === 12 && d.startsWith("91")) return d;
    // Bare 10-digit number — prepend India country code
    if (d.length === 10) return `91${d}`;
    return d;
  };
  const telHref = (raw) => `tel:${String(raw || "").replace(/[^\d+]/g, "")}`;

  const sc = STATUS_COLOR[safeLead.status] || STATUS_COLOR["New"];
  const name = safeLead.name || "Unknown";
  const callHistory    = safeLead.callHistory    || [];
  const scheduledCalls = safeLead.scheduledCalls || [];
  const previousAgents = safeLead.previousAgents || [];
  const meetingRemarks = safeLead.meetingRemarks || [];

  const sortedCalls = useMemo(() =>
    [...callHistory].sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt)),
  [callHistory]);

  const sortedSched = useMemo(() =>
    [...scheduledCalls].sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)),
  [scheduledCalls]);

  const sortedVisits = useMemo(() =>
    [...meetingRemarks].sort((a, b) => new Date(b.metAt) - new Date(a.metAt)),
  [meetingRemarks]);

  const totalCalls   = callHistory.length;
  const lastCallAt   = sortedCalls[0]?.calledAt || null;
  const overdueCalls = scheduledCalls.filter(c => !c.done && new Date(c.scheduledAt) < new Date()).length;

  const allAgents = useMemo(() => {
    const currentAgentName = safeLead.agent;
    const prevNames = new Set(previousAgents.map(a => (typeof a === "string" ? a : a.name)));
    const list = previousAgents.map(a => ({
      ...(typeof a === "object" ? a : { name: a }),
      _isCurrent: (typeof a === "string" ? a : a.name) === currentAgentName,
    }));
    if (currentAgentName && !prevNames.has(currentAgentName)) {
      list.push({ name: currentAgentName, _isCurrent: true });
    }
    return list;
  }, [safeLead.agent, previousAgents]);

  // Render gate — after all hooks so hook order stays stable.
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-[540px] bg-white dark:bg-[#181029] h-full shadow-popover overflow-y-auto scrollbar-thin flex flex-col"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-[15px] font-black shrink-0"
                style={{ background: (sc.dot || "#7E14FF") + "18", color: sc.dot || "#7E14FF" }}
              >
                {name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">{name}</h2>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {displayPhone && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">PRIMARY</span>
                      <span className="text-[11px] font-mono text-slate-400">{displayPhone}</span>
                    </span>
                  )}
                  {displaySecondaryPhone && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">SECONDARY</span>
                      <span className="text-[11px] font-mono text-slate-400">{displaySecondaryPhone}</span>
                    </span>
                  )}
                  {displayEmail && (
                    <span className="text-[11px] text-slate-400 font-mono">{displayEmail}</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="icon-btn border border-slate-200 dark:border-white/10 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
              {lead.status}
            </span>
            {lead.Quality && TEMP_STYLE[lead.Quality] && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${TEMP_STYLE[lead.Quality].bg} ${TEMP_STYLE[lead.Quality].text}`}>
                {(() => { const I = TEMP_ICON[lead.Quality]; return I ? <I className="w-3 h-3" /> : null; })()} {lead.Quality}
              </span>
            )}
            {lead.agent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <User className="w-3 h-3" /> {lead.agent}
              </span>
            )}
            {lead.reassignCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                <RefreshCw className="w-3 h-3" /> Reassigned {lead.reassignCount}×
              </span>
            )}
          </div>
          {safeLead.isClosed && (
            <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                  Closed Lead{safeLead.closedAt ? ` · ${fmtDateTime(safeLead.closedAt)}` : ""}
                </p>
                {safeLead.closeReason && (
                  <p className="text-[12px] text-rose-600 dark:text-rose-300 break-words">
                    Reason: {safeLead.closeReason}
                  </p>
                )}
              </div>
            </div>
          )}
          {lead.leadScore != null && (
            <div className="mt-2">
              <QualificationScore lead={lead} size="md" />
            </div>
          )}
        </div>

        {/* ── Quick stats ── */}
        <div className="px-6 py-4 grid grid-cols-2 gap-2 border-b border-slate-200 dark:border-white/10">
          {[
            { label: "Calls Made",    value: totalCalls,                               color: "#0891B2" },
            { label: "Last Activity", value: lastCallAt ? daysSince(lastCallAt) : "—", color: "#7E14FF" },
          ].map(item => (
            <div key={item.label} className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-2.5 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">{item.label}</p>
              <p className="text-[14px] font-black" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 flex-1 space-y-6">

          {/* ── AI Action Summary ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel icon={<Sparkles className="w-3.5 h-3.5" />} label="AI Action Summary" />
              {aiSummary && !aiSummaryLoading && (
                <button
                  onClick={() => fetchActionSummary(true)}
                  className="text-[11px] font-semibold text-launcher-600 dark:text-launcher-400 flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
              )}
            </div>

            {!aiSummary && !aiSummaryLoading && !aiSummaryError && (
              <button
                onClick={() => fetchActionSummary(false)}
                className="btn-primary btn-md w-full"
              >
                <Sparkles className="w-4 h-4" /> Generate Summary &amp; Next Action
              </button>
            )}

            {aiSummaryLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-launcher-600 dark:text-launcher-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-[13px] font-semibold">Analyzing remarks…</span>
              </div>
            )}

            {!!aiSummaryError && !aiSummaryLoading && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3 py-2.5">
                <p className="text-[12px] text-rose-600 dark:text-rose-400 mb-1.5">{aiSummaryError}</p>
                <button onClick={() => fetchActionSummary(false)} className="text-[12px] font-semibold text-rose-700 dark:text-rose-300 hover:underline">Retry</button>
              </div>
            )}

            {aiSummary && !aiSummaryLoading && (
              <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/60 dark:bg-violet-500/5 p-4">
                <p className="text-[13px] text-slate-900 dark:text-slate-100 leading-relaxed">{aiSummary.summary}</p>

                {!!aiSummary.nextAction && (
                  <div className="mt-3 rounded-lg bg-white/70 dark:bg-[#181029]/70 border border-violet-200/60 dark:border-violet-500/15 px-3 py-2.5">
                    <p className="text-[10px] font-extrabold tracking-widest text-launcher-600 dark:text-launcher-400 mb-1">NEXT ACTION</p>
                    <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">{aiSummary.nextAction}</p>
                  </div>
                )}

                {Array.isArray(aiSummary.keyPoints) && aiSummary.keyPoints.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {aiSummary.keyPoints.map((p, i) => (
                      <li key={i} className="text-[12px] text-slate-600 dark:text-slate-300 flex gap-1.5">
                        <span className="text-launcher-500">•</span><span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {!!aiSummary.sentiment && (
                    <Pill tone="violet">{aiSummary.sentiment}</Pill>
                  )}
                  {!!aiSummary.suggestedTemp && (
                    <Pill tone="amber">Suggested: {aiSummary.suggestedTemp}</Pill>
                  )}
                  <span className="text-[10px] text-slate-400 ml-auto">
                    {aiSummary.basedOn === "remarks+calls" ? "From remarks + calls" : "From remarks"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Contact Numbers ── */}
          <div>
            <SectionLabel icon={<Phone className="w-3.5 h-3.5" />} label="Contact Numbers" />
            <div className="space-y-2">

              {/* Primary Number */}
              <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">PRIMARY</span>
                  <span className="text-[13px] font-mono font-semibold text-slate-900 dark:text-white">{displayPhone}</span>
                </div>
              </div>

              {/* Secondary Number */}
              {lead.secondaryPhone ? (
                <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 shrink-0">SECONDARY</span>
                    <span className="text-[13px] font-mono font-semibold text-slate-900 dark:text-white">{displaySecondaryPhone}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-400">ADDITIONAL</span>
                  <span className="text-[12px] text-slate-400 italic">Not set</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Lead Details ── */}
          <div>
            <SectionLabel icon={<ClipboardList className="w-3.5 h-3.5" />} label="Lead Details" />
            <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
              {[
                { label: "Source",           value: lead.source || "—" },
                { label: "Campaign",         value: lead.campaign && lead.campaign !== "—" ? lead.campaign : "—" },
                ...(showNurtureFields ? [
                  { label: "Industry",       value: lead.industry || "—" },
                  { label: "Service",        value: lead.service  || "—" },
                ] : []),
                { label: "Ad Set",           value: lead.adSetName || "—" },
                { label: "Primary Number",   value: displayPhone },
                ...(displaySecondaryPhone ? [{ label: "Secondary Number", value: displaySecondaryPhone }] : []),
                { label: "Created",          value: fmtDateTime(lead._raw_date || lead.createdAt) },
                { label: "Lead Date",        value: lead.date || "—" },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? "border-t border-slate-100 dark:border-white/[0.06]" : ""}`}
                >
                  <span className="text-[11px] text-slate-400">{row.label}</span>
                  <span className="text-[12px] font-semibold text-slate-900 dark:text-white text-right max-w-[220px] truncate">
                    {row.value}
                  </span>
                </div>
              ))}

              {lead.projects && lead.projects.length > 0 && (
                <div className="border-t border-slate-100 dark:border-white/[0.06] px-4 py-2.5">
                  <span className="text-[11px] text-slate-400 block mb-1.5">Projects</span>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.projects.map((p, i) => {
                      const pName  = p?.name  || "Project";
                      const pColor = p?.color || "#7E14FF";
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                          style={{ background: pColor + "18", color: pColor }}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pColor }} />
                          {pName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {lead.remark && (
                <div className="border-t border-slate-100 dark:border-white/[0.06] px-4 py-2.5">
                  <span className="text-[11px] text-slate-400 block mb-1">Latest Remark</span>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 italic leading-relaxed">"{lead.remark}"</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Call History ── */}
          <div>
            <SectionLabel icon={<Phone className="w-3.5 h-3.5" />} label={`Call History (${sortedCalls.length})`} />
            {sortedCalls.length > 0 ? (
              sortedCalls.map((call, i) => (
                <CallCard key={i} call={call} displayIndex={i + 1} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2 bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                <span className="text-slate-300 dark:text-slate-600"><Inbox className="w-7 h-7" strokeWidth={1.5} /></span>
                <p className="text-[12px] text-slate-400">No calls recorded yet</p>
              </div>
            )}
          </div>

          {/* ── Client Visits (field meetings logged from mobile) ── */}
          {sortedVisits.length > 0 && (
            <div>
              <SectionLabel icon={<MapIcon className="w-3.5 h-3.5" />} label={`Client Visits (${sortedVisits.length})`} />
              {sortedVisits.map((v, i) => (
                <MeetingCard key={v._id || i} visit={v} />
              ))}
            </div>
          )}

          {/* ── Scheduled / Follow-up Calls ── */}
          {sortedSched.length > 0 && (
            <div>
              <SectionLabel icon={<CalendarDays className="w-3.5 h-3.5" />} label={`Follow-ups & Scheduled Calls (${sortedSched.length})`} />
              {sortedSched.map((s, i) => (
                <ScheduledCard key={i} sc={s} />
              ))}
            </div>
          )}

          {/* ── Employee History ── */}
          {allAgents.length > 0 && (
            <div>
              <SectionLabel icon={<Users className="w-3.5 h-3.5" />} label={`Employee History (${allAgents.length})`} />
              <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2">
                {allAgents.map((ag, i) => (
                  <EmployeeCard key={i} agent={ag} isCurrent={ag._isCurrent} />
                ))}
              </div>
            </div>
          )}

          {/* ── Current Status Summary ── */}
          <div>
            <SectionLabel icon={<BarChart3 className="w-3.5 h-3.5" />} label="Current Status Summary" />
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: sc.dot + "40", background: sc.dot + "08" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]"
                  style={{ background: sc.dot + "15" }}
                >
                  {lead.status === "Converted"        ? <PartyPopper className="w-5 h-5" />
                   : lead.status === "Not Interested" ? <XCircle className="w-5 h-5" />
                   : lead.status === "In Progress"    ? <Zap className="w-5 h-5" />
                   : <Sparkles className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: sc.dot }}>{lead.status}</p>
                  <p className="text-[10px] text-slate-400">
                    {lead.status === "Converted"      ? "Successfully converted to customer" :
                     lead.status === "Not Interested" ? "Lead declined the offer" :
                     lead.status === "In Progress"    ? `Active — ${totalCalls} call${totalCalls !== 1 ? "s" : ""} made` :
                     "Newly added, awaiting first contact"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2.5">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-1">Total Interactions</p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {totalCalls} call{totalCalls !== 1 ? "s" : ""} + {scheduledCalls.length} scheduled
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2.5">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-1">Lead Age</p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {lead._raw_date || lead.createdAt ? daysSince(lead._raw_date || lead.createdAt) : "—"}
                  </p>
                </div>
              </div>

              {overdueCalls > 0 && (
                <div className="mt-2.5 flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
                  <span className="text-rose-500"><AlertTriangle className="w-3.5 h-3.5" /></span>
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    {overdueCalls} overdue follow-up{overdueCalls > 1 ? "s" : ""} — action needed
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
