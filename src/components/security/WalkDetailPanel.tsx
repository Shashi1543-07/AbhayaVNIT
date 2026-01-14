import { useState } from 'react';
import { X, Shield, MapPin, MessageSquare, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { mapService, type LocationData } from '../../services/mapService';
import EventDetailMap from '../map/EventDetailMap';
import { useAuthStore } from '../../context/authStore';
import { useEffect } from 'react';
import StatusBadge from '../ui/StatusBadge';

interface WalkDetailPanelProps {
    walk: SafeWalkSession;
    onClose: () => void;
}

// Mock security personnel list (in real app, fetch from Firestore)
const SECURITY_PERSONNEL = [
    { id: 'sec_001', name: 'Ramesh Kumar' },
    { id: 'sec_002', name: 'Suresh Patil' },
    { id: 'sec_003', name: 'Mahesh Singh' },
    { id: 'sec_004', name: 'Rajesh Sharma' },
];

export default function WalkDetailPanel({ walk, onClose }: WalkDetailPanelProps) {
    const { user, profile } = useAuthStore();
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [selectedEscort, setSelectedEscort] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);

    // Subscribe to live location
    useEffect(() => {
        if (!walk.userId) return;
        const unsub = mapService.subscribeToSingleLocation(walk.userId, (loc) => {
            setLiveLocation(loc);
        });
        return () => unsub();
    }, [walk.userId]);

    const handleAssignEscort = async () => {
        if (!selectedEscort || !user) return;
        setAssigning(true);
        try {
            const escort = SECURITY_PERSONNEL.find(p => p.id === selectedEscort);
            if (escort) {
                await safeWalkService.assignEscort(walk.id, escort.name);
                alert(`Escort ${escort.name} assigned successfully!`);
                setSelectedEscort('');
            }
        } catch (error) {
            console.error("Failed to assign escort:", error);
            alert("Failed to assign escort. Please try again.");
        } finally {
            setAssigning(false);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !user) return;
        setSending(true);
        try {
            await safeWalkService.sendMessageToStudent(
                walk.id,
                message.trim(),
                profile?.name || user.displayName || 'Security'
            );
            setMessage('');
            alert("Message sent to student!");
        } catch (error) {
            console.error("Failed to send message:", error);
            alert("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const handleMarkCompleted = async () => {
        if (!confirm("Mark this walk as completed?")) return;
        try {
            await safeWalkService.updateWalkStatus(walk.id, 'completed');
            alert("Walk marked as completed");
            onClose();
        } catch (error) {
            console.error("Failed to mark completed:", error);
            alert("Failed to mark walk as completed");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'danger':
                return 'error';
            case 'delayed':
            case 'off-route':
            case 'paused':
                return 'warning';
            default:
                return 'success';
        }
    };

    return (
        <div className="fixed inset-x-0 mx-auto w-full max-w-[480px] inset-y-0 z-50 flex items-end bg-black/50 p-0">
            <div className="bg-white w-full rounded-t-3xl overflow-hidden shadow-2xl max-h-[90vh] min-h-[60vh] flex flex-col border-x border-white/20">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-background">
                    <div>
                        <h3 className="font-bold text-lg text-primary">Walk Details</h3>
                        <p className="text-xs text-muted">ID: {walk.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={getStatusColor(walk.status)} label={walk.status.toUpperCase()} />
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-surface rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-muted" />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Student Info */}
                    <div className="glass-card rounded-2xl p-4 border border-surface">
                        <h4 className="text-sm font-bold text-primary mb-3">Student Information</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">Name:</span>
                                <span className="font-semibold text-primary">{walk.userName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Hostel:</span>
                                <span className="font-semibold text-primary">{walk.userHostel || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Expected Duration:</span>
                                <span className="font-semibold text-primary">{walk.expectedDuration} min</span>
                            </div>
                        </div>
                    </div>

                    {/* Route Info */}
                    <div className="glass-card rounded-2xl p-4 border border-surface">
                        <h4 className="text-sm font-bold text-primary mb-3">Route Information</h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-success mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted">Start Location</p>
                                    <p className="font-semibold text-sm text-primary">
                                        {walk.startLocation.name || `${walk.startLocation.lat.toFixed(4)}, ${walk.startLocation.lng.toFixed(4)}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-emergency mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted">Destination</p>
                                    <p className="font-semibold text-sm text-primary">{walk.destination.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tactical Map Pod */}
                    <div className="glass-card rounded-2xl border border-surface overflow-hidden h-48 relative shadow-inner">
                        <EventDetailMap
                            userName={walk.userName}
                            eventType="SAFEWALK"
                            location={liveLocation}
                            destination={{
                                lat: walk.destination.lat,
                                lng: walk.destination.lng
                            }}
                        />
                        <div className="absolute top-2 left-2 z-[400] bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg border shadow-sm">
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Live Intel Map</span>
                        </div>
                    </div>

                    {/* Optional Message */}
                    {walk.message && (
                        <div className="glass-card bg-warning/10 rounded-2xl p-4 border border-warning/20">
                            <h4 className="text-sm font-bold text-warning-dark mb-2">Student's Note</h4>
                            <p className="text-sm text-warning-dark italic">"{walk.message}"</p>
                        </div>
                    )}

                    {/* Escort Request Status */}
                    {walk.escortRequested && !walk.assignedEscort && (
                        <div className="glass-card bg-secondary/10 rounded-2xl p-4 border border-secondary/20">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-secondary" />
                                <p className="font-bold text-secondary-dark">Escort Requested</p>
                            </div>
                        </div>
                    )}

                    {/* Assigned Escort */}
                    {walk.assignedEscort && (
                        <div className="glass-card bg-success/10 rounded-2xl p-4 border border-success/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-5 h-5 text-success" />
                                <p className="font-bold text-success-dark">Escort Assigned</p>
                            </div>
                            <p className="text-sm text-success-dark ml-7">{walk.assignedEscort}</p>
                        </div>
                    )}

                    {/* Assign Escort Section */}
                    {!walk.assignedEscort && (
                        <div className="glass-card rounded-2xl p-4 border border-surface">
                            <h4 className="text-sm font-bold text-primary mb-3">Assign Escort</h4>
                            <div className="flex gap-2">
                                <select
                                    value={selectedEscort}
                                    onChange={(e) => setSelectedEscort(e.target.value)}
                                    className="flex-1 p-2 rounded-xl border border-surface bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    <option value="">Select security personnel...</option>
                                    {SECURITY_PERSONNEL.map(person => (
                                        <option key={person.id} value={person.id}>{person.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAssignEscort}
                                    disabled={!selectedEscort || assigning}
                                    className="px-4 py-2 bg-secondary text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary-dark transition-colors"
                                >
                                    {assigning ? 'Assigning...' : 'Assign'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Send Message Section */}
                    <div className="glass-card rounded-2xl p-4 border border-surface">
                        <h4 className="text-sm font-bold text-primary mb-3 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Send Message to Student
                        </h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type a message..."
                                className="flex-1 p-2 rounded-xl border border-surface bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!message.trim() || sending}
                                className="px-4 py-2 bg-primary text-white rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                                {sending ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </div>

                    {/* Timeline */}
                    {walk.timeline && walk.timeline.length > 0 && (
                        <div className="glass-card rounded-2xl p-4 border border-surface">
                            <h4 className="text-sm font-bold text-primary mb-3">Timeline</h4>
                            <div className="space-y-3 relative pl-4 border-l-2 border-surface">
                                {walk.timeline.map((event, idx) => (
                                    <div key={idx} className="relative">
                                        <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-surface border-2 border-white"></span>
                                        <p className="text-xs text-muted">
                                            {event.timestamp?.toDate ? event.timestamp.toDate().toLocaleTimeString() :
                                                event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'No time'}
                                        </p>
                                        <p className="text-sm text-primary">{event.details}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-background flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-bold text-muted bg-surface border-2 border-surface hover:bg-background transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleMarkCompleted}
                        disabled={walk.status === 'completed'}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-success hover:bg-success-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Mark Completed
                    </button>
                </div>
            </div>
        </div>
    );
}
