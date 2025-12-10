import { useEffect, useState } from 'react';
import { Footprints, Clock, MapPin, Shield } from 'lucide-react';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import StatusBadge from '../ui/StatusBadge';

interface ActiveWalksListProps {
    onSelectWalk: (walk: SafeWalkSession) => void;
    hostelFilter?: string;
}

export default function ActiveWalksList({ onSelectWalk, hostelFilter }: ActiveWalksListProps) {
    const [walks, setWalks] = useState<SafeWalkSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delayed' | 'danger' | 'escort'>('all');

    useEffect(() => {
        const unsubscribe = safeWalkService.subscribeToActiveWalks((data) => {
            setWalks(data);
            setLoading(false);
        }, hostelFilter);

        return () => unsubscribe();
    }, [hostelFilter]);

    // Filter walks based on selected status
    const filteredWalks = walks.filter(walk => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return walk.status === 'active';
        if (statusFilter === 'delayed') return walk.status === 'delayed' || walk.status === 'off-route';
        if (statusFilter === 'danger') return walk.status === 'danger';
        if (statusFilter === 'escort') return walk.escortRequested && !walk.assignedEscort;
        return true;
    });

    if (loading) {
        return <div className="p-4 text-center text-slate-500">Loading active walks...</div>;
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'danger':
                return <StatusBadge status="error" label="DANGER" />;
            case 'delayed':
            case 'off-route':
                return <StatusBadge status="warning" label={status.toUpperCase()} />;
            case 'paused':
                return <StatusBadge status="neutral" label="PAUSED" />;
            default:
                return <StatusBadge status="success" label="ACTIVE" />;
        }
    };

    const getBorderColor = (walk: SafeWalkSession) => {
        if (walk.status === 'danger') return 'border-red-300 bg-red-50';
        if (walk.status === 'delayed' || walk.status === 'off-route') return 'border-yellow-300 bg-yellow-50';
        if (walk.escortRequested && !walk.assignedEscort) return 'border-blue-300 bg-blue-50';
        return 'border-slate-100';
    };

    return (
        <div className="space-y-3">
            {/* Status Filter Dropdown */}
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="glass-input w-full p-2 rounded-lg text-sm font-medium border border-black/15"
            >
                <option value="all">All Walks ({walks.length})</option>
                <option value="active">Active Only</option>
                <option value="delayed">Delayed/Off-route</option>
                <option value="danger">Danger</option>
                <option value="escort">Escort Requested</option>
            </select>

            {filteredWalks.length === 0 ? (
                <div className="glass-card p-8 text-center rounded-xl border border-dashed border-black/20">
                    <Footprints className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium">No matching walks</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing the filter</p>
                </div>
            ) : (
                filteredWalks.map((walk) => (
                    <div
                        key={walk.id}
                        onClick={() => onSelectWalk(walk)}
                        className={`glass-card p-4 rounded-xl cursor-pointer transition-all hover:shadow-md border border-black/15 ${getBorderColor(walk)}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-slate-800">{walk.userName}</h3>
                                <p className="text-xs text-slate-500">{walk.userHostel || 'Unknown Hostel'}</p>
                            </div>
                            {getStatusBadge(walk.status)}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-slate-600 mb-2">
                            <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1 text-primary" />
                                <span>{walk.destination.name}</span>
                            </div>
                            <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1 text-slate-400" />
                                <span>{walk.expectedDuration} min</span>
                            </div>
                        </div>

                        {/* Escort Request Badge */}
                        {walk.escortRequested && !walk.assignedEscort && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                                <Shield className="w-4 h-4" />
                                Escort Requested
                            </div>
                        )}

                        {/* Assigned Escort Badge */}
                        {walk.assignedEscort && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                                <Shield className="w-4 h-4" />
                                Escort: {walk.assignedEscort}
                            </div>
                        )}

                        {walk.message && (
                            <div className="text-xs bg-slate-100 p-2 rounded-lg text-slate-600 italic mt-2">
                                "{walk.message}"
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
