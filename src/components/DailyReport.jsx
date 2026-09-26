// frontend/src/components/DailyReport.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin Daily Report — consumes /api/reports/daily exclusively.
// ALL aggregation removed from frontend; backend (reportService.js) is
// the single source of truth for every count shown here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Phone, AlertTriangle, CalendarDays } from 'lucide-react';
import { getRole } from '../data/dataService';
import { useDailyReport } from '../hooks/useDailyReport';
import { useDailyOutcomesReport } from '../hooks/useDailyOutcomesReport';
import useEntitlements from '../hooks/useEntitlements';
import { addDays, formatLong, formatMedium, isToday } from '../utils/dateUtils';

// ── Phone masking ─────────────────────────────────────────────────────────────
function maskPhone(phone, isSuperAdmin) {
  if (!phone) return '—';
  if (isSuperAdmin) return phone;
  const s = String(phone);
  return s.length <= 2 ? '••••••••' : '•'.repeat(s.length - 2) + s.slice(-2);
}

// ── Style maps ────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  'Converted':      { bg: 'bg-[#ECFDF5] dark:bg-[#052E1C]',   text: 'text-[#065F46] dark:text-[#34D399]', dot: '#059669' },
  'In Progress':    { bg: 'bg-[#FFFBEB] dark:bg-[#2D1F00]',   text: 'text-[#92400E] dark:text-[#FCD34D]', dot: '#D97706' },
  'Not Interested': { bg: 'bg-[#FEF2F2] dark:bg-[#2D0A0A]',   text: 'text-[#991B1B] dark:text-[#F87171]', dot: '#DC2626' },
  'New':            { bg: 'bg-[#F3EBFF] dark:bg-[#271449]',   text: 'text-[#7E14FF] dark:text-[#A46BFF]', dot: '#7E14FF' },
};
const SOURCE_COLORS = ['#7E14FF','#7E14FF','#0891B2','#059669','#D97706','#DC2626','#0D9488','#9333EA'];

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, trend }) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-4 border border-white/70 dark:border-white/[0.06] ld-card bg-white dark:bg-[#181029] flex flex-col gap-1.5"
      style={{ backgroundImage: `linear-gradient(145deg, ${color}1F 0%, ${color}08 55%, transparent 100%)` }}>
      <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: color }} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-[#4A3F66] dark:text-[#C6BBDC] uppercase tracking-wide">{label}</span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[12px] font-bold shrink-0 shadow-sm" style={{ background: color }}>{icon}</span>
      </div>
      <div className="font-display text-[28px] font-bold tracking-tight leading-none" style={{ color }}>{value ?? '—'}</div>
      {sub && <div className="text-[11px] text-[#7D7296] dark:text-[#C6BBDC]">{sub}</div>}
      {trend !== undefined && (
        <div className={`text-[11px] font-semibold ${trend >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)} vs yesterday
        </div>
      )}
    </div>
  );
}

function Card({ title, badge, bc, children, action }) {
  return (
    <div className="bg-white dark:bg-[#181029] border border-[#E7DCFA] dark:border-[#2B1E48] rounded-2xl ld-card overflow-hidden">
      <div className="px-5 py-4 border-b border-[#EFE7FD] dark:border-[#2B1E48] flex items-center gap-2">
        <h2 className="font-display text-[16px] font-semibold tracking-tight text-[#170B29] dark:text-[#F4EEFF] flex-1">{title}</h2>
        {badge !== undefined && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: (bc || '#7E14FF') + '20', color: bc || '#7E14FF' }}>{badge}</span>
        )}
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FunnelBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[#4A3F66] dark:text-[#9A8DB6]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#170B29] dark:text-[#F4EEFF]">{value}</span>
          <span className="text-[10px] text-[#7D7296] dark:text-[#564C70] w-8 text-right">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-[#F3EBFF] dark:bg-[#2B1E48] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="bg-[#FAF7FF] dark:bg-[#0B0715] min-h-screen px-4 sm:px-6 py-8 animate-pulse">
      <div className="h-8 w-48 bg-[#E7DCFA] dark:bg-[#2B1E48] rounded-xl mb-3" />
      <div className="h-4 w-64 bg-[#E7DCFA] dark:bg-[#2B1E48] rounded-xl mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => <div key={i} className="bg-white dark:bg-[#181029] border border-[#E7DCFA] dark:border-[#2B1E48] rounded-2xl h-24" />)}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DailyReport() {
  const [tab,      setTab]      = useState('overview');
  const [viewDate, setViewDate] = useState(new Date());

  const viewingToday = isToday(viewDate);
  const role         = getRole();
  const isSuperAdmin = role === 'superadmin';

  const { data, loading, error, refresh } = useDailyReport({ date: viewDate });
  const { hasFeature } = useEntitlements();
  const showOutcomesTab = hasFeature('callOutcomesReport');
  const {
    data: outcomesData,
    loading: outcomesLoading,
    error: outcomesError,
    refresh: refreshOutcomes,
  } = useDailyOutcomesReport({ date: viewDate, enabled: showOutcomesTab });

  const summary     = data?.summary     || {};
  const leads       = data?.leads       || [];
  const sources     = data?.sources     || [];
  const employees   = data?.employees   || [];
  const followUps   = data?.followUps   || [];
  const missingFollowUps = data?.missingFollowUps || [];
  const conversions = data?.conversions || [];

  const goBack    = () => setViewDate(d => addDays(d, -1));
  const goForward = () => { if (!viewingToday) setViewDate(d => addDays(d, 1)); };
  const goToday   = () => setViewDate(new Date());

  const maxEmpLeads = Math.max(...employees.map(e => e.leads), 1);

  // Export CSV from backend data
  const exportCSV = () => {
    if (leads.length === 0) { alert('No leads to export for this date.'); return; }
    const headers = ['#', 'Name', 'Phone', 'Source', 'Campaign', 'Employee', 'Status', 'Date', 'Remark'].join(',');
    const rows = leads.map((l, i) =>
      [i + 1, l.name, isSuperAdmin ? (l.mobile || '') : maskPhone(l.mobile, false),
       l.source, l.campaign || '', l.assignedUserName || 'Unassigned',
       l.status, l.date ? new Date(l.date).toLocaleDateString('en-IN') : '', l.remark || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `daily_report_${data?.date || 'export'}.csv`,
    });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const TABS = [
    { k: 'overview',    l: 'Overview',          count: null },
    { k: 'agents',      l: 'Employee Activity',  count: employees.filter(e => e.callsToday > 0 || e.leads > 0).length },
    { k: 'leads',       l: 'New Leads',          count: leads.length },
    { k: 'followups',   l: 'Follow-ups',         count: followUps.filter(f => f.urgency !== 'upcoming').length + missingFollowUps.length },
    { k: 'conversions', l: 'Conversions',        count: conversions.length },
    ...(showOutcomesTab
      ? [{ k: 'outcomes', l: 'Call Outcomes', count: outcomesData?.summary?.totalCalls || 0 }]
      : []),
  ];

  if (loading) return <Skeleton />;

  return (
    <div className="ld-canvas min-h-screen font-poppins px-4 sm:px-6 py-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="ld-hero rounded-3xl px-5 sm:px-7 py-5 sm:py-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full inline-block ${viewingToday ? 'bg-[#6EE7B7] animate-pulse' : 'bg-white/60'}`} />
            <span className={`text-[12px] font-semibold ${viewingToday ? 'text-[#A7F3D0]' : 'text-white/70'}`}>
              {viewingToday ? 'Live report' : 'Historical report'}
            </span>
          </div>
          <h1 className="font-display text-[24px] sm:text-[28px] font-bold tracking-tight text-white">Daily Report</h1>
          <p className="text-[13px] sm:text-[14px] text-white/75 mt-0.5">{formatLong(viewDate)}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white/15 border border-white/25 rounded-xl p-1">
            <button onClick={goBack} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={goToday}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${viewingToday ? 'bg-white text-[#6300D6] shadow-sm' : 'text-white hover:bg-white/20'}`}>
              {viewingToday ? 'Today' : formatMedium(viewDate)}
            </button>
            <button onClick={goForward} disabled={viewingToday}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 border border-white/25 text-[12px] font-semibold text-white hover:bg-white/25 transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
          {/* <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7E14FF] text-white text-[12px] font-semibold hover:bg-[#6300D6] transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export CSV
          </button> */}
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p className="text-[12px] font-semibold text-red-600 dark:text-red-400 flex-1">{error}</p>
          <button onClick={refresh} className="text-red-600 dark:text-red-400 underline text-[11px] font-semibold">Retry</button>
        </div>
      )}

      {leads.length === 0 && !error && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F3EBFF] dark:bg-[#271449] border border-[#D5BDFF] dark:border-[#4A2A85]">
          <svg className="w-4 h-4 text-[#7E14FF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/></svg>
          <p className="text-[12px] font-semibold text-[#6300D6] dark:text-[#A46BFF]">
            No leads for {formatMedium(viewDate)}.{viewingToday ? ' New leads will appear here as they come in.' : ' Try another date.'}
          </p>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#181029] border border-[#E7DCFA] dark:border-[#2B1E48] rounded-2xl ld-card p-1.5 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition
              ${tab === t.k ? 'bg-gradient-to-br from-[#863BFF] to-[#6300D6] text-white shadow-[0_6px_16px_-6px_rgba(126,20,255,0.6)]' : 'text-[#4A3F66] dark:text-[#9A8DB6] hover:bg-[#F3EBFF] dark:hover:bg-[#21253A]'}`}>
            {t.l}
            {t.count !== null && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t.k ? 'bg-white/20 text-white' : 'bg-[#F3EBFF] dark:bg-[#271449] text-[#7E14FF] dark:text-[#A46BFF]'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════ OVERVIEW ════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="New Leads"   value={summary.total}      sub="Received today"                       color="#7E14FF" icon="↑" trend={summary.trendTotal} />
            <StatCard label="Contacted"   value={summary.contacted}  sub={`${summary.newLeads || 0} not reached`} color="#0891B2" icon={<Phone className="w-3.5 h-3.5" />} />
            <StatCard label="Converted"   value={summary.converted}  sub={`${summary.convRate || 0}% rate`}     color="#059669" icon="✓" trend={summary.trendConverted} />
            <StatCard label="In Progress" value={summary.inProgress} sub="Active follow-ups"                    color="#D97706" icon="⟳" />
            <StatCard label="Unassigned"  value={summary.unassigned} sub="Needs assignment"                     color="#DC2626" icon="!" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Conversion funnel">
              <div className="space-y-3">
                <FunnelBar label="New leads"      value={summary.total || 0}         total={summary.total || 0} color="#7E14FF" />
                <FunnelBar label="Contacted"      value={summary.contacted || 0}     total={summary.total || 0} color="#0891B2" />
                <FunnelBar label="In Progress"    value={summary.inProgress || 0}    total={summary.total || 0} color="#D97706" />
                <FunnelBar label="Converted"      value={summary.converted || 0}     total={summary.total || 0} color="#059669" />
                <FunnelBar label="Not Interested" value={summary.notInterested || 0} total={summary.total || 0} color="#DC2626" />
              </div>
              {(summary.total || 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E7DCFA] dark:border-[#2B1E48] flex items-center justify-between">
                  <span className="text-[12px] text-[#7D7296]">Conversion rate</span>
                  <span className="text-[20px] font-bold text-[#059669] dark:text-[#34D399]">{summary.convRate || 0}%</span>
                </div>
              )}
            </Card>

            <Card title="Leads by source" badge={summary.total} bc="#7E14FF">
              {sources.length === 0 ? (
                <p className="text-[13px] text-[#7D7296] py-8 text-center">No leads for this date.</p>
              ) : (
                <div className="space-y-3.5">
                  {sources.map((s, i) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                          <span className="text-[12px] text-[#4A3F66] dark:text-[#9A8DB6]">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#170B29] dark:text-[#F4EEFF]">{s.count}</span>
                          <span className="text-[10px] text-[#7D7296] w-8 text-right">
                            {Math.round(s.count / (summary.total || 1) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#F3EBFF] dark:bg-[#2B1E48] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.round(s.count / (summary.total || 1) * 100)}%`, background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Status breakdown">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'New',            value: summary.newLeads || 0,      ...STATUS_STYLE['New'] },
                  { label: 'In Progress',    value: summary.inProgress || 0,    ...STATUS_STYLE['In Progress'] },
                  { label: 'Converted',      value: summary.converted || 0,     ...STATUS_STYLE['Converted'] },
                  { label: 'Not Interested', value: summary.notInterested || 0, ...STATUS_STYLE['Not Interested'] },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl px-4 py-4 flex items-center justify-between gap-3 ${s.bg}`}>
                    <span className={`text-[34px] font-bold leading-none shrink-0 ${s.text}`}>{s.value}</span>
                    <div className="flex flex-col items-end">
                      <span className={`text-[12px] font-semibold text-right ${s.text}`}>{s.label}</span>
                      <span className={`text-[10px] mt-1 text-right ${s.text} opacity-60`}>
                        {Math.round(s.value / (summary.total || 1) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════ EMPLOYEE ACTIVITY ════════════════ */}
      {tab === 'agents' && (
        <Card title="Employee activity today" badge={`${employees.filter(e => e.callsToday > 0 || e.leads > 0).length}/${employees.length} active`} bc="#059669">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E7DCFA] dark:border-[#2B1E48]">
                  {['Employee', 'Leads', 'Calls Today', 'In Progress', 'Converted', 'Conv. Rate'].map(h => (
                    <th key={h} className="text-left pb-3 pr-6 text-[11px] font-semibold text-[#7D7296] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((e, i) => {
                  const rate    = e.leads > 0 ? Math.round((e.converted / e.leads) * 100) : 0;
                  const active  = e.callsToday > 0 || e.leads > 0;
                  return (
                    <tr key={i} className={`border-b border-[#E7DCFA] dark:border-[#2B1E48] last:border-0 ${!active ? 'opacity-40' : ''}`}>
                      <td className="py-3.5 pr-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#F3EBFF] dark:bg-[#271449] flex items-center justify-center text-[10px] font-bold text-[#7E14FF] shrink-0">
                            {(e.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#170B29] dark:text-[#F4EEFF]">{e.name || 'Unassigned'}</div>
                            <div className="text-[10px] text-[#7D7296]">{active ? 'Active today' : 'No activity'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-6 font-bold text-[#170B29] dark:text-[#F4EEFF]">{e.leads}</td>
                      <td className="py-3.5 pr-6"><span className="font-bold text-[#7E14FF]">{e.callsToday}</span></td>
                      <td className="py-3.5 pr-6"><span className="font-semibold text-[#D97706]">{e.inProgress}</span></td>
                      <td className="py-3.5 pr-6"><span className="font-bold text-[#059669]">{e.converted}</span></td>
                      <td className="py-3.5 pr-6">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#F3EBFF] dark:bg-[#2B1E48] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#059669]" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-[12px] font-semibold text-[#059669]">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ════════════════ NEW LEADS ════════════════ */}
      {tab === 'leads' && (
        <Card title="Leads for this day" badge={leads.length} bc="#7E14FF">
          {leads.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[13px] text-[#7D7296]">No leads for {formatMedium(viewDate)}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((l, i) => {
                const st       = STATUS_STYLE[l.status] || STATUS_STYLE['New'];
                const srcColor = SOURCE_COLORS[i % SOURCE_COLORS.length];
                return (
                  <div key={String(l._id || i)} className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E7DCFA] dark:border-[#2B1E48] hover:bg-[#FAF7FF] dark:hover:bg-[#120B22] transition">
                    <div className="w-9 h-9 rounded-full bg-[#F3EBFF] dark:bg-[#271449] flex items-center justify-center text-[11px] font-bold text-[#7E14FF] shrink-0">
                      {(l.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#170B29] dark:text-[#F4EEFF]">{l.name}</span>
                        <span className="text-[11px] text-[#7D7296] font-mono">{maskPhone(l.mobile, isSuperAdmin)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: srcColor + '20', color: srcColor }}>{l.source}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.text}`}>{l.status}</span>
                        {l.remark && <span className="text-[11px] text-[#7D7296] truncate max-w-[160px] italic">{l.remark}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {l.assignedUserName ? (
                        <div>
                          <div className="text-[11px] font-semibold text-[#4A3F66] dark:text-[#9A8DB6]">{l.assignedUserName}</div>
                          <div className="text-[10px] text-[#7D7296]">Assigned</div>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-[#FFFBEB] dark:bg-[#2D1F00] text-[#D97706] text-[10px] font-bold">Unassigned</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ════════════════ FOLLOW-UPS ════════════════ */}
      {tab === 'followups' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total"    value={followUps.length}                                      sub="Pending follow-ups"  color="#D97706" icon="⟳" />
            <StatCard label="Overdue"  value={followUps.filter(f => f.urgency === 'overdue').length}  sub="Past due date"       color="#DC2626" icon="!" />
            <StatCard label="Due Today" value={followUps.filter(f => f.urgency === 'today').length}   sub="Need call today"     color="#D97706" icon={<Phone className="w-3.5 h-3.5" />} />
            <StatCard label="Upcoming" value={followUps.filter(f => f.urgency === 'upcoming').length} sub="Scheduled ahead"     color="#7E14FF" icon="↑" />
          </div>
          <Card title="Pending follow-ups" badge={followUps.length} bc="#D97706">
            {followUps.length === 0 ? (
              <p className="text-[13px] text-[#7D7296]">No pending follow-ups.</p>
            ) : (
              <div className="space-y-3">
                {followUps.map((f, i) => {
                  const isOverdue = f.urgency === 'overdue';
                  const isToday_  = f.urgency === 'today';
                  const cardBorder = isOverdue
                    ? 'border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20'
                    : isToday_
                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-[#E7DCFA] dark:border-[#2B1E48]';
                  const badgeCls = isOverdue
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                    : isToday_
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                    : 'bg-violet-100 dark:bg-blue-900/40 text-violet-600 dark:text-violet-300';
                  return (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${cardBorder}`}>
                      <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: f.dotColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between flex-wrap gap-2 mb-1.5">
                          <div>
                            <span className="text-[13px] font-semibold text-[#170B29] dark:text-[#F4EEFF]">{f.name}</span>
                            <span className="text-[11px] text-[#7D7296] ml-2 font-mono">{maskPhone(f.mobile, isSuperAdmin)}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${badgeCls}`}>
                            {isOverdue && <AlertTriangle className="w-3 h-3" />}{isToday_ && <Phone className="w-3 h-3" />}{!isOverdue && !isToday_ && <CalendarDays className="w-3 h-3" />} {f.daysLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-[#4A3F66] dark:text-[#9A8DB6] italic truncate">{f.note || 'Follow-up required'}</p>
                          <span className="text-[11px] text-[#7D7296] shrink-0">{f.assignedUser || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* ── No follow-up date ever set (24h+) ─────────────────────────── */}
          <Card title="No follow-up date set (24h+)" badge={missingFollowUps.length} bc="#DC2626">
            {missingFollowUps.length === 0 ? (
              <p className="text-[13px] text-[#7D7296]">
                Every lead from {formatMedium(viewDate)} that's 24h+ old has a follow-up scheduled. 🎉
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-[#7D7296] mb-1">
                  These leads never had a follow-up date set — the assigned employee gets an automatic reminder every 24 hours until one is added. Excludes "Not Interested" and "Converted".
                </p>
                {missingFollowUps.map((f) => (
                  <div key={f._id} className="flex items-start gap-3 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
                        <div>
                          <span className="text-[13px] font-semibold text-[#170B29] dark:text-[#F4EEFF]">{f.name}</span>
                          <span className="text-[11px] text-[#7D7296] ml-2 font-mono">{maskPhone(f.mobile, isSuperAdmin)}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                          {f.hoursSinceCreated}h with no follow-up
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#4A3F66] dark:text-[#9A8DB6]">{f.status}</span>
                        <span className="text-[11px] text-[#7D7296] shrink-0">{f.assignedUser || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════ CONVERSIONS ════════════════ */}
      {tab === 'conversions' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Deals Closed"  value={conversions.length}       sub={formatMedium(viewDate)} color="#059669" icon="✓" />
            <StatCard label="Conv. Rate"    value={`${summary.convRate || 0}%`} sub="For this day"          color="#7E14FF" icon="~" />
            <StatCard label="Calls Today"   value={summary.callsMadeToday || 0} sub="Total calls made"     color="#7E14FF" icon={<Phone className="w-3.5 h-3.5" />} />
            <StatCard label="Total Leads"   value={summary.total || 0}        sub="For this date"          color="#D97706" icon="Σ" />
          </div>

          <Card title="Conversions on this day" badge={conversions.length} bc="#059669">
            {conversions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[13px] text-[#7D7296]">No conversions for {formatMedium(viewDate)}.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversions.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-[#ECFDF5] dark:bg-[#052E1C] border border-[#D1FAE5] dark:border-[#065F46]">
                    <div className="w-9 h-9 rounded-full bg-[#059669] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      {(l.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#065F46] dark:text-[#34D399]">{l.name}</span>
                        {l.campaign && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/50 text-[#065F46] font-medium">{l.campaign}</span>}
                      </div>
                      <div className="text-[11px] text-[#059669] opacity-80 mt-0.5">
                        {l.assignedUserName || 'Unassigned'} · {l.source}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#059669] text-white shrink-0">Converted</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════ CALL OUTCOMES (Answered / Not Answered) ═══════════ */}
      {tab === 'outcomes' && showOutcomesTab && (
        <div className="space-y-5">
          {outcomesError && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="text-[12px] font-semibold text-red-600 dark:text-red-400 flex-1">{outcomesError}</p>
              <button onClick={refreshOutcomes} className="text-red-600 dark:text-red-400 underline text-[11px] font-semibold">Retry</button>
            </div>
          )}

          {outcomesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-white dark:bg-[#181029] border border-[#E7DCFA] dark:border-[#2B1E48] rounded-2xl h-24 animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Calls"    value={outcomesData?.summary?.totalCalls ?? 0}   sub={formatMedium(viewDate)}       color="#7E14FF" icon={<Phone className="w-3.5 h-3.5" />} />
                <StatCard label="Answered"       value={outcomesData?.summary?.answered ?? 0}     sub="Calls picked up"               color="#059669" icon="✓" />
                <StatCard label="Not Answered"   value={outcomesData?.summary?.notAnswered ?? 0}  sub="Missed / Busy / Switch Off"     color="#DC2626" icon="✕" />
                <StatCard label="Answer Rate"    value={`${outcomesData?.summary?.answerRate ?? 0}%`} sub="Answered ÷ total calls"    color="#7E14FF" icon="~" />
              </div>

              <Card title="Breakdown by outcome" badge={outcomesData?.outcomes?.length || 0} bc="#7E14FF">
                {(!outcomesData?.outcomes || outcomesData.outcomes.length === 0) ? (
                  <div className="py-12 text-center">
                    <p className="text-[13px] text-[#7D7296]">No calls logged for {formatMedium(viewDate)}.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outcomesData.outcomes.map((o) => (
                      <FunnelBar
                        key={o.outcome}
                        label={o.outcome}
                        value={o.count}
                        total={outcomesData.summary.totalCalls}
                        color={
                          o.outcome === 'Answered' ? '#059669' :
                          o.outcome === 'Not Answered' ? '#DC2626' :
                          o.outcome === 'Busy' ? '#D97706' :
                          o.outcome === 'Switch Off' ? '#7E14FF' :
                          '#7E14FF'
                        }
                      />
                    ))}
                  </div>
                )}
              </Card>

              {isSuperAdmin && outcomesData?.agents?.length > 0 && (
                <Card title="By agent" badge={outcomesData.agents.length} bc="#7E14FF">
                  <div className="space-y-2">
                    {outcomesData.agents
                      .sort((a, b) => b.total - a.total)
                      .map((a) => {
                        const answered = a.outcomes['Answered'] || 0;
                        const rate = a.total > 0 ? Math.round((answered / a.total) * 100) : 0;
                        return (
                          <div key={a.agentId || a.agentName} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF7FF] dark:bg-[#161822]">
                            <div className="w-9 h-9 rounded-full bg-[#7E14FF] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                              {(a.agentName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-[#170B29] dark:text-[#F4EEFF]">{a.agentName}</div>
                              <div className="text-[11px] text-[#7D7296]">{a.total} calls · {answered} answered</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0" style={{ background: (rate >= 50 ? '#059669' : '#DC2626') + '20', color: rate >= 50 ? '#059669' : '#DC2626' }}>
                              {rate}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}