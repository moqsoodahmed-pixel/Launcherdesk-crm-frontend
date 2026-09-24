// ── src/components/ui/Primitives.jsx ─────────────────────────────────────────
// Small, dependency-free presentational building blocks shared by the
// redesigned Super Admin surfaces. These carry NO business logic and fetch
// nothing — they only render whatever data / handlers are passed to them —
// so they're safe to reuse anywhere without touching API or state code.

/**
 * Soft-filled status/role pill. Purely presentational.
 * `tone` maps to a small set of premium color pairings.
 */
const TONE_STYLES = {
    brand: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
};

export function Pill({ tone = "slate", icon: Icon, dot, children, className = "" }) {
    return (
        <span className={`badge ${TONE_STYLES[tone] || TONE_STYLES.slate} ${className}`}>
            {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
            {Icon && <Icon className="w-3 h-3 shrink-0" />}
            {children}
        </span>
    );
}

/** Tiny inline trend indicator — up/down arrow + text, no fabricated data. */
export function Trend({ up, children }) {
    return (
        <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {children}
        </span>
    );
}

/** Consistent avatar-initials circle used across sidebar / dashboard / modals. */
export function Avatar({ name, size = 8, className = "" }) {
    const initials = (name || "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    return (
        <div
            className={`shrink-0 rounded-full flex items-center justify-center font-bold text-white bg-brand-gradient ${className}`}
            style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: `${Math.max(size * 1.25, 10)}px` }}
        >
            {initials}
        </div>
    );
}