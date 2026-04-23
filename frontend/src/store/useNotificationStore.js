import { create } from 'zustand';

const useNotificationStore = create((set) => ({
    notifications: [],
    
    /**
     * Add a new notification
     * @param {Object} notification { message, type: 'info' | 'success' | 'error' | 'warning', duration?: number }
     */
    notify: (notification) => {
        const id = Date.now();
        const { message, type = 'info', duration = 4000 } = notification;
        
        set((state) => ({
            notifications: [...state.notifications, { id, message, type }]
        }));
        
        if (duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id)
                }));
            }, duration);
        }
        
        return id;
    },
    
    removeNotification: (id) => {
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id)
        }));
    }
}));

export default useNotificationStore;
