window.Toast = ({ message, type = 'info', onRemove }) => {
    React.useEffect(() => {
        const timer = setTimeout(onRemove, type === 'error' ? 5000 : 3500);
        return () => clearTimeout(timer);
    }, []);
    const { t } = window.useTranslation ? window.useTranslation() : { t: k => k };
    const isError = type === 'error';
    return (
        <div className={`toast-item bg-white p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-in text-black ${isError ? 'border border-red-100' : 'border border-gray-100'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-inner ${isError ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                <window.Icon name={isError ? 'alert-circle' : 'sparkles'} size={16} />
            </div>
            <div>
                <p className={`text-xs font-black tracking-tight ${isError ? 'text-red-700' : 'text-gray-800'}`}>{message}</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{isError ? (t('labels.error') || 'Error') : (t('labels.system_broadcast') || 'System Broadcast')}</p>
            </div>
        </div>
    );
};
