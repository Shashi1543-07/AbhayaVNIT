import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
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
        <Layout role="admin">
            <TopHeader title="Audit Logs" showBackButton={true} />

            <motion.div
                className="mb-8 flex justify-between items-center pt-16"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.button
                    variants={cardVariant}
                    whileTap={{ scale: 0.95 }}
                    onClick={downloadLogs}
                    className="flex items-center gap-2 bg-white/50 border border-purple-200 text-purple-700 px-4 py-2 rounded-xl hover:bg-white/80 font-bold shadow-sm transition-all"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </motion.button>
            </motion.div>

            <motion.div
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                className="glass-card rounded-xl shadow-sm border border-white/40 overflow-hidden"
            >
                <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/30 backdrop-blur-md">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <select
                            className="p-2 bg-white/50 border border-white/40 rounded-lg outline-none text-sm backdrop-blur-sm"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                        >
                            <option value="all">All Actions</option>
                            <option value="Create User">Create User</option>
                            <option value="Update Settings">Update Settings</option>
                            <option value="Bulk Create">Bulk Create</option>
                            <option value="Delete User">Delete User</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/30 text-slate-600 font-medium border-b border-white/40 backdrop-blur-md">
                            <tr>
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Target</th>
                                <th className="p-4">Performed By</th>
                                <th className="p-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading logs...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No logs found.</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-white/40 transition-colors">
                                        <td className="p-4 text-slate-500 whitespace-nowrap">
                                            {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="p-4 font-medium text-slate-800">{log.action}</td>
                                        <td className="p-4 text-indigo-600">{log.target}</td>
                                        <td className="p-4 text-slate-600">{log.performedBy}</td>
                                        <td className="p-4 text-slate-500 max-w-xs truncate" title={log.details}>{log.details}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </Layout >
    );
}
