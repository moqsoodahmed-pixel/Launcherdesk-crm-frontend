import { useState } from 'react';
import { Mic, Phone, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useVoicebot, LEAD_TEMP } from '../hooks/useVoicebot'; // adjust path as needed

const TEMP_STYLE = {
  Hot:  { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-600 dark:text-rose-400', icon: '' },
  Warm: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-300', icon: '' },
  Cold: { bg: 'bg-violet-50 dark:bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400', icon: '' },
};

export default function VoiceBotPanel({ leads = [], campaignName = '' }) {
  const {
    callQueue,
    currentCall,
    results,
    isRunning,
    error,
    runQueue,
    stopQueue,
  } = useVoicebot();

  const [expanded, setExpanded] = useState(false);

  const calledIds = new Set(results.map((r) => r.lead?.id || r.lead?._id));
  const pending   = leads.filter((l) => !calledIds.has(l.id || l._id));
  const hotCount  = results.filter((r) => r.Quality === LEAD_TEMP.HOT).length;
  const warmCount = results.filter((r) => r.Quality === LEAD_TEMP.WARM).length;

  return (
    <div className="surface-card mt-4 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/[0.04] cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Mic className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span className="text-[13px] font-bold text-slate-900 dark:text-white">Voice Bot</span>
          {results.length > 0 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {results.length}/{leads.length} called · {hotCount}  · {warmCount} 
            </span>
          )}
          {isRunning && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {expanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Current call status */}
          {currentCall && (
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-500/10 rounded-xl text-[12px] text-violet-600 dark:text-violet-400 font-medium">
              <Phone className="w-3.5 h-3.5 animate-pulse" />
              Calling {currentCall.lead?.name || 'lead'} — {currentCall.status}
              {currentCall.callId && (
                <span className="text-[10px] text-slate-400 ml-1">#{currentCall.callId}</span>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-[12px] text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!isRunning ? (
              <button
                onClick={() => runQueue(leads)}
                disabled={leads.length === 0}
                className="btn-primary btn-sm flex-1"
              >
                 Auto-call all {leads.length} leads
              </button>
            ) : (
              <button
                onClick={stopQueue}
                className="btn-danger btn-sm flex-1 !bg-rose-50 dark:!bg-rose-950/30 !text-rose-600 dark:!text-rose-400 !shadow-none border border-rose-200 dark:border-rose-800/40 hover:!bg-rose-100"
              >
                 Stop queue
              </button>
            )}
          </div>

          {/* Queue progress */}
          {callQueue.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Queue</p>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {callQueue.map((item, i) => {
                  const statusColors = {
                    pending:    'text-slate-400',
                    calling:    'text-violet-600 animate-pulse',
                    done:       'text-emerald-600',
                    failed:     'text-rose-600',
                  };
                  const icons = { pending: '', calling: '', done: '', failed: '' };
                  return (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] text-[11px]">
                      <span className={`font-medium ${statusColors[item.queueStatus] || 'text-slate-400'}`}>
                        {icons[item.queueStatus] || ''} {item.name || 'Lead'}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">{item.phone || item.mobile || ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Results</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {results.map((r, i) => {
                  const ts = TEMP_STYLE[r.Quality] || TEMP_STYLE.Cold;
                  return (
                    <div key={i} className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-slate-900 dark:text-white">
                          {r.lead?.name || 'Lead'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ts.bg} ${ts.text}`}>
                          {ts.icon} {r.Quality}
                        </span>
                      </div>
                      {r.summary && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic leading-relaxed">{r.summary}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                        <span>Score: {r.score ?? '—'}</span>
                        {r.duration > 0 && <span>Duration: {r.duration}s</span>}
                        {r.status && <span className="capitalize">{r.status}</span>}
                        {r.errorMsg && <span className="text-rose-600"> {r.errorMsg}</span>}
                      </div>
                      {r.recordingUrl && (
                        
                     <a  href={r.recordingUrl}
                        target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-violet-600 dark:text-violet-400 hover:underline"
                        >
                           Listen to recording
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
