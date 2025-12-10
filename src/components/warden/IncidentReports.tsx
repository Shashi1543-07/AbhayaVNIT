import React, { useEffect, useState } from 'react';
import { incidentService, type Incident } from '../../services/incidentService';
import { FileText, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';

interface IncidentReportsProps {
    hostelId: string;
}

export default function IncidentReports({ hostelId }: IncidentReportsProps) {
    const { user } = useAuthStore();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [filter, setFilter] = useState('all');
    const [comment, setComment] = useState('');

    useEffect(() => {
        const unsubscribe = incidentService.subscribeToIncidents(hostelId, (data) => {
            setIncidents(data);
        });
        return () => unsubscribe();
    }, [hostelId]);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-slate-800">Complaints</h2>
                    <select
                        className="text-sm border-none bg-transparent font-medium text-slate-600 outline-none cursor-pointer"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_review">In Review</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
                <div className="overflow-y-auto flex-1">
                    {filteredIncidents.map(incident => (
                        <div
                            key={incident.id}
                            onClick={() => setSelectedIncident(incident)}
                            className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors
                                ${selectedIncident?.id === incident.id ? 'bg-indigo-50' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
                                    ${incident.status === 'open' ? 'bg-red-100 text-red-700' :
                                        incident.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                            'bg-amber-100 text-amber-700'}
                                `}>
                                    {incident.status.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {new Date(incident.createdAt?.seconds * 1000).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">{incident.category}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2">{incident.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail View */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {selectedIncident ? (
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{selectedIncident.category}</h2>
                                    <p className="text-sm text-slate-500">
                                        Reported by <span className="font-medium text-slate-900">{selectedIncident.reporterName || 'Anonymous'}</span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {selectedIncident.status !== 'resolved' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusUpdate('in_review')}
                                                className="px-3 py-1.5 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                                            >
                                                Review
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate('resolved')}
                                                className="px-3 py-1.5 text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                            >
                                                Resolve
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg text-slate-700 text-sm mb-4">
                                {selectedIncident.description}
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <span className="font-bold">Location:</span> {selectedIncident.location}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> Activity Log
                            </h3>
                            <div className="space-y-4">
                                {selectedIncident.timeline.map((entry, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{entry.action}</p>
                                            {entry.note && <p className="text-sm text-slate-600">{entry.note}</p>}
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(entry.time).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200">
                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add a comment or update..."
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    Post
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <FileText className="w-12 h-12 mb-2 opacity-20" />
                        <p>Select a complaint to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
}
