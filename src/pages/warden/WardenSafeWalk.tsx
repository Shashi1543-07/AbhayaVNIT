import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { safeWalkService, type SafeWalkSession, type SafeWalkLocation } from '../../services/safeWalkService';
import { useAuthStore } from '../../context/authStore';
import { MapPin, Clock, Shield, MessageSquare, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function WardenSafeWalk() {
    const { profile } = useAuthStore();
    const [activeWalks, setActiveWalks] = useState<SafeWalkSession[]>([]);
    const [selectedWalk, setSelectedWalk] = useState<SafeWalkSession | null>(null);
    const [liveLocation, setLiveLocation] = useState<SafeWalkLocation | null>(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (profile?.hostelId) {
            const unsubscribe = safeWalkService.subscribeToActiveWalks(
                (walks) => setActiveWalks(walks),
                profile.hostelId
            );
            return () => unsubscribe();
        }
    }, [profile]);

    useEffect(() => {
        if (selectedWalk) {
            const unsubscribe = safeWalkService.subscribeToWalkLocation(selectedWalk.id, (location) => {
                setLiveLocation(location);
            });
            return () => unsubscribe();
        } else {
            setLiveLocation(null);
        }
    }, [selectedWalk]);

    const handleSendAcknowledgment = async () => {
        if (!selectedWalk || !message) return;
        try {
            await safeWalkService.sendMessageToStudent(
                selectedWalk.id,
                message,
                'warden-id', // In real app, use auth.currentUser.uid
                'Hostel Warden'
            );
            setMessage('');
            alert('Message sent to student');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-success text-success';
            case 'paused': return 'bg-warning text-warning';
            case 'delayed': return 'bg-warning text-warning';
            case 'off-route': return 'bg-emergency text-emergency';
            case 'danger': return 'bg-emergency text-emergency';
            default: return 'bg-slate-500 text-slate-500';
        }
    };

    const getElapsedTime = (walk: SafeWalkSession) => {
        const startTime = walk.startTime?.toDate ? walk.startTime.toDate() : new Date(walk.startTime as any);
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60000);
        return `${elapsed} mins`;
    };

    return (
        <Layout role="warden">
            <motion.div
                className="mb-8"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={cardVariant}>
                    <h1 className="text-2xl font-bold text-slate-800">Safe Walk Monitor</h1>
                    <p className="text-slate-600">Monitor safe walks from {profile?.hostelId} hostel</p>
                </motion.div>
            </motion.div>

            <motion.div
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Active Walks List */}
                <motion.div variants={cardVariant} className="glass-card p-6 rounded-xl border border-white/40">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Active Walks ({activeWalks.length})
                    </h2>

                    <div className="space-y-3">
                        {activeWalks.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No active safe walks from your hostel</p>
                        ) : (
                            activeWalks.map((walk) => (
                                <div
                                    key={walk.id}
                                    onClick={() => setSelectedWalk(walk)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedWalk?.id === walk.id
                                            ? 'bg-primary/10 border-primary shadow-md'
                                            : 'bg-white border-slate-200 hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{walk.userName}</h3>
                                            <p className="text-xs text-slate-500">{walk.userHostel}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(walk.status).split(' ')[0]}/20 ${getStatusColor(walk.status).split(' ')[1]}`}>
                                            {walk.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                                        <MapPin className="w-3 h-3" />
                                        <span>{walk.destination.name}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {getElapsedTime(walk)} / {walk.expectedDuration}m
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Walk Details */}
                <motion.div variants={cardVariant} className="glass-card p-6 rounded-xl border border-white/40">
                    {selectedWalk ? (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 mb-4">Walk Details</h2>

                                {/* Live Location */}
                                {liveLocation && (
                                    <div className="bg-success/10 p-4 rounded-xl mb-4 border border-success/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                            <span className="text-sm font-bold text-success">Live Location</span>
                                        </div>
                                        <p className="text-xs text-slate-600">
                                            Lat: {liveLocation.latitude.toFixed(6)}<br />
                                            Lng: {liveLocation.longitude.toFixed(6)}<br />
                                            Updated: {new Date(liveLocation.lastUpdated).toLocaleTimeString()}
                                        </p>
                                    </div>
                                )}

                                {/* Route Info */}
                                <div className="bg-white p-4 rounded-xl space-y-2 mb-4 border border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-success rounded-full" />
                                        <span className="text-sm text-slate-600">Start: {selectedWalk.startLocation.name || 'Current Location'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-primary rounded-full" />
                                        <span className="text-sm text-slate-600">Destination: {selectedWalk.destination.name}</span>
                                    </div>
                                </div>

                                {selectedWalk.assignedEscort && (
                                    <div className="bg-success/10 p-4 rounded-xl border border-success/30 mb-4">
                                        <p className="text-sm font-bold text-success flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Escort Assigned: {selectedWalk.assignedEscort}
                                        </p>
                                    </div>
                                )}

                                {/* Send Acknowledgment */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Send Message</label>
                                    <div className="space-y-2">
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Send acknowledgment or safety message..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                                        />
                                        <button
                                            onClick={handleSendAcknowledgment}
                                            disabled={!message}
                                            className="w-full px-4 py-2 bg-primary text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Send className="w-4 h-4" />
                                            Send Message
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Timeline</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {selectedWalk.timeline.map((entry, index) => (
                                        <div key={index} className="flex items-start gap-2 text-xs">
                                            <div className="w-2 h-2 bg-primary rounded-full mt-1" />
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-700">{entry.details}</p>
                                                <p className="text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                            <Shield className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-slate-500">Select a walk to view details</p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </Layout>
    );
}
