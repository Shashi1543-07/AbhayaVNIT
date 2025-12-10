import React, { useEffect, useState } from 'react';
import { patrolService, type PatrolLog } from '../../services/patrolService';
import { ClipboardList, Plus, MapPin, Clock } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';

export default function PatrolLogs() {
    const { user } = useAuthStore();
    const [logs, setLogs] = useState<PatrolLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [zone, setZone] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const unsubscribe = patrolService.subscribeToLogs((fetchedLogs) => {
            setLogs(fetchedLogs);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !zone) return;

        setIsSubmitting(true);
        try {
            await patrolService.addLog({
                zone,
                guardName: user.displayName || 'Security Guard',
                notes
            });
            // Reset form
            setZone('');
            setNotes('');
        } catch (error) {
            console.error("Failed to submit log:", error);
            alert("Failed to submit patrol log.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left: Submission Form */}
            <div className="glass-card rounded-2xl p-6 h-fit border border-surface">
                <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-secondary" />
                    New Patrol Entry
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Zone / Area</label>
                        <select
                            required
                            className="w-full p-2 border border-surface rounded-xl bg-background text-primary focus:ring-2 focus:ring-primary/50 outline-none"
                            value={zone}
                            onChange={(e) => setZone(e.target.value)}
                        >
                            <option value="">Select Zone</option>
                            <option value="Main Gate">Main Gate</option>
                            <option value="Girls Hostel Area">Girls Hostel Area</option>
                            <option value="Library Area">Library Area</option>
                            <option value="Sports Complex">Sports Complex</option>
                            <option value="Academic Block">Academic Block</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Notes (Optional)</label>
                        <textarea
                            className="w-full p-2 border border-surface rounded-xl bg-background text-primary focus:ring-2 focus:ring-primary/50 outline-none h-24 resize-none"
                            placeholder="Observations, incidents, or status..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary text-white py-2 rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Log'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Right: Logs List */}
            <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden flex flex-col h-[600px] lg:h-full border border-surface">
                <div className="p-4 border-b border-surface bg-background/50">
                    <h2 className="font-bold text-primary flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-muted" />
                        Recent Patrol Logs
                    </h2>
                </div>

                <div className="overflow-y-auto flex-1 p-4 space-y-4">
                    {loading ? (
                        <p className="text-center text-muted py-8">Loading logs...</p>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-muted/50">
                            <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>No patrol logs recorded yet.</p>
                        </div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="flex gap-4 p-4 border border-surface rounded-xl hover:bg-surface/50 transition-colors">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {log.guardName[0]}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-primary">{log.guardName}</h3>
                                        <span className="text-xs text-muted font-mono flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-secondary-dark font-medium mt-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {log.zone}
                                    </p>
                                    {log.notes && (
                                        <p className="text-sm text-muted mt-2 bg-background/50 p-2 rounded-lg border border-surface">
                                            {log.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
