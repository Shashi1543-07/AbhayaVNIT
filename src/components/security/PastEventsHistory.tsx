import { useEffect, useState } from 'react';
import { sosService, type SOSEvent } from '../../services/sosService';
import { Search } from 'lucide-react';

export default function PastEventsHistory() {
    const [events, setEvents] = useState<SOSEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsubscribe = sosService.getResolvedEvents((fetchedEvents) => {
            setEvents(fetchedEvents);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredEvents = events.filter(event =>
        (event.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.hostelId || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <h2 className="font-bold text-slate-800">Incident History</h2>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or hostel..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="p-4">Date & Time</th>
                            <th className="p-4">Student</th>
                            <th className="p-4">Location</th>
                            <th className="p-4">Duration</th>
                            <th className="p-4">Resolved By</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading history...</td></tr>
                        ) : filteredEvents.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">No past incidents found.</td></tr>
                        ) : (
                            filteredEvents.map(event => (
                                <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-slate-500 whitespace-nowrap">
                                        {new Date(event.triggeredAt).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-medium text-slate-800">
                                        {event.userName}
                                        <span className="block text-xs text-slate-400">{event.hostelId} • {event.roomNo}</span>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {event.location.address || `Lat: ${event.location.lat.toFixed(4)}`}
                                    </td>
                                    <td className="p-4 text-slate-600 font-mono">
                                        {/* Calculate duration if resolvedAt exists, else N/A */}
                                        {/* Assuming resolvedAt is in the event object as per service update */}
                                        {/* @ts-ignore */}
                                        {event.resolvedAt ? `${Math.floor((event.resolvedAt - event.triggeredAt) / 1000 / 60)}m` : 'N/A'}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {/* Find the last timeline entry or specific resolved action */}
                                        {event.timeline?.find(t => t.action === 'Resolved')?.by || 'Unknown'}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                                            RESOLVED
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
