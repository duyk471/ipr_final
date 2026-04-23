import React from 'react';
import useNotificationStore from '../../store/useNotificationStore';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const NotificationContainer = () => {
    const { notifications, removeNotification } = useNotificationStore();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-6 right-6 z-[2000] flex flex-col gap-3 pointer-events-none">
            {notifications.map((notification) => (
                <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onClose={() => removeNotification(notification.id)} 
                />
            ))}
        </div>
    );
};

const NotificationItem = ({ notification, onClose }) => {
    const { message, type } = notification;

    const styles = {
        success: {
            bg: 'bg-white/90 dark:bg-biophilic-dark-card/95',
            border: 'border-biophilic-green dark:border-biophilic-dark-green',
            icon: <CheckCircle2 size={18} className="text-biophilic-green glow-green" />,
            textColor: 'text-biophilic-moss dark:text-biophilic-dark-text'
        },
        error: {
            bg: 'bg-white/90 dark:bg-biophilic-dark-card/95',
            border: 'border-red-400 dark:border-red-500',
            icon: <AlertCircle size={18} className="text-red-500" />,
            textColor: 'text-biophilic-bark dark:text-biophilic-dark-text'
        },
        warning: {
            bg: 'bg-white/90 dark:bg-biophilic-dark-card/95',
            border: 'border-biophilic-rose dark:border-biophilic-dark-rose',
            icon: <AlertTriangle size={18} className="text-biophilic-rose glow-rose" />,
            textColor: 'text-biophilic-bark dark:text-biophilic-dark-text'
        },
        info: {
            bg: 'bg-white/90 dark:bg-biophilic-dark-card/95',
            border: 'border-biophilic-green/30 dark:border-biophilic-dark-border',
            icon: <Info size={18} className="text-biophilic-bark/60 dark:text-biophilic-dark-text-muted" />,
            textColor: 'text-biophilic-bark dark:text-biophilic-dark-text'
        }
    };

    const style = styles[type] || styles.info;

    return (
        <div className={`
            pointer-events-auto
            flex items-center gap-4 px-5 py-4 min-w-[320px] max-w-[450px]
            ${style.bg} ${style.border} border
            rounded-2xl shadow-organic-lg dark:shadow-dark-md
            backdrop-blur-md animate-in slide-in-from-right-4 duration-300
        `}>
            <div className="shrink-0">
                {style.icon}
            </div>
            <p className={`flex-1 text-[13px] font-bold leading-relaxed ${style.textColor}`}>
                {message}
            </p>
            <button 
                onClick={onClose}
                className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-biophilic-bark/30 dark:text-biophilic-dark-text-muted transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default NotificationContainer;
