import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import { adminNavItems } from '../../lib/navItems';
import { Search, Filter, Download } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

import TopHeader from '../../components/layout/TopHeader';

export default function AuditLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                let q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100));

                if (actionFilter !== 'all') {
                    // Note: This requires a composite index in Firestore (action + timestamp)
                    // For now, we'll filter client-side if index is missing to avoid errors
                    // or just query by action if we remove orderBy, but we want recent ones.
                    // Let's stick to client-side filtering for simplicity on the Free Plan without managing indexes manually via CLI
                }

                const snapshot = await getDocs(q);
                let fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                if (actionFilter !== 'all') {
                    fetchedLogs = fetchedLogs.filter((log: any) => log.action === actionFilter);
                }

                if (searchTerm) {
                    const lowerTerm = searchTerm.toLowerCase();
                    fetchedLogs = fetchedLogs.filter((log: any) =>
                        log.target.toLowerCase().includes(lowerTerm) ||
                        log.details.toLowerCase().includes(lowerTerm) ||
                        log.performedBy.toLowerCase().includes(lowerTerm)
                    );
                }

                setLogs(fetchedLogs);
            } catch (error) {
                console.error("Error fetching audit logs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [actionFilter, searchTerm]);

    const downloadLogs = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Timestamp,Action,Target,Performed By,Details\n"
            + logs.map(log => {
                const date = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                return `"${date}","${log.action}","${log.target}","${log.performedBy}","${log.details}"`;
            }).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "audit_logs.csv");
        document.body.appendChild(link);
        link.click();
    };

    return (
        <MobileWrapper>
            <TopHeader title="Audit Logs" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <div className="flex justify-between items-center mb-6">
                    <motion.button
                        variants={cardVariant}
                        whileTap={{ scale: 0.95 }}
                        onClick={downloadLogs}
                        className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] px-4 py-2 rounded-xl hover:bg-[#D4AF37]/20 font-black uppercase tracking-wider text-xs shadow-sm transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </motion.button>
                </div>

                <motion.div
                    variants={cardVariant}
                    className="glass-card bg-black/40 rounded-[24px] shadow-sm border border-white/10 overflow-hidden"
                >
                    <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600 text-sm font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter className="w-4 h-4 text-zinc-500" />
                            <select
                                className="p-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs font-bold text-zinc-300 focus:border-[#D4AF37]/50"
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                            >
                                <option value="all" className="bg-zinc-900">All Activities</option>
                                <option value="SOS Triggered" className="bg-zinc-900">SOS Triggered</option>
                                <option value="SOS Resolved" className="bg-zinc-900">SOS Resolved</option>
                                <option value="SafeWalk Started" className="bg-zinc-900">SafeWalk Started</option>
                                <option value="SafeWalk Completed" className="bg-zinc-900">SafeWalk Completed</option>
                                <option value="Report Submitted" className="bg-zinc-900">Report Submitted</option>
                                <option value="Report Resolved" className="bg-zinc-900">Report Resolved</option>
                                <option value="Create User" className="bg-zinc-900">Create User</option>
                                <option value="Delete User" className="bg-zinc-900">Delete User</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-zinc-500 font-black uppercase tracking-widest text-[10px] border-b border-white/10">
                                <tr>
                                    <th className="p-4">Timestamp</th>
                                    <th className="p-4">Action</th>
                                    <th className="p-4">Target</th>
                                    <th className="p-4">Performed By</th>
                                    <th className="p-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading logs...</td></tr>
                                ) : logs.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">No logs found.</td></tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4 text-zinc-500 text-xs font-bold whitespace-nowrap">
                                                {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="p-4 font-bold text-white group-hover:text-[#D4AF37] transition-colors">{log.action}</td>
                                            <td className="p-4 text-[#D4AF37] font-medium text-xs">{log.target}</td>
                                            <td className="p-4 text-zinc-300 font-medium text-xs">{log.performedBy}</td>
                                            <td className="p-4 text-zinc-500 text-xs font-medium max-w-xs truncate" title={log.details}>{log.details}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </motion.main>

            <BottomNav items={adminNavItems} />
        </MobileWrapper>
    );
}
