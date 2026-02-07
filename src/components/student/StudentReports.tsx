import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from '../../context/authStore';
import { FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface IncidentSummary {
    id: string;
    category: string;
    status: string;
    createdAt: any;
}

export default function StudentReports() {
    const { user } = useAuthStore();
    const [reports, setReports] = useState<IncidentSummary[]>([]);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'incidents'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as IncidentSummary[];

            // Sort client-side for now to avoid needing another index immediately
            data.sort((a, b) => {
                const timeA = a.createdAt?.seconds || (typeof a.createdAt === 'number' ? a.createdAt / 1000 : 0);
                const timeB = b.createdAt?.seconds || (typeof b.createdAt === 'number' ? b.createdAt / 1000 : 0);
                return timeB - timeA;
            });
            setReports(data.slice(0, 3));
        }, (error) => {
            console.error("StudentReports component: Error fetching reports:", error);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    My Reports
                </h2>
                <Link to="/student/reports" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="bg-surface rounded-2xl border border-surface shadow-sm overflow-hidden">
                {reports.length === 0 ? (
                    <div className="p-8 text-center text-muted text-sm">
                        No reports submitted yet.
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-surface">
                            {reports.map(report => (
                                <tr key={report.id} className="hover:bg-primary-50 transition-colors cursor-pointer">
                                    <td className="p-4 font-medium text-primary">{(report.category || 'Incident').replace('_', ' ')}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                                            ${report.status === 'open' ? 'bg-emergency/10 text-emergency' :
                                                report.status === 'resolved' ? 'bg-success/10 text-success' :
                                                    'bg-warning/10 text-warning'}
                                        `}>
                                            {report.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4 text-muted text-right">
                                        {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
