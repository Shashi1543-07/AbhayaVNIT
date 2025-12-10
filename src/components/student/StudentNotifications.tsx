import { useEffect, useState } from 'react';
import { broadcastService, type Broadcast } from '../../services/broadcastService';
import { Bell, AlertCircle, Info, AlertTriangle, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';

export default function StudentNotifications() {
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState<Broadcast[]>([]);

    useEffect(() => {
        const userHostelId = (user as any)?.hostelId;
        if (!userHostelId) return;

        const unsubscribe = broadcastService.subscribeToBroadcasts(userHostelId, (data) => {
            setNotifications(data);
        });
        return () => unsubscribe();
    }, [user]);

    // Show only top 3 recent
    const recentNotifications = notifications.slice(0, 3);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Recent Alerts
                </h2>
                <button className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-3">
                {recentNotifications.length === 0 ? (
                    <div className="bg-surface p-6 rounded-xl border border-surface shadow-sm text-center text-muted">
                        <p>No new alerts.</p>
                    </div>
                ) : (
                    recentNotifications.map(note => (
                        <div key={note.id} className="bg-surface p-4 rounded-xl border border-surface shadow-sm flex gap-3 hover:shadow-md transition-shadow">
                            <div className="mt-1 flex-shrink-0">
                                {note.priority === 'urgent' ? (
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                ) : note.priority === 'warning' ? (
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                ) : (
                                    <Info className="w-5 h-5 text-blue-500" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-primary">{note.title}</p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{note.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    {note.createdAt?.seconds ? new Date(note.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
