import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { incidentService, type Incident } from '../../services/incidentService';
import { userService, type StudentProfile } from '../../services/userService';
import { useAuthStore } from '../../context/authStore';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import { User, Phone, Mail, MapPin, MessageSquare } from 'lucide-react';

export default function WardenReportDetail() {
    const { id } = useParams();
    const { user, profile } = useAuthStore();
    const [incident, setIncident] = useState<Incident | null>(null);
    const [reporterProfile, setReporterProfile] = useState<StudentProfile | null>(null);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIncident = async () => {
            if (!id) return;
            const data = await incidentService.getIncidentById(id);
            if (data) {
                setIncident(data);
                if (data.userId) {
                    const profileData = await userService.getUserProfile(data.userId);
                    if (profileData) {
                        setReporterProfile({
                            id: profileData.id,
                            displayName: profileData.name || profileData.displayName || 'Unnamed',
                            email: profileData.email || '',
                            role: 'student',
                            hostelId: profileData.hostelId,
                            roomNo: profileData.roomNo,
                            phone: profileData.phoneNumber || profileData.phone,
                            emergencyContact: profileData.emergencyContact || profileData.emergencyPhone,
                        } as StudentProfile);
                    }
                }
            }
            setLoading(false);
        };
        fetchIncident();
    }, [id]);

    const handleStatusUpdate = async (status: Incident['status']) => {
        if (!incident || !user) return;
        try {
            await incidentService.updateIncidentStatus(incident.id, status, user.uid);
            const updated = await incidentService.getIncidentById(incident.id);
            if (updated) setIncident(updated);
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!incident || !user || !comment.trim()) return;
        try {
            const userName = profile?.name || profile?.displayName || user.displayName || 'Warden';
            await incidentService.addComment(incident.id, userName, comment);
            setComment('');
            const updated = await incidentService.getIncidentById(incident.id);
            if (updated) setIncident(updated);
        } catch (error) {
            console.error("Failed to add comment:", error);
        }
    };

    function DetailItem({ icon, label, value }: { icon: any, label: string, value: string }) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
                <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] shrink-0">{icon}</div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{label}</p>
                    <p className="text-sm font-bold text-zinc-200 truncate" title={value}>{value}</p>
                </div>
            </div>
        );
    }

    if (loading) return <div className="text-center p-10 text-zinc-400">Loading...</div>;
    if (!incident) return <div className="text-center p-10 text-red-400">Incident not found</div>;

    return (
        <MobileWrapper>
            <TopHeader title="Incident Details" showBackButton={true} />

            <div className="flex flex-col h-screen pt-24 bg-black">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-6">

                    {/* Header Card */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-xl font-black text-white font-heading uppercase tracking-wide leading-tight mb-2">
                                    {incident.category}
                                </h1>
                                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold">
                                    <User size={12} className="text-[#D4AF37]" />
                                    <span>By <span className="text-white">{incident.reporterName || 'Anonymous'}</span></span>
                                </div>
                            </div>
                            <span className={`px - 3 py - 1.5 rounded - xl text - [10px] font - black uppercase tracking - widest border shadow - sm ${incident.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    incident.status === 'in_review' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                } `}>
                                {incident.status.replace('_', ' ')}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        {incident.status !== 'resolved' && (
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => handleStatusUpdate('in_review')}
                                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    Review
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate('resolved')}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                >
                                    Resolve
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Description</h3>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium text-zinc-300 leading-relaxed shadow-inner">
                            {incident.description}
                        </div>
                    </div>

                    {/* Evidence (Photo) */}
                    {(incident.imageData || incident.photoURL) && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Evidence</h3>
                            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                                <img
                                    src={incident.imageData || incident.photoURL}
                                    alt="Incident Evidence"
                                    className="w-full max-h-80 object-cover"
                                />
                            </div>
                        </div>
                    )}

                    {/* Details Grid */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Context</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <DetailItem icon={<MapPin size={16} />} label="Location" value={typeof incident.location === 'string' ? incident.location : 'See Map'} />
                            {reporterProfile && (
                                <>
                                    <DetailItem icon={<MapPin size={16} />} label="Room" value={reporterProfile.roomNo || 'N/A'} />
                                    <DetailItem icon={<Phone size={16} />} label="Phone" value={reporterProfile.phone || 'N/A'} />
                                    <DetailItem icon={<Mail size={16} />} label="Email" value={reporterProfile.email} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <MessageSquare className="w-3 h-3 text-[#D4AF37]" /> Activity Log
                        </h3>
                        <div className="relative pl-4 space-y-6">
                            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-white/10" />
                            {incident.timeline.map((entry, idx) => (
                                <div key={idx} className="relative flex gap-4">
                                    <div className="mt-1.5 w-4 h-4 rounded-full bg-black border-2 border-[#D4AF37] z-10 shadow-[0_0_10px_rgba(212,175,55,0.3)] shrink-0" />
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1">
                                        <p className="text-sm font-bold text-zinc-200">{entry.action}</p>
                                        {entry.note && <p className="text-xs text-zinc-400 mt-1 font-medium italic">"{entry.note}"</p>}
                                        <p className="text-[10px] font-black text-zinc-600 mt-2 uppercase tracking-tight">
                                            {new Date(entry.time).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fixed Footer for Update */}
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
                    <form onSubmit={handleAddComment} className="flex gap-3 max-w-md mx-auto">
                        <input
                            type="text"
                            placeholder="Add update note..."
                            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50 focus:bg-white/15 transition-all"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-[#D4AF37] text-black px-6 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#E5C158] active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20"
                        >
                            Log
                        </button>
                    </form>
                </div>
            </div>
        </MobileWrapper>
    );
}
