/**
 * AdminChat.jsx — Role-aware internal chat widget
 *
 * Renders differently based on the logged-in admin's role:
 *  super_admin → sees all company admins + all employees; can message anyone
 *  admin       → sees super_admin + their own assigned employees only
 *
 * The company super_admin is identified by role === 'superadmin' in localStorage.
 *
 * MOBILE FIXES APPLIED:
 *  1. createPortal — renders both the FAB and full panel into document.body so
 *     they're never trapped by a parent overflow:hidden / transform / will-change
 *     that breaks position:fixed in the app shell.
 *  2. useWindowWidth hook — replaces inline window.innerWidth reads in JSX
 *     (which are unsafe and return stale/wrong values). The hook fires after
 *     mount and updates on resize, so the correct mobile/desktop dimensions
 *     are always used.
 *  3. Mobile panel height — changed from 85vh to `calc(100dvh - env(safe-area-inset-bottom))`
 *     so the panel doesn't get cropped by the iOS browser chrome.
 *
 * BUG FIXES:
 *  FIX 1 — companyId: safely extract _id string when storedUser.company is a
 *           populated object instead of a plain ID string. Previously fell through
 *           to the raw object, emitting "[object Object]" over the socket which
 *           broke every DB query on the backend.
 *  FIX 2 — role normalisation: DB stores role as 'superadmin' (no underscore)
 *           but the frontend filtered for 'super_admin'. Normalise on receipt of
 *           all_users_db so superAdminContact lookup and role-based rendering work.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { getStoredUser, getRole } from '../data/dataService';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL.replace(/\/api$/, '')
   

// ── Safe window-width hook ────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 768
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    handler();
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ── FIX 1: Safe companyId extractor ──────────────────────────────────────────
// storedUser.company may be a populated object { _id, name, … } or a plain
// string ID. The previous || chain fell through to the raw object, serialising
// as "[object Object]" when emitted via socket — breaking every DB query.
function extractCompanyId(storedUser) {
  if (!storedUser) return '';
  if (storedUser.companyId) return storedUser.companyId;
  if (storedUser.company) {
    if (typeof storedUser.company === 'object') {
      return storedUser.company?._id || '';
    }
    return storedUser.company;
  }
  return '';
}

// ── FIX 2: Role normaliser ────────────────────────────────────────────────────
// The DB stores role as 'superadmin' (no underscore). The frontend was filtering
// for 'super_admin', so superAdminContact was always undefined. Normalise here.
function normaliseRole(role) {
  if (role === 'superadmin') return 'super_admin';
  return role;
}

export default function AdminChat() {
  const socketRef = useRef(null);

  // ── Identity ──────────────────────────────────────────────────────────────
  const storedUser   = getStoredUser();
  const role         = getRole();
  const isSuperAdmin = role === 'superadmin';
  const adminId      = storedUser?._id || storedUser?.id || '';
  // FIX 1: use safe extractor instead of raw || chain
  const companyId    = extractCompanyId(storedUser);
  const displayName  = storedUser?.name || 'Admin';
  const myUsername   = isSuperAdmin ? `superadmin:${adminId}` : `admin:${adminId}`;

  // ── Window width (safe) ───────────────────────────────────────────────────
  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth < 768;

  // ── State ─────────────────────────────────────────────────────────────────
  const [onlineUsers, setOnlineUsers]           = useState({});
  const [allUsers, setAllUsers]                 = useState([]);
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [chats, setChats]                       = useState({});
  const [message, setMessage]                   = useState('');
  const [unread, setUnread]                     = useState({});
  const [open, setOpen]                         = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(true);

  const [editingId, setEditingId]     = useState(null);
  const [editingText, setEditingText] = useState('');

  const bottomRef = useRef(null);

  const selectedSocketId = selectedUsername
    ? Object.entries(onlineUsers).find(([, name]) => name === selectedUsername)?.[0] ?? null
    : null;

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    const doJoin = () => {
      // DIAGNOSTIC: if companyId is empty here, the socket join below will
      // be silently rejected by the backend (no contacts, 0 online forever).
      // This is almost always a stale localStorage "user" object — log out
      // and back in as Super Admin to refresh it.
      if (!companyId) {
        console.warn(
          '[AdminChat] companyId is empty — chat will show "0 online" / "No contacts yet". ' +
          'storedUser=', storedUser
        );
      }
      if (isSuperAdmin) {
        socket.emit('super_admin_join', { adminId, company: companyId, displayName });
      } else {
        socket.emit('admin_join', { adminId, company: companyId, displayName });
      }
    };
    socket.on('connect', doJoin);
    if (socket.connected) doJoin();

    socket.on('users_list', setOnlineUsers);

    // FIX 2: normalise role field on every user received from the DB
    // DB stores 'superadmin' but frontend filters use 'super_admin'
    socket.on('all_users_db', (users) => {
      const normalised = users.map((u) => ({
        ...u,
        role: normaliseRole(u.role),
      }));
      setAllUsers(normalised);
    });

    socket.on('admin_chat_history', ({ username, history }) => {
      const formatted = history.map((m) => ({
        _id:       m._id,
        from:      m.from === myUsername ? 'Me' : m.from,
        message:   m.message,
        ts:        m.timestamp || null,
        isDeleted: m.isDeleted || false,
        editedAt:  m.editedAt  || null,
      }));
      setChats((prev) => ({ ...prev, [username]: formatted }));
    });

    socket.on('receive_user_message', ({ from, displayName: fromDisplay, message: msg, _id }) => {
      setChats((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), { _id, from: fromDisplay || from, message: msg, isDeleted: false }],
      }));
      setSelectedUsername((sel) => {
        setUnread((prev) => ({
          ...prev,
          [from]: sel === from ? 0 : (prev[from] || 0) + 1,
        }));
        return sel;
      });
    });

    socket.on('receive_admin_message', ({ from, displayName: fromDisplay, message: msg, _id }) => {
      setChats((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), { _id, from: fromDisplay || from, message: msg, isDeleted: false }],
      }));
      setSelectedUsername((sel) => {
        setUnread((prev) => ({
          ...prev,
          [from]: sel === from ? 0 : (prev[from] || 0) + 1,
        }));
        return sel;
      });
    });

    socket.on('admin_message_sent', ({ toUsername, message: msg, _id }) => {
      setChats((prev) => ({
        ...prev,
        [toUsername]: [
          ...(prev[toUsername] || []),
          { _id, from: 'Me', message: msg, isDeleted: false },
        ],
      }));
    });

    socket.on('message_edited', ({ _id, newText, editedAt }) => {
      setChats((prev) => {
        const updated = {};
        for (const [user, msgs] of Object.entries(prev)) {
          updated[user] = msgs.map((m) =>
            m._id?.toString() === _id?.toString() ? { ...m, message: newText, editedAt } : m
          );
        }
        return updated;
      });
    });

    socket.on('message_deleted', ({ _id }) => {
      setChats((prev) => {
        const updated = {};
        for (const [user, msgs] of Object.entries(prev)) {
          updated[user] = msgs.map((m) =>
            m._id?.toString() === _id?.toString()
              ? { ...m, message: 'This message was deleted', isDeleted: true }
              : m
          );
        }
        return updated;
      });
    });

    socket.on('chat_error', ({ message: err }) => console.warn('Chat error:', err));

    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, selectedUsername]);

  // ── Select contact ────────────────────────────────────────────────────────
  const selectUser = useCallback((username) => {
    setSelectedUsername(username);
    setUnread((prev) => ({ ...prev, [username]: 0 }));
    setEditingId(null);
    if (!chats[username]) {
      socketRef.current?.emit('admin_fetch_history', { username });
    }
  }, [chats]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (!message.trim() || !selectedUsername) return;
    const sid = Object.entries(onlineUsers).find(([, n]) => n === selectedUsername)?.[0] ?? null;
    socketRef.current?.emit('admin_message', {
      toSocketId: sid,
      toUsername: selectedUsername,
      message,
    });
    setMessage('');
  }, [message, selectedUsername, onlineUsers]);

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const startEdit  = (msg) => { if (msg.isDeleted) return; setEditingId(msg._id); setEditingText(msg.message); };
  const submitEdit = () => {
    if (!editingText.trim() || !editingId) return;
    socketRef.current?.emit('edit_message', { _id: editingId, newText: editingText.trim(), requester: myUsername });
    setEditingId(null); setEditingText('');
  };
  const cancelEdit = () => { setEditingId(null); setEditingText(''); };

  // ── Delete helper ─────────────────────────────────────────────────────────
  const deleteMsg = (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    socketRef.current?.emit('delete_message', { _id: msgId, requester: myUsername });
  };

  // ── Derived contact list ──────────────────────────────────────────────────
  const onlineUsernames   = new Set(Object.values(onlineUsers));
  const userList          = allUsers.map((u) => ({
    username:    u.username,
    displayName: u.displayName || u.username,
    role:        u.role, // already normalised via normaliseRole() above
    online:      onlineUsernames.has(u.username),
    unread:      unread[u.username] || 0,
  }));

  const adminContacts     = userList.filter((u) => u.role === 'admin');
  const employeeContacts  = userList.filter((u) => u.role === 'employee');
  // FIX 2: now correctly matches 'super_admin' after normalisation
  const superAdminContact = userList.find((u) => u.role === 'super_admin');

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  const roleLabel = (r) => {
    if (r === 'super_admin') return 'Super Admin';
    if (r === 'admin') return 'Admin';
    return 'Employee';
  };

  // ── Panel dimensions ──────────────────────────────────────────────────────
  const panelWidth  = isMobile ? '100%' : (sidebarOpen ? 640 : 380);
  const panelHeight = isMobile ? 'calc(100dvh - env(safe-area-inset-bottom) - 0px)' : '520px';

  // ── FAB ───────────────────────────────────────────────────────────────────
  const fab = (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button
        onClick={() => setOpen(true)}
        className="relative w-14 h-14 rounded-2xl bg-brand-gradient hover:brightness-110 text-white shadow-glow-brand flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title="Open team chat"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
        {totalUnread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white dark:ring-white/[0.02]">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );

  // ── Full panel ────────────────────────────────────────────────────────────
  const panel = (
    <div
      className="fixed z-[9999] flex shadow-elevated overflow-hidden border border-[#E7DCFA]/70 dark:border-white/[0.06] bottom-0 right-0 left-0 rounded-t-2xl md:rounded-2xl md:bottom-6 md:right-6 md:left-auto"
      style={{
        width:      panelWidth,
        height:     panelHeight,
        maxHeight:  isMobile ? 'calc(100dvh - 56px)' : '520px',
        transition: 'width 0.2s ease',
      }}
    >
      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div className={`w-full md:w-56 shrink-0 bg-white dark:bg-[#181029] border-r border-slate-200 dark:border-white/10 flex flex-col ${selectedUsername ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-3 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
                </svg>
              </div>
              <span className="text-[12px] font-bold text-slate-900 dark:text-white">
                {isSuperAdmin ? 'Team Chat' : 'Contacts'}
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/15 text-[10px] font-semibold text-violet-600 dark:text-violet-300">
                {Object.keys(onlineUsers).length} online
              </span>
            </div>

            {/* MOBILE FIX: the "Minimise" button below normally lives in the
                chat-pane header, but that pane is hidden on mobile whenever
                no conversation is selected — leaving this sidebar with no way
                to close the panel. Mirror a close button here, mobile-only. */}
            <button
              onClick={() => setOpen(false)}
              className="icon-btn md:hidden w-7 h-7 shrink-0"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {userList.length === 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-500 text-center py-6">No contacts yet</p>
            )}

            {isSuperAdmin ? (
              <>
                {adminContacts.length > 0 && (
                  <>
                    <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">Admins</p>
                    {adminContacts.map((u) => <ContactRow key={u.username} u={u} selected={selectedUsername} selectUser={selectUser} />)}
                  </>
                )}
                {employeeContacts.length > 0 && (
                  <>
                    <p className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">Employees</p>
                    {employeeContacts.map((u) => <ContactRow key={u.username} u={u} selected={selectedUsername} selectUser={selectUser} />)}
                  </>
                )}
              </>
            ) : (
              <>
                {superAdminContact && (
                  <>
                    <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">Super Admin</p>
                    <ContactRow u={superAdminContact} selected={selectedUsername} selectUser={selectUser} />
                  </>
                )}
                {employeeContacts.length > 0 && (
                  <>
                    <p className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">My Employees</p>
                    {employeeContacts.map((u) => <ContactRow key={u.username} u={u} selected={selectedUsername} selectUser={selectUser} />)}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Chat pane ── */}
      <div className={`flex-1 flex-col bg-slate-50 dark:bg-white/[0.02] min-w-0 ${selectedUsername ? "flex" : "hidden md:flex"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#181029] border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            {selectedUsername && (
              <button
                onClick={() => setSelectedUsername(null)}
                className="icon-btn md:hidden w-7 h-7"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              className="icon-btn hidden md:flex w-7 h-7"
              title="Toggle sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            {selectedUsername ? (
              (() => {
                const contact = userList.find((u) => u.username === selectedUsername);
                return (
                  <>
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {(contact?.displayName || selectedUsername)[0]?.toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#181029] ${selectedSocketId ? 'bg-emerald-500' : 'bg-slate-400'}`}/>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-none">
                        {contact?.displayName || selectedUsername}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${selectedSocketId ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'}`}>
                        {contact && <span className="mr-1 opacity-60">{roleLabel(contact.role)} ·</span>}
                        {selectedSocketId ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </>
                );
              })()
            ) : (
              <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                {isSuperAdmin ? 'Team Chat' : 'Support Chat'}
              </p>
            )}
          </div>

          <button
            onClick={() => setOpen(false)}
            className="icon-btn w-7 h-7"
            title="Minimise"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {!selectedUsername ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-600 dark:text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Select a conversation</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500">
                {isSuperAdmin
                  ? 'Chat with any admin or employee in your company'
                  : 'Chat with your super admin or your assigned employees'}
              </p>
            </div>
          ) : (chats[selectedUsername] || []).length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-[12px] text-slate-500 dark:text-slate-500">No messages yet. Say hello!</p>
            </div>
          ) : (
            (chats[selectedUsername] || []).map((c, i) => {
              const isMe      = c.from === 'Me';
              const isEditing = editingId === c._id;

              return (
                <div key={c._id || i} className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex flex-col gap-0.5 max-w-[72%]">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                          className="input-field px-2 py-1 text-[12px] w-48"
                        />
                        <button onClick={submitEdit} className="text-[10px] text-violet-600 font-semibold hover:underline">Save</button>
                        <button onClick={cancelEdit}  className="text-[10px] text-slate-500 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <div className={`relative px-3 py-2 rounded-2xl text-[12px] leading-relaxed ${
                        c.isDeleted
                          ? 'italic text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-[#181029] border border-dashed border-slate-200 dark:border-white/10'
                          : isMe
                            ? 'bg-violet-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-[#181029] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-bl-sm'
                      }`}>
                        {!isMe && !c.isDeleted && (
                          <p className="text-[10px] font-bold text-violet-600 dark:text-violet-300 mb-0.5">{c.from}</p>
                        )}
                        {c.message}
                        {c.editedAt && !c.isDeleted && (
                          <span className="text-[9px] opacity-60 ml-1">(edited)</span>
                        )}

                        {!c.isDeleted && c._id && (
                          <div className={`absolute top-1 ${isMe ? '-left-14' : '-right-14'} hidden group-hover:flex items-center gap-1`}>
                            {isMe && (
                              <button onClick={() => startEdit(c)} title="Edit"
                                className="w-5 h-5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-violet-600 transition shadow-sm">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        {selectedUsername && (
          <div className="px-3 py-3 bg-white dark:bg-[#181029] border-t border-slate-200 dark:border-white/10 shrink-0">
            {!selectedSocketId && (
              <p className="text-[10px] text-slate-500 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"/>
                Offline — message will be delivered when they reconnect
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                value={message}
                placeholder={selectedSocketId ? 'Type a message…' : 'Send offline message…'}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                className="input-field flex-1 px-3 py-2 text-[12px]"
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-gradient hover:brightness-110 disabled:bg-slate-200 disabled:bg-none dark:disabled:bg-white/10 text-white disabled:text-slate-500 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render via portal ─────────────────────────────────────────────────────
  if (typeof document === 'undefined') return null;

  return createPortal(
    open ? panel : fab,
    document.body
  );
}

/** Reusable contact row for the sidebar */
function ContactRow({ u, selected, selectUser }) {
  const roleColor = u.role === 'super_admin'
    ? 'bg-violet-700'
    : u.role === 'admin'
      ? 'bg-violet-500'
      : 'bg-slate-500';

  return (
    <button
      onClick={() => selectUser(u.username)}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
        selected === u.username
          ? 'bg-violet-50 dark:bg-violet-500/10'
          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
      }`}
    >
      <div className="relative shrink-0">
        <div className={`w-7 h-7 rounded-full ${roleColor} flex items-center justify-center text-[10px] font-bold text-white`}>
          {(u.displayName || u.username)[0]?.toUpperCase()}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#181029] ${u.online ? 'bg-emerald-500' : 'bg-slate-400'}`}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-semibold truncate ${
          selected === u.username ? 'text-violet-600 dark:text-violet-300' : 'text-slate-900 dark:text-white'
        }`}>{u.displayName || u.username}</p>
        <p className={`text-[10px] ${u.online ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'}`}>
          {u.online ? 'Online' : 'Offline'}
        </p>
      </div>
      {u.unread > 0 && (
        <span className="w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shrink-0">
          {u.unread > 9 ? '9+' : u.unread}
        </span>
      )}
    </button>
  );
}
