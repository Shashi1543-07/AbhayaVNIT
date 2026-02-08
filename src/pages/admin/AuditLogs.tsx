import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import { adminNavItems } from '../../lib/navItems';
import { Search, Filter, Download, Trash2 } from 'lucide-react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { containerStagger, cardVariant, modalVariants, overlayVariants } from '../../lib/animations';
import { AlertTriangle, X } from 'lucide-react';

import TopHeader from '../../components/layout/TopHeader';
import { adminService } from '../../services/adminService';

export default function AuditLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    // UI State
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        type: 'single' | 'bulk';
        id?: string;
        count?: number;
    }>({ show: false, type: 'single' });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                let q = query(collection(db, 'audit_logs'), limit(100)); // Remove server-side orderBy
                const snapshot = await getDocs(q);
                let fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort in memory instead of Firestore to avoid potential index errors
                fetchedLogs.sort((a: any, b: any) => {
                    const timeA = a.timestamp?.seconds || 0;
                    const timeB = b.timestamp?.seconds || 0;
                    return timeB - timeA;
                });

                // Apply action filter
                if (actionFilter !== 'all') {
                    fetchedLogs = fetchedLogs.filter((log: any) => log.action === actionFilter);
                }

                // Apply search term filter
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

    const handleDeleteLog = async (logId: string) => {
        setConfirmModal({ show: true, type: 'single', id: logId });
    };

    const handleBulkDelete = async () => {
        if (logs.length === 0) return;
        setConfirmModal({ show: true, type: 'bulk', count: logs.length });
    };

    const executeDeletion = async () => {
        setDeleting(true);
        try {
            if (confirmModal.type === 'single' && confirmModal.id) {
                await adminService.deleteLog(confirmModal.id);
                setLogs(logs.filter(log => log.id !== confirmModal.id));
            } else if (confirmModal.type === 'bulk') {
                const logIds = logs.map(log => log.id);
                await adminService.bulkDeleteLogs(logIds);
                setLogs([]);
            }
            setConfirmModal({ show: false, type: 'single' });
        } catch (error) {
            console.error('Deletion error:', error);
            alert('Deletion failed. Check permissions or network.');
        } finally {
            setDeleting(false);
        }
    };

    const downloadLogs = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Timestamp,Action,Target,Performed By,Actor ID,Actor Phone,Actor Email,Details\n"
            + logs.map(log => {
                const date = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                return `"${date}","${log.action}","${log.target}","${log.actorName || log.performedBy}","${log.actorIdNumber || ''}","${log.actorPhone || ''}","${log.actorEmail || ''}","${log.details}"`;
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
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <motion.button
                        variants={cardVariant}
                        initial="hidden"
                        animate="visible"
                        whileTap={{ scale: 0.95 }}
                        onClick={downloadLogs}
                        disabled={loading || logs.length === 0}
                        className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] px-4 py-2 rounded-xl hover:bg-[#D4AF37]/20 font-black uppercase tracking-wider text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </motion.button>

                    <motion.button
                        variants={cardVariant}
                        initial="hidden"
                        animate="visible"
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBulkDelete}
                        disabled={loading || logs.length === 0}
                        className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-xl hover:bg-red-500/20 font-black uppercase tracking-wider text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Filtered {logs.length > 0 && `(${logs.length})`}
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
                                    <th className="p-4">Actions</th>
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
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-zinc-300 font-bold text-xs">{log.actorName || log.performedBy}</span>
                                                    {log.actorIdNumber && (
                                                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">ID: {log.actorIdNumber}</span>
                                                    )}
                                                    {log.actorEmail && (
                                                        <span className="text-[9px] text-[#D4AF37]/60 font-medium lowercase tracking-tight">{log.actorEmail}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-zinc-500 text-xs font-medium max-w-xs truncate" title={log.details}>{log.details}</td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                                                    title="Delete Log"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </motion.main>

            <BottomNav items={adminNavItems} />

            {/* Premium Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.show && (
                    <>
                        <motion.div
                            variants={overlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            onClick={() => !deleting && setConfirmModal({ ...confirmModal, show: false })}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                        />
                        <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
                            <motion.div
                                variants={modalVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-[32px] overflow-hidden pointer-events-auto shadow-2xl"
                            >
                                <div className="p-8 relative">
                                    <button
                                        onClick={() => !deleting && setConfirmModal({ ...confirmModal, show: false })}
                                        disabled={deleting}
                                        className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-0"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>

                                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-red-500/20">
                                        <AlertTriangle className="w-8 h-8 text-red-500" />
                                    </div>

                                    <h3 className="text-xl font-black text-white text-center mb-2 uppercase tracking-tight">
                                        Confirm Deletion
                                    </h3>
                                    <p className="text-zinc-500 text-sm text-center font-medium leading-relaxed mb-8">
                                        {confirmModal.type === 'bulk'
                                            ? `This will permanently remove ${confirmModal.count} filtered log entries. This action cannot be undone.`
                                            : "This will permanently remove this audit log entry. This action cannot be undone."}
                                    </p>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={executeDeletion}
                                            disabled={deleting}
                                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {deleting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Confirm Delete'
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                                            disabled={deleting}
                                            className="w-full py-4 bg-white/5 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-colors border border-white/10"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </MobileWrapper>
    );
}
