import MobileWrapper from '../../components/layout/MobileWrapper';
import { sosService } from '../../services/sosService';
import { useAuthStore } from '../../context/authStore';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import SOSButton from '../../components/ui/SOSButton';
import ActionCard from '../../components/ui/ActionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { Footprints, Shield, AlertTriangle, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { broadcastService, type Broadcast } from '../../services/broadcastService';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const [sosActive, setSosActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

    useEffect(() => {
        if (profile?.hostelId) {
            const unsubscribe = broadcastService.subscribeToBroadcasts(profile.hostelId, (data) => {
                setBroadcasts(data);
            });
            return () => unsubscribe();
        }
    }, [profile?.hostelId]);

    const handleSOS = async (type: 'medical' | 'harassment' | 'general') => {
        if (!user) return;
        setLoading(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0,
                });
            });
            const location = { lat: position.coords.latitude, lng: position.coords.longitude };
            const userData = {
                uid: user.uid,
                displayName: profile?.name || user.displayName,
                phoneNumber: profile?.contactNumber || user.phoneNumber,
                role: 'student',
                hostelId: profile?.hostelId || profile?.hostel,
                roomNo: profile?.roomNo,
            };
            await sosService.triggerSOS(userData, location, type);
            setSosActive(true);
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
        } catch (error) {
            console.error('Failed to trigger SOS', error);
            alert('Failed to activate SOS. Please call emergency services directly.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileWrapper>
            <TopHeader
                title={profile?.name ? `Welcome, ${profile.name.split(' ')[0]}!` : 'Welcome!'}
                showNotifications={true}
            />

            <motion.main
                className="px-4 py-6 space-y-6"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* SOS Section */}
                <motion.div variants={cardVariant} className="flex flex-col items-center justify-center py-4">
                    <SOSButton onActivate={handleSOS} disabled={loading} />
                    <p className="text-muted text-xs mt-4">Long press to activate emergency</p>
                </motion.div>

                {/* Location Info */}
                <motion.div variants={cardVariant} className="glass-card rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-surface p-2 rounded-full">
                            <MapPin className="text-secondary w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted font-medium">Nearby Area</p>
                            <p className="font-semibold text-primary">Workshop Road</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <StatusBadge status="success" label="GPS: ON" />
                    </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={cardVariant}>
                    <h3 className="text-sm font-bold text-primary mb-3 ml-1">Quick Actions</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <ActionCard icon={Footprints} label="Safe Walk" onClick={() => navigate('/student/safewalk')} />
                        <ActionCard icon={Shield} label="Escort" onClick={() => navigate('/student/escort')} />
                        <ActionCard icon={AlertTriangle} label="Report" onClick={() => navigate('/student/report')} />
                    </div>
                </motion.div>

                {/* Live Status */}
                {sosActive && (
                    <motion.div variants={cardVariant} className="glass-card rounded-2xl p-4 border-l-4 border-emergency">
                        <h3 className="text-sm font-bold text-primary mb-2">Live Status</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                                </span>
                                <span className="font-semibold text-emergency">SOS Active</span>
                            </div>
                            <span className="text-xs text-muted">Guard on the way (2 min)</span>
                        </div>
                    </motion.div>
                )}

                {/* Alerts / Broadcasts */}
                {broadcasts.length > 0 && (
                    <motion.div variants={cardVariant} className="space-y-3">
                        {broadcasts.map((broadcast) => (
                            <div
                                key={broadcast.id}
                                className={`glass-card rounded-2xl p-4 border ${broadcast.priority === 'urgent' ? 'bg-emergency-pulse border-emergency/30' : broadcast.priority === 'warning' ? 'bg-warning/10 border-warning/30' : 'bg-surface border-secondary/30'}`}
                            >
                                <h3 className={`text-sm font-bold mb-1 flex items-center ${broadcast.priority === 'urgent' ? 'text-emergency' : broadcast.priority === 'warning' ? 'text-warning' : 'text-secondary'}`}>
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    {broadcast.title}
                                </h3>
                                <p className={`text-xs ${broadcast.priority === 'urgent' ? 'text-emergency' : broadcast.priority === 'warning' ? 'text-warning' : 'text-secondary'}`}>{broadcast.message}</p>
                                <p className="text-[10px] text-muted mt-2 text-right">
                                    {new Date(broadcast.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()} • {new Date(broadcast.createdAt?.seconds * 1000 || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* My Reports Preview */}
                <motion.div variants={cardVariant}>
                    <div className="flex justify-between items-center mb-3 ml-1">
                        <h3 className="text-sm font-bold text-primary">My Reports</h3>
                        <button onClick={() => navigate('/student/reports')} className="text-xs text-primary font-medium">
                            View All
                        </button>
                    </div>
                    {/* Placeholder for report cards - can be populated later */}
                </motion.div>
            </motion.main>

            <BottomNav />
        </MobileWrapper>
    );
}
