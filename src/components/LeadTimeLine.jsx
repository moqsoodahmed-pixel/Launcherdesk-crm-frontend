// Full lead journey timeline component
// Shows: Created → Assigned → Status changes (from callHistory) → Scheduled calls → Converted/NI
export default function LeadTimeline({ lead }) {
  if (!lead) return null;

  const events = [];

  // 1. Lead created
  events.push({
    type: "created",
    icon: "",
    color: "#7E14FF", // launcher brand violet
    title: "Lead Created",
    subtitle: `Source: ${lead.source || "—"}  •  Campaign: ${lead.campaign || "—"}`,
    time: lead.createdAt || lead.date,
  });

  // 2. Assigned to agent
  if (lead.user) {
    events.push({
      type: "assigned",
      icon: "",
      color: "#9333EA", // violet/purple
      title: `Assigned to ${lead.user?.name || lead.agent || "Employee"}`,
      subtitle: lead.user?.email || "",
      time: lead.createdAt || lead.date,
    });
  }

  // 3. Call history entries
  (lead.callHistory || []).forEach((h, i) => {
    events.push({
      type: "call",
      icon: "",
      color: h.outcome === "Not Interested" ? "#E11D48" : "#059669",
      title: `Called by ${h.userName || "Employee"}`,
      subtitle: `Outcome: ${h.outcome || "—"}  •  Remark: ${h.remark || "—"}`,
      time: h.calledAt,
    });
  });

  // 4. Scheduled calls
  (lead.scheduledCalls || []).forEach((sc, i) => {
    events.push({
      type: sc.done ? "schedule_done" : "schedule_pending",
      icon: sc.done ? "" : "",
      color: sc.done ? "#059669" : "#D97706",
      title: `${sc.type === "follow-up" ? "Follow-up" : "Verification"} Call ${sc.done ? "(Done)" : "(Scheduled)"}`,
      subtitle: `${sc.note || ""}  •  ${formatDate(sc.scheduledAt)}${sc.doneAt ? `  •  Completed: ${formatDate(sc.doneAt)}` : ""}`,
      time: sc.scheduledAt,
    });
  });

  // Sort by time
  events.sort((a, b) => new Date(a.time) - new Date(b.time));

  // 5. Final status at end
  events.push({
    type: "status",
    icon: lead.status === "Converted" ? "" : lead.status === "Not Interested" ? "" : "",
    color: lead.status === "Converted" ? "#059669" : lead.status === "Not Interested" ? "#E11D48" : "#D97706",
    title: `Current Status: ${lead.status}`,
    subtitle: `Quality: ${lead.Quality || "Not set"}  •  Remark: ${lead.remark || "—"}`,
    time: lead.updatedAt,
  });

  return (
    <div className="relative pl-6">
      {/* Vertical connector line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-white/10" />

      {events.map((ev, i) => (
        <div key={i} className="relative flex gap-4 mb-5 last:mb-0">
          {/* Dot */}
          <div
            className="absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-white dark:border-[#181029] flex items-center justify-center text-[10px] shrink-0"
            style={{ background: ev.color }}
          >
            {ev.icon}
          </div>
          {/* Content */}
          <div className="flex-1 surface-card !rounded-xl p-3">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{ev.title}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{ev.subtitle}</p>
            <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">{formatDate(ev.time)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
