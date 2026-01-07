import React, { useEffect, useState } from 'react';
import { incidentService, type Incident } from '../../services/incidentService';
import { FileText, MessageSquare, User, Phone, Mail, MapPin, ArrowLeft } from 'lucide-react';

import { useAuthStore } from '../../context/authStore';
import { userService, type StudentProfile } from '../../services/userService';

interface IncidentReportsProps {
    hostelId: string;
}

export default function IncidentReports({ hostelId }: IncidentReportsProps) {
    const { user } = useAuthStore();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [reporterProfile, setReporterProfile] = useState<StudentProfile | null>(null);
    const [filter, setFilter] = useState('all');
    const [comment, setComment] = useState('');

    const formatIncidentDate = (date: any) => {
        if (!date) return 'Just now';
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
        return new Date(date).toLocaleDateString();
    };


    useEffect(() => {
        const unsubscribe = incidentService.subscribeToIncidents(hostelId, (data) => {
            setIncidents(data);
        });
        return () => unsubscribe();
    }, [hostelId]);

    useEffect(() => {
        const fetchReporterProfile = async () => {
            if (selectedIncident?.userId) {
                const profile = await userService.getUserProfile(selectedIncident.userId);
                if (profile) {
                    setReporterProfile({
                        id: profile.id,
                        displayName: profile.name || profile.displayName || 'Unnamed',
                        email: profile.email || '',
                        role: 'student',
                        hostelId: profile.hostelId,
                        roomNo: profile.roomNo,
                        phone: profile.phoneNumber || profile.phone,
                        emergencyContact: profile.emergencyContact || profile.emergencyPhone,
                    } as StudentProfile);
                } else {
                    setReporterProfile(null);
                }
            } else {
                setReporterProfile(null);
            }
        };
        fetchReporterProfile();
    }, [selectedIncident]);


    const handleStatusUpdate = async (status: Incident['status']) => {
        if (!selectedIncident || !user) return;
        try {
            await incidentService.updateIncidentStatus(selectedIncident.id, status, user.uid);
            alert(`Status updated to ${status}`);
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedIncident || !user || !comment.trim()) return;
        try {
            await incidentService.addComment(selectedIncident.id, user.uid, comment);
            setComment('');
        } catch (error) {
            console.error("Failed to add comment:", error);
        }
    };

    const filteredIncidents = filter === 'all'
        ? incidents
        : incidents.filter(i => i.status === filter);

    return (
        <div className="flex flex-col 2xl:grid 2xl:grid-cols-3 gap-6 h-[calc(100vh-250px)] relative overflow-hidden">
            {/* List View - Hidden on mobile if incident selected */}
            <div className={`2xl:col-span-1 glass-card-soft bg-white/20 backdrop-blur-xl rounded-3xl shadow-soft border border-white/40 overflow-hidden flex flex-col 
                ${selectedIncident ? 'hidden 2xl:flex' : 'flex'}`}>

                <div className="p-5 border-b border-white/20 flex justify-between items-center bg-gradient-to-br from-white/30 to-white/10">
                    <h2 className="font-bold text-slate-800">Complaints</h2>
                    <div className="bg-white/40 px-3 py-1 rounded-xl backdrop-blur-md border border-white/50">
                        <select
                            className="bg-transparent text-xs font-black text-indigo-600 outline-none uppercase tracking-widest"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="open">Open</option>
                            <option value="in_review">Review</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {filteredIncidents.length === 0 ? (
                        <div className="p-10 text-center opacity-50">
                            <FileText className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-sm font-medium">No complaints</p>
                        </div>
                    ) : (
                        filteredIncidents.map(incident => (
                            <div
                                key={incident.id}
                                onClick={() => setSelectedIncident(incident)}
                                className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border
                                    ${selectedIncident?.id === incident.id
                                        ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shadow-inner border-indigo-400/50 scale-[0.98]'
                                        : 'bg-white/10 border-transparent hover:bg-white/30'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider
                                        ${incident.status === 'open' ? 'bg-red-500/20 text-red-600 border border-red-500/30' :
                                            incident.status === 'resolved' ? 'bg-green-500/20 text-green-600 border border-green-500/30' :
                                                'bg-amber-500/20 text-amber-600 border border-amber-500/30'}
                                    `}>
                                        {incident.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500">
                                        {formatIncidentDate(incident.createdAt)}
                                    </span>

                                </div>
                                <h3 className="font-bold text-slate-800 text-sm mb-1">{incident.category}</h3>
                                <p className="text-xs text-slate-500 line-clamp-1 font-medium">{incident.description}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detail View - Full screen on mobile if selected */}
            <div className={`2xl:col-span-2 glass-card-soft bg-white/10 backdrop-blur-2xl rounded-3xl shadow-soft border border-white/40 overflow-hidden flex flex-col
                ${selectedIncident ? 'flex fixed inset-x-0 mx-auto w-full max-w-[480px] h-full inset-y-0 z-50 2xl:relative 2xl:inset-auto 2xl:z-0 2xl:flex' : 'hidden 2xl:flex'}`}>
                {selectedIncident ? (
                    <div className="flex flex-col h-full bg-transparent">
                        {/* Fixed Header */}
                        <div className="p-4 2xl:p-6 border-b border-white/40 glass-nav backdrop-blur-md shrink-0 flex items-center gap-4 z-20">
                            <button
                                onClick={() => setSelectedIncident(null)}
                                className="2xl:hidden p-2 rounded-xl bg-white/60 text-slate-700 shadow-sm border border-white active:scale-95 transition-all"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2 truncate" title={selectedIncident.category}>
                                    {selectedIncident.category}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 shrink-0"><User size={14} /></div>
                                    <p className="text-sm font-bold text-slate-600 truncate">
                                        By <span className="text-indigo-600">{selectedIncident.reporterName || 'Anonymous'}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {selectedIncident.status !== 'resolved' && (
                                    <>
                                        <button
                                            onClick={() => handleStatusUpdate('in_review')}
                                            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 bg-white/40 hover:bg-white/60 rounded-xl transition-all border border-white shadow-sm"
                                        >
                                            Review
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate('resolved')}
                                            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/20 rounded-xl transition-all shadow-md"
                                        >
                                            Resolve
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar z-10 px-4 2xl:px-6 bg-transparent">
                            <div className="py-6 space-y-6 pb-40"> {/* pb-40 ensures content stays above bottom nav */}
                                {/* Description Card */}
                                <div className="glass-card p-6 shadow-soft relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500/40" />
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Incident Description</h4>
                                    <p className="text-slate-700 text-sm font-medium leading-relaxed">
                                        {selectedIncident.description}
                                    </p>
                                </div>

                                {/* Detail Grid - One by one for app feel */}
                                <div className="grid grid-cols-1 gap-4">
                                    <DetailItem icon={<MapPin size={14} />} label="Location" value={typeof selectedIncident.location === 'string' ? selectedIncident.location : 'See Map'} />
                                    {reporterProfile && (
                                        <>
                                            <DetailItem icon={<MapPin size={14} />} label="Room" value={reporterProfile.roomNo || 'N/A'} />
                                            <DetailItem icon={<Phone size={14} />} label="Phone" value={reporterProfile.phone || 'N/A'} />
                                            <DetailItem icon={<Mail size={14} />} label="Email" value={reporterProfile.email} />
                                            <DetailItem icon={<User size={14} />} label="Emergency" value={reporterProfile.emergencyContact || 'N/A'} />
                                        </>
                                    )}
                                </div>

                                {/* Timeline Section */}
                                <div className="glass-card p-6 border-white/50 shadow-soft">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-indigo-500" /> Activity Evolution
                                    </h3>
                                    <div className="space-y-8 relative ml-2">
                                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-indigo-100" />
                                        {selectedIncident.timeline.map((entry, idx) => (
                                            <div key={idx} className="flex gap-4 relative">
                                                <div className="mt-1.5 w-4 h-4 rounded-full bg-white border-4 border-indigo-500 flex-shrink-0 z-10 shadow-sm" />
                                                <div className="glass-card p-5 border-white/60 flex-1 transition-all hover:bg-white/40">
                                                    <p className="text-sm font-black text-slate-800">{entry.action}</p>
                                                    {entry.note && <p className="text-xs text-slate-600 mt-1.5 font-bold leading-relaxed">{entry.note}</p>}
                                                    <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tight opacity-70">
                                                        {new Date(entry.time).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fixed Actions Footer */}
                        <div className="p-4 2xl:p-6 glass-nav shrink-0 z-20 pb-28 2xl:pb-6">
                            <form onSubmit={handleAddComment} className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Type an update or note..."
                                    className="flex-1 px-5 py-4 glass-input outline-none text-sm font-bold placeholder:text-slate-400 shadow-inner"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                >
                                    Update
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <FileText className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-1">Pick a Record</h3>
                        <p className="text-sm font-medium text-slate-500">Select a complaint from the list to manage it</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailItem({ icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/20 border border-white/30 truncate shadow-sm">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-xs font-bold text-slate-700 truncate" title={value}>{value}</p>
            </div>
        </div>
    );
}

