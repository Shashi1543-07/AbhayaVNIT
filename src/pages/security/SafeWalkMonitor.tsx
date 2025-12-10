import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { safeWalkService, type SafeWalkSession, type SafeWalkLocation } from '../../services/safeWalkService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MapPin, Clock, Shield, AlertCircle, UserPlus, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function SafeWalkMonitor() {
    const [activeWalks, setActiveWalks] = useState<SafeWalkSession[]>([]);
    const [selectedWalk, setSelectedWalk] = useState<SafeWalkSession | null>(null);
    const [liveLocation, setLiveLocation] = useState<SafeWalkLocation | null>(null);
    const [securityPersonnel, setSecurityPersonnel] = useState<any[]>([]);
    const [selectedEscort, setSelectedEscort] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const unsubscribe = safeWalkService.subscribeToActiveWalks((walks) => {
            setActiveWalks(walks);
        });

        fetchSecurityPersonnel();

        return () => unsubscribe();
    }, []);

    // Subscribe to selected walk's location
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

    const fetchSecurityPersonnel = async () => {
        try {
            const q = query(collection(db, 'users'), where('role', '==', 'security'));
            const snapshot = await getDocs(q);
            const personnel = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSecurityPersonnel(personnel);
        } catch (error) {
            console.error('Error fetching security personnel:', error);
        }
    };

    const handleAssignEscort = async () => {
        if (!selectedWalk || !selectedEscort) return;
        const escort = securityPersonnel.find(p => p.id === selectedEscort);
        if (!escort) return;

        try {
            await safeWalkService.assignEscort(selectedWalk.id, escort.name, escort.id);
            setSelectedEscort('');
            alert('Escort assigned successfully!');
        } catch (error) {
            console.error('Error assigning escort:', error);
            alert('Failed to assign escort');
        }
    };

    const handleSendMessage = async () => {
        if (!selectedWalk || !message) return;
        try {
            await safeWalkService.sendMessageToStudent(
                selectedWalk.id,
                message,
                'security-id', // In real app, use auth.currentUser.uid
                'Security Team'
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
        <Layout role="security">
            <motion.div
                className="mb-8"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={cardVariant}>
                    <h1 className="text-2xl font-bold text-slate-800">Safe Walk Monitor</h1>
                    <p className="text-slate-600">Real-time tracking of active safe walks</p>
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
                            <p className="text-center text-slate-500 py-8">No active safe walks</p>
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
                                            <p className="text-xs text-slate-500">{walk.userHostel || 'No hostel'}</p>
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
                                        {walk.escortRequested && (
                                            <span className="text-warning font-bold flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Escort Requested
                                            </span>
                                        )}
                                    </div>

                                    {walk.note && (
                                        <div className="mt-2 p-2 bg-warning/10 rounded-lg">
                                            <p className="text-xs text-slate-700">{walk.note}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Walk Details & Actions */}
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
                                            Speed: {liveLocation.speed?.toFixed(1) || 0} m/s<br />
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

                                {/* Escort Assignment */}
                                {!selectedWalk.assignedEscort && (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Assign Escort</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={selectedEscort}
                                                onChange={(e) => setSelectedEscort(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                            >
                                                <option value="">Select personnel</option>
                                                {securityPersonnel.map((person) => (
                                                    <option key={person.id} value={person.id}>
                                                        {person.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={handleAssignEscort}
                                                disabled={!selectedEscort}
                                                className="px-4 py-2 bg-primary text-white rounded-lg font-bold disabled:opacity-50 flex items-center gap-1 text-sm"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                Assign
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {selectedWalk.assignedEscort && (
                                    <div className="bg-success/10 p-4 rounded-xl border border-success/30">
                                        <p className="text-sm font-bold text-success flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Escort Assigned: {selectedWalk.assignedEscort}
                                        </p>
                                    </div>
                                )}

                                {/* Send Message */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Send Message to Student</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Type message..."
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!message}
                                            className="px-4 py-2 bg-primary text-white rounded-lg font-bold disabled:opacity-50 flex items-center gap-1 text-sm"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            Send
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
