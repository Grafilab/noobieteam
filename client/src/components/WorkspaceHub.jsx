if (!window.NTNotifications) {
    const ntKey = (workspaceId) => `nt_ws_notifications_${workspaceId || 'unknown'}`;
    const read = (workspaceId) => {
        try {
            const raw = sessionStorage.getItem(ntKey(workspaceId));
            const data = raw ? JSON.parse(raw) : [];
            return Array.isArray(data) ? data : [];
        } catch (_) {
            return [];
        }
    };
    const readAll = () => {
        const all = [];
        try {
            for (let i = 0; i < sessionStorage.length; i += 1) {
                const key = sessionStorage.key(i);
                if (!key || !key.startsWith('nt_ws_notifications_')) continue;
                const workspaceId = key.replace('nt_ws_notifications_', '');
                read(workspaceId).forEach((n) => {
                    if (n) all.push({ ...n, workspaceId: n.workspaceId || workspaceId });
                });
            }
        } catch (_) {}
        return all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    };
    window.NTNotifications = {
        readAll,
        push(workspaceId, message, options = {}) {
            if (!workspaceId || !message) return read(workspaceId);
            const prev = read(workspaceId);
            if (options.dedupeKey && prev.some((n) => n && n.dedupeKey === options.dedupeKey)) return prev;
            const entry = {
                id: window.generateId ? window.generateId('ntf') : `ntf-${Date.now()}`,
                message,
                createdAt: Date.now(),
                workspaceId,
                workspaceName: options.workspaceName || '',
                type: options.type || 'activity',
                cardId: options.cardId || '',
                dedupeKey: options.dedupeKey || '',
            };
            const next = [entry, ...prev].slice(0, 50);
            try {
                sessionStorage.setItem(ntKey(workspaceId), JSON.stringify(next));
                window.dispatchEvent(new CustomEvent('nt:notifications-changed'));
            } catch (_) {}
            return next;
        },
        remove(notification) {
            if (!notification || !notification.workspaceId) return readAll();
            const next = read(notification.workspaceId).filter((n) => n && n.id !== notification.id);
            try {
                sessionStorage.setItem(ntKey(notification.workspaceId), JSON.stringify(next));
                window.dispatchEvent(new CustomEvent('nt:notifications-changed'));
            } catch (_) {}
            return readAll();
        },
        clearAll() {
            try {
                const keys = [];
                for (let i = 0; i < sessionStorage.length; i += 1) {
                    const key = sessionStorage.key(i);
                    if (key && key.startsWith('nt_ws_notifications_')) keys.push(key);
                }
                keys.forEach((key) => sessionStorage.removeItem(key));
                window.dispatchEvent(new CustomEvent('nt:notifications-changed'));
            } catch (_) {}
            return [];
        },
    };
}

window.WorkspaceHub = ({ onSelect, onLogout, user, theme, onThemeChange, onUpdateUser, onOpenProfile, urlWsSlug, openMyTasks, onConsumeMyTasks }) => {
            const { showPrompt, showConfirm } = window.useModals();
            const { showToast } = window.useToasts();
            const { t } = window.useTranslation ? window.useTranslation() : { t: k => k };
            const [workspaces, setWorkspaces] = React.useState([]);
            const [loading, setLoading] = React.useState(true);
            const [showMyTasks, setShowMyTasks] = React.useState(!!openMyTasks);
            React.useEffect(() => { if (openMyTasks && onConsumeMyTasks) onConsumeMyTasks(); }, []);
    const onSelectRef = React.useRef(onSelect); React.useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
            const [pinPrompt, setPinPrompt] = React.useState({ isOpen: false, pin: '', confirm: '' });
            const [pinError, setPinError] = React.useState('');
            const [pinLoading, setPinLoading] = React.useState(false);
            const [showNotificationDropdown, setShowNotificationDropdown] = React.useState(false);
            const [globalNotifications, setGlobalNotifications] = React.useState(() => window.NTNotifications?.readAll?.() || []);
            const notificationDropdownRef = React.useRef(null);

            React.useEffect(() => {
                const refreshNotifications = () => setGlobalNotifications(window.NTNotifications?.readAll?.() || []);
                const handleClickOutside = (event) => {
                    if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
                        setShowNotificationDropdown(false);
                    }
                };
                refreshNotifications();
                window.addEventListener('nt:notifications-changed', refreshNotifications);
                window.addEventListener('storage', refreshNotifications);
                document.addEventListener('mousedown', handleClickOutside);
                return () => {
                    window.removeEventListener('nt:notifications-changed', refreshNotifications);
                    window.removeEventListener('storage', refreshNotifications);
                    document.removeEventListener('mousedown', handleClickOutside);
                };
            }, []);

            React.useEffect(() => {
                if (!user?.vaultPin) {
                    setPinPrompt({ isOpen: true, pin: '', confirm: '' });
                }
            }, [user]);

            const handleCreatePin = async (e) => {
                if (e && e.preventDefault) e.preventDefault();
                if (pinPrompt.pin !== pinPrompt.confirm) return setPinError(t('alerts.pins_do_not_match'));
                if (pinPrompt.pin.length < 6) return setPinError(t('alerts.pin_min_length'));
                setPinLoading(true);
                try {
                    const userEmail = user?.email;
                    if (!userEmail) throw new Error('User context missing. Please re-login.');

                    const res = await fetch('/api/users/pin', { 
                        method: 'PUT', 
                        headers: {'Content-Type': 'application/json'}, 
                        body: JSON.stringify({ email: userEmail, pin: pinPrompt.pin }) 
                    });
                    
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to save PIN.');

                    if (!data) throw new Error('Empty payload returned from API.');
                    
                    const updatedUser = Object.assign({}, user || {}, { vaultPin: data.vaultPin });
                    onUpdateUser(updatedUser);
                    showToast(t('alerts.payload_secured') || 'Master Vault PIN created successfully. 🔐');
                    setPinPrompt({ isOpen: false, pin: '', confirm: '' });
                } catch (err) {
                    setPinError(err.message);
                } finally {
                    setPinLoading(false);
                }
            };


            React.useEffect(() => {
                fetch('/api/workspaces').then(r => r.json()).then(ws => { 
                    const validWs = Array.isArray(ws) ? ws : [];
                    setWorkspaces(validWs); 
                    setLoading(false); 
                    
                    if (urlWsSlug) {
                        const targetWs = validWs.find(w => w.slug === urlWsSlug || w._id === urlWsSlug || w.id === urlWsSlug);
                        if (targetWs) {
                            // Delay slightly to let hub render logic finish, then auto-select
                            setTimeout(() => onSelect(targetWs), 100);
                        }
                    }
                }).catch(err => { console.error(err); setWorkspaces([]); setLoading(false); });
            }, []);

            // No longer save to localStorage, only API calls
            // 
            const [viewArchived, setViewArchived] = React.useState(false);

            const [adminEmail, setAdminEmail] = React.useState('admin@noobieteam.ai');
            React.useEffect(() => {
                fetch('/api/config').then(res => res.json()).then(data => setAdminEmail(data.adminEmail)).catch(console.error);
            }, []);
            const isAdmin = user?.email === adminEmail;
            const [showUserManagement, setShowUserManagement] = React.useState(false);

            React.useEffect(() => { localStorage.setItem('nt_workspaces', JSON.stringify(workspaces)); }, [workspaces]);

            const addWS = () => {
                showPrompt(t('actions.new_workspace') || 'New Workspace', t('labels.enter_workspace_name') || 'Enter workspace name:', async (name) => {
                    if (!name) return;
                    const newWs = { name, color: 'from-blue-400 to-indigo-500', avatar: name.substring(0,2).toUpperCase(), archived: false, members: [{ userId: user?.email, role: 'OWNER' }] };
                    const res = await fetch('/api/workspaces', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(newWs) });
                    const saved = await res.json();
                    setWorkspaces(prev => [...prev, saved]);
                    showToast(t('alerts.workspace_initialized') || "New mission workspace initialized! ✨");
                }, false);
            };

            const toggleArchive = async (e, id, archive) => {
                e.stopPropagation();
                if (!archive) {
                    showConfirm(t('actions.archive_workspace') || "Archive Workspace", t('alerts.confirm_archive_workspace') || "Are you sure you want to archive this workspace?", async () => {
                        await fetch(`/api/workspaces/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ archived: true }) });
                        setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, archived: true } : w));
                        showToast(t('alerts.workspace_archived') || "Workspace archived. 📦");
                    });
                } else {
                    if (!isAdmin) return;
                    await fetch(`/api/workspaces/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ archived: false }) });
                    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, archived: false } : w));
                    showToast(t('alerts.workspace_reactivated') || "Workspace reactivated. 🚀");
                }
            };

            const headerClass = window.THEMES.find(t => t.id === theme)?.class || 'theme-default';
            const isDarkHeader = ['dark', 'darkblue', 'green', 'ocean'].includes(theme);

            const accessibleWorkspaces = React.useMemo(() => {
                let filtered = Array.isArray(workspaces) ? workspaces : [];
                if (!isAdmin) {
                    filtered = filtered.filter(w => {
                        const memberEmails = w.members ? w.members.map(m => m.userId) : [];
                        return memberEmails.includes(user?.email);
                    });
                }
                return filtered;
            }, [workspaces, isAdmin, user]);

            const displayWorkspaces = React.useMemo(() => {
                return accessibleWorkspaces.filter(w => w.archived === viewArchived);
            }, [accessibleWorkspaces, viewArchived]);

            const hubCardsSnapshotRef = React.useRef({});
            const scanWorkspaceNotifications = React.useCallback((ws, nextCards, previousCards = [], initial = false) => {
                const email = user?.email;
                const wsId = String(ws?.id || ws?._id || '');
                if (!email || !wsId || !window.NTNotifications?.push) return;
                const previousById = new Map((previousCards || []).filter(c => c && (c.id || c._id)).map(c => [String(c.id || c._id), c]));
                const nextById = new Map((nextCards || []).filter(c => c && (c.id || c._id)).map(c => [String(c.id || c._id), c]));
                const push = (message, options = {}) => {
                    window.NTNotifications.push(wsId, message, { ...options, workspaceName: ws?.name || '' });
                    setGlobalNotifications(window.NTNotifications.readAll?.() || []);
                };
                const involved = (card) => Array.isArray(card?.assignees) && card.assignees.includes(email);
                const dueSoon = (card) => {
                    if (!card || card.archived || !card.dueDate) return false;
                    const due = new Date(card.dueDate);
                    if (Number.isNaN(due.getTime())) return false;
                    const diffDays = (due - new Date()) / (1000 * 60 * 60 * 24);
                    return diffDays >= 0 && diffDays <= 3;
                };
                const lastActor = (card) => {
                    const trail = Array.isArray(card?.auditTrail) ? card.auditTrail : [];
                    return trail[trail.length - 1]?.user || '';
                };
                const colName = (id) => (ws.columns || []).find(c => c && c.id === id)?.title || id || 'Unknown';
                const commentId = (comment, index) => comment?._id || comment?.id || `${comment?.authorEmail || 'unknown'}:${comment?.timestamp || index}`;

                nextById.forEach((card, cardId) => {
                    const prev = previousById.get(cardId);
                    const title = card.title || 'Untitled card';
                    if (involved(card) && dueSoon(card)) {
                        const dueLabel = new Date(card.dueDate).toLocaleDateString();
                        push(`"${title}" is expiring soon (${dueLabel}).`, { type: 'due-soon', cardId, dedupeKey: `due-soon:${cardId}:${dueLabel}` });
                    }
                    const actor = lastActor(card) || 'Someone';
                    const actorIsCurrentUser = actor === email;
                    const prevInvolved = involved(prev);
                    const nextInvolved = involved(card);

                    if (initial) return;

                    const previousCommentIds = new Set((Array.isArray(prev?.comments) ? prev.comments : []).map(commentId));
                    (Array.isArray(card.comments) ? card.comments : []).forEach((comment, index) => {
                        const id = commentId(comment, index);
                        if (!Array.isArray(comment?.taggedUsers) || !comment.taggedUsers.includes(email)) return;
                        if (comment.authorEmail === email) return;
                        if (prev && previousCommentIds.has(id)) return;
                        push(`${comment.authorEmail || 'Someone'} mentioned you in "${title}".`, { type: 'mention', cardId, dedupeKey: `mention:${cardId}:${id}` });
                    });

                    if (!prevInvolved && nextInvolved && !actorIsCurrentUser) {
                        push(`${actor} added you to "${title}".`, { type: 'assigned', cardId, dedupeKey: `assigned:${cardId}:${card.updatedAt || Date.now()}` });
                    }
                    if (!prev) return;
                    if (nextInvolved && !actorIsCurrentUser && (prev.columnId || prev.col) !== (card.columnId || card.col)) {
                        push(`"${title}" moved to ${colName(card.columnId || card.col)}.`, { type: 'status', cardId, dedupeKey: `moved:${cardId}:${card.columnId || card.col}:${card.updatedAt || Date.now()}` });
                    }
                    if (prevInvolved && !prev.archived && card.archived && !actorIsCurrentUser) {
                        push(`"${title}" was archived.`, { type: 'archived', cardId, dedupeKey: `archived:${cardId}:${card.updatedAt || Date.now()}` });
                    }
                });

                if (!initial) {
                    previousById.forEach((prev, cardId) => {
                        if (nextById.has(cardId) || !involved(prev)) return;
                        push(`"${prev.title || 'Untitled card'}" was deleted.`, { type: 'deleted', cardId, dedupeKey: `deleted:${cardId}:${Date.now()}` });
                    });
                }
            }, [user?.email]);

            React.useEffect(() => {
                const activeWorkspaces = accessibleWorkspaces.filter(ws => ws && !ws.archived);
                if (!user?.email || activeWorkspaces.length === 0) return;
                let cancelled = false;
                const pollAllProjects = async (initial = false) => {
                    for (const ws of activeWorkspaces) {
                        const wsId = String(ws.id || ws._id || '');
                        if (!wsId) continue;
                        try {
                            const res = await fetch(`/api/workspaces/${wsId}/tasks`);
                            const data = await res.json();
                            if (cancelled) return;
                            const validData = Array.isArray(data) ? data.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)) : [];
                            scanWorkspaceNotifications(ws, validData, hubCardsSnapshotRef.current[wsId] || [], initial);
                            hubCardsSnapshotRef.current[wsId] = validData;
                        } catch (e) {
                            console.error(e);
                        }
                    }
                };
                pollAllProjects(true);
                const interval = setInterval(() => pollAllProjects(false), 20000);
                return () => {
                    cancelled = true;
                    clearInterval(interval);
                };
            }, [accessibleWorkspaces, scanWorkspaceNotifications, user?.email]);

            const homeStyle = user?.homeBackgroundImage ? {
                backgroundImage: `linear-gradient(rgba(255,255,255,0.84), rgba(255,255,255,0.9)), url(${user.homeBackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            } : {};

            const handleOpenTask = (task) => {
                const targetWs = (Array.isArray(workspaces) ? workspaces : []).find(w => w._id === task.workspaceId || w.id === task.workspaceId);
                if (targetWs) {
                    onSelectRef.current(targetWs, task.id || task._id);
                } else {
                    showToast(t('alerts.board_not_found') || 'Board not found for this task.');
                }
            };

            if (showMyTasks) {
                return <window.MyTasksView user={user} workspaces={workspaces} theme={theme} onThemeChange={onThemeChange} onLogout={onLogout} onUpdateUser={onUpdateUser} onBack={() => setShowMyTasks(false)} onOpenTask={handleOpenTask} />;
            }

            return (
                <div className="h-screen bg-white animate-fade-in relative flex flex-col text-black" style={homeStyle}>
                {pinPrompt.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 animate-fade-in">
                    <div className="max-w-[320px] w-[95%] mx-auto bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6"><window.Icon name="shield-alert" size={32} className="text-blue-500" /></div>
                        <h2 className="text-2xl font-black italic tracking-tighter mb-2">{t('labels.vault_security')}</h2>
                        <p className="text-[10px] text-gray-500 mb-6">{t('alerts.master_pin_requirement')}</p>
                        <div className="space-y-4">
                            <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-400 text-black font-black" type="password" placeholder={t('labels.enter_pin')} autoFocus required value={pinPrompt.pin} onChange={e => { setPinPrompt(p => ({ ...p, pin: e.target.value })); setPinError(''); }} onKeyDown={e => e.key === 'Enter' && handleCreatePin(e)} />
                            <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-400 text-black font-black" type="password" placeholder={t('labels.confirm_pin')} required value={pinPrompt.confirm} onChange={e => { setPinPrompt(p => ({ ...p, confirm: e.target.value })); setPinError(''); }} onKeyDown={e => e.key === 'Enter' && handleCreatePin(e)} />
                            <button type="button" onClick={(e) => handleCreatePin(e)} disabled={pinLoading} className="w-full py-3 bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                {pinLoading && <window.Icon name="loader" size={14} className="animate-spin" />} {t('actions.create_vault_pin')}
                            </button>
                            {pinError && <p className="text-red-500 text-[10px] font-bold animate-shake">{pinError}</p>}
                        </div>
                    </div>
                </div>
            )}
                    <nav className={`h-16 px-6 lg:px-12 flex items-center justify-between transition-colors duration-500 shadow-sm ${headerClass}`}>
                        <div className="flex items-center gap-8">
                            <h1 className={`text-xl font-black italic tracking-tighter ${isDarkHeader ? 'text-white' : 'text-black'}`}>{t('app_name')}</h1>
                            {isAdmin && (
                                <button onClick={() => setShowUserManagement(true)} className={`text-[10px] font-black uppercase tracking-widest transition hover:opacity-70 flex items-center gap-2 ${isDarkHeader ? 'text-white/80' : 'text-gray-500'}`}>
                                    <window.Icon name="users" size={14} /> {t('labels.user_management')}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4 relative">
                            <div
                                ref={notificationDropdownRef}
                                className={`p-2.5 rounded-xl transition cursor-pointer relative ${isDarkHeader ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                            >
                                <window.Icon name="bell" size={18} className={isDarkHeader ? 'text-white' : 'text-black'} />
                                {globalNotifications.length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
                                        {globalNotifications.length > 9 ? '9+' : globalNotifications.length}
                                    </span>
                                )}
                                {showNotificationDropdown && (
                                    <div
                                        className="absolute top-full right-0 mt-2 w-[min(23rem,calc(100vw-2rem))] max-w-[23rem] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[150] animate-pop text-black overflow-hidden flex flex-col"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                                                {t('labels.workspace_notifications') || 'Notifications'}
                                            </p>
                                            {globalNotifications.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setGlobalNotifications(window.NTNotifications?.clearAll?.() || []);
                                                    }}
                                                >
                                                    {t('labels.clear_workspace_notifications') || 'Clear all'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-72 overflow-y-auto no-scrollbar p-2">
                                            {globalNotifications.length === 0 ? (
                                                <p className="text-xs text-gray-400 text-center py-6 px-3">
                                                    {t('labels.no_workspace_notifications') || 'No notifications yet.'}
                                                </p>
                                            ) : (
                                                globalNotifications.map((n) => (
                                                    <div
                                                        key={`${n.workspaceId}-${n.id}`}
                                                        className="group flex gap-2 p-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition text-left"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            {n.workspaceName ? (
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 truncate mb-1">{n.workspaceName}</p>
                                                            ) : null}
                                                            <p className="text-[11px] text-gray-800 leading-snug">{n.message}</p>
                                                            {n.createdAt ? (
                                                                <p className="text-[9px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                                            ) : null}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            title={t('actions.remove') || 'Remove'}
                                                            className="shrink-0 p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setGlobalNotifications(window.NTNotifications?.remove?.(n) || []);
                                                            }}
                                                        >
                                                            <window.Icon name="x" size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <window.ProfileMenu user={user} onLogout={onLogout} onThemeChange={onThemeChange} currentTheme={theme} onUpdateUser={onUpdateUser} onOpenProfile={onOpenProfile} />
                        </div>
                    </nav>
                    {showUserManagement && <window.UserManagement user={user} adminEmail={adminEmail} onClose={() => setShowUserManagement(false)} />}
                    <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 20px; border: 3px solid #FAFAFA; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
    `}</style>
    <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
        <div className="max-w-5xl mx-auto p-4 md:p-10">
                        <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-black tracking-tighter">{viewArchived ? t('actions.archive_workspace') : t('labels.workspace') + 's'}</h2>
                                <p className="text-gray-400 mt-2 font-bold uppercase tracking-[0.2em] text-[10px]">{t('labels.project_command_hub') || "Project Command Hub"}</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <button onClick={() => setShowMyTasks(true)} className="px-6 py-4 rounded-full bg-white text-gray-700 border border-gray-200 shadow-xl hover:scale-105 active:scale-95 transition flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                    <window.Icon name="list-checks" size={18} /> {t('labels.my_tasks') || 'My Tasks'}
                                </button>
                                {isAdmin && (
                                    <button onClick={() => setViewArchived(!viewArchived)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${viewArchived ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                        <window.Icon name={viewArchived ? "layout" : "archive"} size={16} />
                                    </button>
                                )}
                                {!viewArchived && <button onClick={addWS} className="w-14 h-14 flex items-center justify-center bg-black text-white rounded-full shadow-xl hover:scale-110 active:scale-90 transition"><window.Icon name="plus" size={22} /></button>}
                            </div>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {displayWorkspaces.map(ws => {
                                const wsId = ws.id || ws._id;
                                return (
                                <div key={wsId} onClick={() => onSelect(ws)} className="cursor-pointer bg-white border border-gray-100 rounded-[2rem] p-8 insta-shadow hover:shadow-xl hover:scale-[1.03] transition-all duration-300 group relative">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${ws.color} mb-6 flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:rotate-6 transition-transform`}>{ws.avatar}</div>
                                    <h3 className="text-xl font-black text-black tracking-tight">{ws.name}</h3>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-4">{ws.createdAt ? t('labels.created_at', {date: new Date(ws.createdAt).toLocaleDateString()}) : t('labels.created_at', {date: 'N/A'})}</p>
                                    {isAdmin && (
                                        <button onClick={(e) => toggleArchive(e, wsId, ws.archived)} className="absolute top-8 right-8 p-2 text-gray-200 hover:text-gray-400 transition opacity-0 group-hover:opacity-100">
                                            <window.Icon name={ws.archived ? "rotate-ccw" : "archive"} size={18} />
                                        </button>
                                    )}
                                    {isAdmin ? (
                                        <button onClick={(e) => { e.stopPropagation(); showConfirm(t('actions.destroy_workspace') || "Destroy Workspace", t('alerts.confirm_destroy_workspace') || "PERMANENTLY delete this workspace?", async () => { await fetch(`/api/workspaces/${wsId}`, { method: "DELETE", headers: { "user-email": user?.email } }); setWorkspaces(prev => prev.filter(w => (w.id !== wsId && w._id !== wsId))); showToast(t('alerts.workspace_destroyed') || "Workspace destroyed."); }); }} className="absolute bottom-8 right-8 p-2 text-red-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                            <window.Icon name="trash-2" size={18} />
                                        </button>
                                    ) : null}
                                </div>
                                );
                            })}
                            {displayWorkspaces.length === 0 && <div className="col-span-full py-20 text-center text-gray-300 italic text-sm">{t('labels.no_active_workspaces')}</div>}
                        </div>
                </div>
            </div>
        </div>
    );
};
