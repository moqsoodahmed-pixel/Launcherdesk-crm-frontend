// components/CallRecording.jsx
// Admin dashboard — shows all call recordings uploaded from the mobile app.
// Includes AI transcription + summary via OpenAI Whisper (backend route).

import React, { useEffect, useState } from 'react';
import api from '../data/axiosConfig';
import { User, UserRound } from 'lucide-react';
import { Pill } from './ui/Primitives';

const BACKEND_ROOT = import.meta.env.VITE_API_URL.replace(/\/api$/, '')


const SENTIMENT_STYLE = {
  Positive: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  Neutral:  { bg: 'bg-slate-100 dark:bg-white/[0.06]',    text: 'text-slate-500 dark:text-slate-400' },
  Negative: { bg: 'bg-rose-50 dark:bg-rose-500/10',       text: 'text-rose-600 dark:text-rose-400' },
};
const TEMP_STYLE = {
  Hot:  { bg: 'bg-rose-50 dark:bg-rose-500/10',   text: 'text-rose-600 dark:text-rose-400',   dot: 'bg-rose-500' },
  Warm: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-400' },
  Cold: { bg: 'bg-cyan-50 dark:bg-cyan-500/10',   text: 'text-cyan-600 dark:text-cyan-400',   dot: 'bg-cyan-400' },
};

function TranscriptionPanel({ callLogId, recording, contactName }) {
  const [status,     setStatus]     = useState(recording.transcribeStatus || 'pending');
  const [transcript, setTranscript] = useState(recording.transcript || null);
  const [summary,    setSummary]    = useState(recording.summary    || null);
  const [expanded,   setExpanded]   = useState(false);
  const [error,      setError]      = useState(null);
  const recId = recording._id;

  useEffect(() => {
    if (status !== 'processing') return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/transcription/mobile/${callLogId}/${recId}`);
        const s = res.data.transcribeStatus;
        setStatus(s);
        if (s === 'done') {
          setTranscript(res.data.transcript);
          setSummary(res.data.summary);
          clearInterval(interval);
        } else if (s === 'failed') {
          setError('Transcription failed. Check your OpenAI API key on the server.');
          clearInterval(interval);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [status, callLogId, recId]);

  const handleTranscribe = async () => {
    setStatus('processing');
    setError(null);
    try {
      const res = await api.post(`/transcription/mobile/${callLogId}/${recId}`, {
        contactName: contactName || 'the customer',
      });
      setStatus('done');
      setTranscript(res.data.transcript);
      setSummary(res.data.summary);
    } catch (e) {
      setStatus('failed');
      setError(e.response?.data?.message || 'Transcription failed. Make sure OPENAI_API_KEY is set on the server.');
    }
  };

  if (status === 'pending') {
    return (
      <div className="mt-2">
        <button
          onClick={handleTranscribe}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          AI Transcribe &amp; Summarize
        </button>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
        <svg className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Transcribing with Whisper AI…</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10">
          <svg className="w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span className="text-[11px] text-rose-500">{error || 'Transcription failed.'}</span>
        </div>
        <button onClick={handleTranscribe} className="text-[11px] text-indigo-600 dark:text-indigo-400 underline pl-1">Retry</button>
      </div>
    );
  }

  // status === 'done'
  const sent = summary?.sentiment;
  const temp = summary?.suggestedTemp;
  const sentStyle = SENTIMENT_STYLE[sent] || SENTIMENT_STYLE.Neutral;
  const tempStyle = TEMP_STYLE[temp];

  return (
    <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">AI Summary</span>
          {sent && (
            <span className={`badge ${sentStyle.bg} ${sentStyle.text}`}>{sent}</span>
          )}
          {temp && tempStyle && (
            <span className={`badge ${tempStyle.bg} ${tempStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tempStyle.dot}`}/>
              {temp}
            </span>
          )}
        </div>
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {expanded && (
        <div className="px-3 py-3 space-y-3 bg-white dark:bg-[#181029]">
          {summary?.summary && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Summary</p>
              <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{summary.summary}</p>
            </div>
          )}
          {Array.isArray(summary?.keyPoints) && summary.keyPoints.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Key Points</p>
              <ul className="space-y-1">
                {summary.keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"/>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary?.nextAction && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">Next Action</p>
                <p className="text-[12px] text-emerald-700 dark:text-emerald-300">{summary.nextAction}</p>
              </div>
            </div>
          )}
          {transcript && (
            <details className="group">
              <summary className="cursor-pointer text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none list-none flex items-center gap-1">
                <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
                Full Transcript
              </summary>
              <div className="mt-2 max-h-52 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {transcript.includes('Speaker') && transcript.includes(':')
                  ? transcript.split('\n').filter(Boolean).map((line, i) => {
                      const colonIdx = line.indexOf(':');
                      if (colonIdx === -1) return (
                        <p key={i} className="text-[11px] text-slate-500 dark:text-slate-400 px-2">{line}</p>
                      );
                      const speaker = line.slice(0, colonIdx).trim();
                      const text    = line.slice(colonIdx + 1).trim();
                      const isSpk1  = speaker === 'Speaker 1';
                      return (
                        <div key={i} className={`flex flex-col ${isSpk1 ? 'items-start' : 'items-end'}`}>
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5 px-1">
                            {isSpk1 ? <><User className="w-2.5 h-2.5" /> Agent</> : <><UserRound className="w-2.5 h-2.5" /> Customer</>}
                          </span>
                          <div className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed ${
                            isSpk1
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-tl-none'
                              : 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 rounded-tr-none'
                          }`}>
                            {text}
                          </div>
                        </div>
                      );
                    })
                  : <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 dark:bg-white/[0.04] rounded-lg px-3 py-2">{transcript}</p>
                }
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ── Lead-level combined summary panel ────────────────────────────────────────
function LeadCombinedSummaryPanel({ leadId, leadName }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/transcription/lead/${leadId}/summary`);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to generate combined summary.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && !data) fetch();
  };

  const cs   = data?.combinedSummary;
  const sent = cs?.overallSentiment;
  const temp = cs?.suggestedTemp;
  const sentStyle = SENTIMENT_STYLE[sent] || SENTIMENT_STYLE.Neutral;
  const tempStyle = TEMP_STYLE[temp];

  return (
    <div className="mt-3 rounded-xl border border-violet-200 dark:border-violet-500/20 overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300">Lead Summary</span>
          <span className="text-[10px] text-violet-500 dark:text-violet-400">
            {data ? `${data.summarizedCalls} call${data.summarizedCalls !== 1 ? 's' : ''} combined` : 'All calls combined'}
          </span>
          {sent && (
            <span className={`badge ${sentStyle.bg} ${sentStyle.text}`}>{sent}</span>
          )}
          {temp && tempStyle && (
            <span className={`badge ${tempStyle.bg} ${tempStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tempStyle.dot}`}/>
              {temp}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {open && !loading && (
            <button
              onClick={e => { e.stopPropagation(); fetch(); }}
              className="w-5 h-5 flex items-center justify-center rounded text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition"
              title="Refresh"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          )}
          <svg className={`w-3.5 h-3.5 text-violet-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-3 py-3 bg-white dark:bg-[#181029] space-y-3">

          {loading && (
            <div className="flex items-center gap-2 py-2">
              <svg className="w-3.5 h-3.5 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <span className="text-[11px] text-violet-500 font-medium">Generating combined summary…</span>
            </div>
          )}

          {error && !loading && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10">
                <svg className="w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-[11px] text-rose-500">{error}</span>
              </div>
              <button onClick={fetch} className="text-[11px] text-violet-600 underline pl-1">Retry</button>
            </div>
          )}

          {data && !loading && !error && (
            <>
              {/* No summaries yet */}
              {!cs && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div>
                    <p className="text-[11px] text-slate-400">{data.message}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{data.totalCalls} call{data.totalCalls !== 1 ? 's' : ''} logged, 0 transcribed.</p>
                  </div>
                </div>
              )}

              {/* Combined summary */}
              {cs && (
                <>
                  {/* Stats row */}
                  <div className="flex gap-2">
                    <span className="badge bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
                      {data.totalCalls} total call{data.totalCalls !== 1 ? 's' : ''}
                    </span>
                    <span className="badge bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      {data.summarizedCalls} summarised
                    </span>
                  </div>

                  {/* Overall summary */}
                  {cs.overallSummary && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Overall Summary</p>
                      <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{cs.overallSummary}</p>
                    </div>
                  )}

                  {/* Relationship status */}
                  {cs.relationshipStatus && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                      <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-0.5">Relationship Status</p>
                        <p className="text-[12px] text-slate-600 dark:text-slate-300">{cs.relationshipStatus}</p>
                      </div>
                    </div>
                  )}

                  {/* Key insights */}
                  {Array.isArray(cs.keyInsights) && cs.keyInsights.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Key Insights</p>
                      <ul className="space-y-1">
                        {cs.keyInsights.map((pt, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0"/>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended next action */}
                  {cs.recommendedNextAction && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                      <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <div>
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">Recommended Next Action</p>
                        <p className="text-[12px] text-emerald-700 dark:text-emerald-300">{cs.recommendedNextAction}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CallRecording() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRecordings = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/call-logs/recordings?page=${p}&limit=50`);
      setRecordings(res.data.recordings || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(p);
    } catch (e) {
      setError('Failed to load recordings. Please try again.');
      console.error('[CallRecording]', e.response?.status, e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecordings(1); }, []);

  const filtered = recordings.filter(r =>
    r.phoneNumber?.includes(search) ||
    r.matchedLead?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.callType?.includes(search.toLowerCase())
  );

  const fmtDuration = (sec) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60), s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const fmtDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const callTypeTone = (type) => ({
    incoming: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    outgoing: { bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-600 dark:text-indigo-400' },
    missed:   { bg: 'bg-rose-50 dark:bg-rose-500/10',       text: 'text-rose-600 dark:text-rose-400' },
    rejected: { bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400' },
    blocked:  { bg: 'bg-slate-100 dark:bg-white/[0.06]',    text: 'text-slate-500 dark:text-slate-400' },
  }[type] || { bg: 'bg-slate-100 dark:bg-white/[0.06]', text: 'text-slate-400' });

  const audioUrl = (recordingUrl) => {
    if (!recordingUrl) return null;
    if (recordingUrl.startsWith('http')) return recordingUrl;
    return `${BACKEND_ROOT}${recordingUrl}`;
  };

  return (
    // ── Full screen height, flex column, no overflow on the outer shell ───────
    <div className="h-screen flex flex-col surface-card overflow-hidden">

      {/* ── Fixed header ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
            <h2 className="text-[14px] font-bold text-slate-900 dark:text-white">Call Recordings</h2>
            <span className="badge bg-slate-100 dark:bg-white/[0.06] text-slate-400">
              {recordings.length} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="violet">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              Whisper AI
            </Pill>
            <button onClick={() => fetchRecordings(page)} className="icon-btn w-7 h-7" title="Refresh">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Search bar ───────────────────────────────────────────────────── */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" placeholder="Search by number, contact or agent..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-8 pr-3 py-2"/>
        </div>
      </div>

      {/* ── Scrollable content area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">

        {loading && (
          <div className="flex items-center justify-center py-10 gap-2">
            <svg className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-[13px] text-slate-400">Loading recordings...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center py-8 gap-2">
            <p className="text-[13px] text-rose-500">{error}</p>
            <button onClick={() => fetchRecordings(1)} className="text-[12px] text-indigo-600 dark:text-indigo-400 underline">Retry</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <svg className="w-8 h-8 text-slate-200 dark:text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
            <p className="text-[13px] text-slate-400">
              {recordings.length > 0 ? 'No matches for your search.' : 'No recordings yet. They upload automatically after calls on the mobile app.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((rec, i) => {
              const tone = callTypeTone(rec.callType);
              return (
              <div key={rec._id || i} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{i + 1}</span>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-none">{rec.matchedLead?.name || rec.phoneNumber}</p>
                      {rec.matchedLead?.name && <p className="text-[11px] text-slate-400 mt-0.5">{rec.phoneNumber}</p>}
                      <p className="text-[11px] text-slate-400 mt-0.5">Employee: <span className="font-medium text-slate-600 dark:text-slate-300">{rec.user?.name || '—'}</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(rec.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge capitalize ${tone.bg} ${tone.text}`}>
                      {rec.callType || 'call'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {fmtDuration(rec.duration)}
                    </span>
                  </div>
                </div>

                {rec.remark && <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-2">"{rec.remark}"</p>}

                {Array.isArray(rec.recordings) && rec.recordings.length > 0
                  ? rec.recordings.map((r, ri) => (
                      <div key={r._id || ri} className="mb-3 last:mb-0">
                        <audio
                          controls
                          controlsList="nodownload noplaybackrate"
                          onContextMenu={(e) => e.preventDefault()}
                          src={audioUrl(r.url)}
                          className="w-full h-8 rounded-xl accent-indigo-600 mb-1"
                          preload="none"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        {rec._id && r._id && (
                          <TranscriptionPanel
                            callLogId={rec._id}
                            recording={r}
                            contactName={rec.matchedLead?.name || rec.phoneNumber}
                          />
                        )}
                      </div>
                    ))
                  : rec.recordingUrl
                    ? <audio controls controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()} src={audioUrl(rec.recordingUrl)} className="w-full h-8 rounded-xl accent-indigo-600" preload="none"/>
                    : <p className="text-[11px] text-slate-400 italic">Recording not available</p>
                }

                {/* ── Lead-level combined summary ───────────────────────── */}
                {rec.matchedLead?._id && (
                  <LeadCombinedSummaryPanel
                    leadId={rec.matchedLead._id}
                    leadName={rec.matchedLead.name || rec.phoneNumber}
                  />
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
            <button onClick={() => fetchRecordings(page - 1)} disabled={page <= 1} className="btn-secondary btn-sm">
              ← Prev
            </button>
            <span className="text-[12px] text-slate-400">Page {page} of {totalPages}</span>
            <button onClick={() => fetchRecordings(page + 1)} disabled={page >= totalPages} className="btn-secondary btn-sm">
              Next →
            </button>
          </div>
        )}

      </div>
      {/* ── End scrollable area ─────────────────────────────────────────────── */}

    </div>
  );
}
