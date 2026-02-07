import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import { adminNavItems } from '../../lib/navItems';
import { UserPlus, Upload, Search, Filter, Trash2, Ban, CheckCircle, Download, Mail, RefreshCw, AlertTriangle } from 'lucide-react';
import { adminService, type CreateUserData, validateUser } from '../../services/adminService';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { containerStagger, cardVariant, overlayVariants, modalVariants } from '../../lib/animations';

import TopHeader from '../../components/layout/TopHeader';

export default function UserManagement() {
    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'bulk'>('list');
    // List State
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [listLoading, setListLoading] = useState(false);

    // Create/Bulk State
    const [formData, setFormData] = useState<CreateUserData>({
        name: '',
        email: '',
        role: 'student',
        phone: '',
        hostel: '',
        roomNo: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [bulkResults, setBulkResults] = useState<{ success: number; emailsSent: string[]; errors: string[] } | null>(null);
    const [resendingEmail, setResendingEmail] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        type: 'delete' | 'status' | 'reset_email';
        title: string;
        message: string;
        actionLabel: string;
        uid?: string;
        currentStatus?: string;
        email?: string;
    }>({
        show: false,
        type: 'delete',
        title: '',
        message: '',
        actionLabel: ''
    });

    const [feedbackModal, setFeedbackModal] = useState<{
        show: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({
        show: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Fetch Users
    const fetchUsers = async () => {
        setListLoading(true);
        try {
            let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));

            if (roleFilter !== 'all') {
                q = query(collection(db, 'users'), where('role', '==', roleFilter), orderBy('createdAt', 'desc'), limit(50));
            }

            const snapshot = await getDocs(q);
            let fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Client-side search (Firestore doesn't support native full-text search)
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                fetchedUsers = fetchedUsers.filter((u: any) =>
                    u.name.toLowerCase().includes(lowerTerm) ||
                    u.email.toLowerCase().includes(lowerTerm)
                );
            }

            setUsers(fetchedUsers);
        } catch (err) {
            console.error("Error fetching users:", err);
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'list') {
            fetchUsers();
        }
    }, [activeTab, roleFilter, searchTerm]);

    // Actions
    const handleStatusAction = (uid: string, currentStatus: string) => {
        setConfirmModal({
            show: true,
            type: 'status',
            uid,
            currentStatus,
            title: currentStatus === 'active' ? 'Disable User Access' : 'Restore User Access',
            message: currentStatus === 'active'
                ? 'This will prevent the user from logging in or using any features. You can enable them back anytime.'
                : 'This will restore the user\'s access to all system features.',
            actionLabel: currentStatus === 'active' ? 'Disable Access' : 'Restore Access'
        });
    };

    const handleDeleteAction = (uid: string) => {
        setConfirmModal({
            show: true,
            type: 'delete',
            uid,
            title: 'Irreversible Deletion',
            message: 'Are you sure? This will permanently delete the user profile and ALL associated data (SOS history, reports, and safe walks). Auth account must be manually removed from Firebase Console for full cleanup.',
            actionLabel: 'Permanently Delete'
        });
    };

    const handleResetEmailAction = (email: string) => {
        setConfirmModal({
            show: true,
            type: 'reset_email',
            email,
            title: 'Send Password Reset?',
            message: `A password reset link will be sent to ${email}. This allows the user to change their credentials.`,
            actionLabel: 'Send Reset Link'
        });
    };

    const executeAction = async () => {
        const { uid, email, type, currentStatus } = confirmModal;
        if (!uid && !email) return;

        setActionLoading(true);
        try {
            if (type === 'status' && uid) {
                await updateDoc(doc(db, 'users', uid), {
                    status: currentStatus === 'active' ? 'disabled' : 'active'
                });
                await adminService.logAction(
                    currentStatus === 'active' ? 'Disable User' : 'Enable User',
                    uid,
                    `User status changed from ${currentStatus}`
                );
            } else if (type === 'delete' && uid) {
                const batch = writeBatch(db);

                // 1. Delete user record
                batch.delete(doc(db, 'users', uid));

                // 2. Cascade delete associated data (SOS, Incidents, SafeWalk)
                const collections = ['incidents', 'sos_events', 'safe_walk'];
                for (const coll of collections) {
                    const q = query(collection(db, coll), where('userId', '==', uid));
                    const snap = await getDocs(q);
                    snap.docs.forEach(d => batch.delete(doc(db, coll, d.id)));
                }

                // Legacy incidents check
                const qLegacy = query(collection(db, 'incidents'), where('reportedBy', '==', uid));
                const snapLegacy = await getDocs(qLegacy);
                snapLegacy.docs.forEach(d => batch.delete(doc(db, 'incidents', d.id)));

                await batch.commit();
                await adminService.logAction('Delete User', uid, 'User and all data deleted via batch');
            } else if (type === 'reset_email' && email) {
                await handleResendEmail(email);
            }
            fetchUsers();
            setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (err) {
            console.error(err);
            setFeedbackModal({
                show: true,
                type: 'error',
                title: 'Action Failed',
                message: `Failed to execute ${type} action.`
            });
        } finally {
            setActionLoading(false);
        }
    };

    // Create User Handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setEmailSent(false);

        const validationError = validateUser(formData);
        if (validationError) {
            setMessage(`Error: ${validationError} `);
            setLoading(false);
            return;
        }

        try {
            const result = await adminService.createUser({
                name: formData.name,
                email: formData.email,
                role: formData.role,
                phone: formData.phone,
                hostel: (formData.role === 'student' || formData.role === 'warden') ? formData.hostel : undefined,
                roomNo: formData.role === 'student' ? formData.roomNo : undefined
            });

            setMessage(`Successfully created ${formData.role} account for ${formData.name}.`);
            setEmailSent(result.emailSent || false);
            setFormData(prev => ({ ...prev, name: '', email: '', phone: '', hostel: '', roomNo: '' }));
        } catch (error: any) {
            console.error(error);
            setMessage(`Error creating account: ${error.message} `);
        } finally {
            setLoading(false);
        }
    };

    // Bulk Upload Handler
    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError('');
        setSuccess('');
        setBulkResults(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const csvData = event.target?.result as string;
                const lines = csvData.split('\n');
                const users: CreateUserData[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    const [name, email, role, phone, hostel, roomNo] = line.split(',');
                    if (!name || !email || !role || !phone) continue;

                    const userData: CreateUserData = {
                        name: name.trim(),
                        email: email.trim(),
                        role: role.trim() as any,
                        phone: phone.trim(),
                        hostel: hostel?.trim(),
                        roomNo: roomNo?.trim()
                    };

                    const validationError = validateUser(userData);
                    if (validationError) {
                        console.warn(`Skipping invalid user at line ${i + 1}: ${validationError} `);
                        continue;
                    }

                    users.push(userData);
                }

                if (users.length === 0) throw new Error('No valid users found in CSV');

                const results = await adminService.bulkCreateUsers(users);
                setSuccess(`Created ${results.success} accounts.Sent ${results.emailsSent.length} password reset emails.`);
                setBulkResults(results);
                if (results.failed > 0) {
                    setError(`Failed users: ${results.errors.join(', ')} `);
                }
            } catch (err: any) {
                setError('Failed to process CSV: ' + err.message);
            } finally {
                setLoading(false);
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    // Resend password reset email
    const handleResendEmail = async (email: string) => {
        setResendingEmail(email);
        try {
            await adminService.resendPasswordResetEmail(email);
            setFeedbackModal({
                show: true,
                type: 'success',
                title: 'Email Dispatched',
                message: `A password reset link has been successfully sent to ${email}.`
            });
        } catch (error: any) {
            setFeedbackModal({
                show: true,
                type: 'error',
                title: 'Dispatch Failed',
                message: error.message || 'We could not send the reset email at this time.'
            });
        } finally {
            setResendingEmail(null);
        }
    };

    return (
        <MobileWrapper>
            <TopHeader title="User Management" showBackButton={true} />

            <motion.div
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >

                {/* Tabs */}
                <motion.div
                    className="flex gap-4 mb-6 border-b border-white/10"
                    variants={containerStagger}
                    initial="hidden"
                    animate="visible"
                >
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`pb-3 px-4 font-black uppercase tracking-widest text-[10px] transition-colors ${activeTab === 'list' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        All Users
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`pb-3 px-4 font-black uppercase tracking-widest text-[10px] transition-colors ${activeTab === 'create' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Add User
                    </button>
                    <button
                        onClick={() => setActiveTab('bulk')}
                        className={`pb-3 px-4 font-black uppercase tracking-widest text-[10px] transition-colors ${activeTab === 'bulk' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Bulk Upload
                    </button>
                </motion.div>

                {/* LIST VIEW */}
                {activeTab === 'list' && (
                    <motion.div
                        variants={cardVariant}
                        initial="hidden"
                        animate="visible"
                        className="glass-card bg-black/40 rounded-[24px] shadow-sm border border-white/10 overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600 text-sm font-bold"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Filter className="w-4 h-4 text-zinc-500" />
                                <select
                                    className="p-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs font-bold text-zinc-300 focus:border-[#D4AF37]/50"
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                >
                                    <option value="all" className="bg-zinc-900">All Roles</option>
                                    <option value="student" className="bg-zinc-900">Students</option>
                                    <option value="warden" className="bg-zinc-900">Wardens</option>
                                    <option value="security" className="bg-zinc-900">Security</option>
                                    <option value="admin" className="bg-zinc-900">Admins</option>
                                </select>
                                <button
                                    onClick={() => {
                                        const csvContent = "data:text/csv;charset=utf-8,"
                                            + "Name,Email,Role,Hostel,Room,Phone,Status\n"
                                            + users.map(u => `"${u.name}", "${u.email}", "${u.role}", "${u.hostel || ''}", "${u.roomNo || ''}", "${u.phone || ''}", "${u.status || 'active'}"`).join("\n");
                                        const encodedUri = encodeURI(csvContent);
                                        const link = document.createElement("a");
                                        link.setAttribute("href", encodedUri);
                                        link.setAttribute("download", `users_${roleFilter}.csv`);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-xl hover:bg-[#D4AF37]/20 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider"
                                    title="Export Current List to CSV"
                                >
                                    <Download className="w-4 h-4" />
                                    Export
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 text-zinc-500 font-black uppercase tracking-widest text-[10px] border-b border-white/10">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Details</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {listLoading ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading users...</td></tr>
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">No users found.</td></tr>
                                    ) : (
                                        users.map(user => (
                                            <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4 font-bold text-white group-hover:text-[#D4AF37] transition-colors">{user.name}</td>
                                                <td className="p-4 text-zinc-400 text-xs font-medium">{user.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border
                                                    ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                            user.role === 'warden' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                user.role === 'security' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                                    'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'
                                                        } `}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-zinc-500 text-xs font-bold">
                                                    {user.role === 'student' ? `${user.hostel || '-'} / ${user.roomNo || '-'}` : '-'}
                                                </td >
                                                <td className="p-4">
                                                    <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${user.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                        {user.status?.toUpperCase() || 'ACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-1">
                                                    <button
                                                        onClick={() => handleResetEmailAction(user.email)}
                                                        disabled={resendingEmail === user.email}
                                                        className="p-2 hover:bg-[#D4AF37]/10 rounded-lg text-zinc-500 hover:text-[#D4AF37] transition-colors disabled:opacity-50"
                                                        title="Resend Password Reset Email"
                                                    >
                                                        {resendingEmail === user.email ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusAction(user.id, user.status)}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors"
                                                        title={user.status === 'active' ? "Disable User" : "Enable User"}
                                                    >
                                                        {user.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAction(user.id)}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-500 transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr >
                                        ))
                                    )}
                                </tbody >
                            </table >
                        </div >
                    </motion.div >
                )}

                {/* CREATE USER VIEW */}
                {
                    activeTab === 'create' && (
                        <div className="max-w-2xl mx-auto glass-card bg-black/40 p-8 rounded-[32px] shadow-lg border border-white/10">
                            <h2 className="text-xl font-heading font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                                <div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                                    <UserPlus className="w-5 h-5 text-[#D4AF37]" />
                                </div>
                                Create New Account
                            </h2>

                            {message && (
                                <div className={`p-4 rounded-2xl mb-6 border ${message.includes('Error') ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                                    <p className="text-xs font-bold uppercase tracking-wide">{message}</p>
                                </div>
                            )}

                            {emailSent && (
                                <div className="mb-6 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Mail className="w-5 h-5 text-emerald-500" />
                                        <p className="text-sm text-emerald-500 font-black uppercase tracking-widest">Password Reset Email Sent!</p>
                                    </div>
                                    <p className="text-xs text-zinc-400 font-medium">The user will receive an email to set their password. They can then log in using the link provided.</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* ... Same Form Fields as Before ... */}
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold appearance-none"
                                    >
                                        <option value="student" className="bg-zinc-900">Student</option>
                                        <option value="warden" className="bg-zinc-900">Warden</option>
                                        <option value="security" className="bg-zinc-900">Security</option>
                                        <option value="admin" className="bg-zinc-900">Admin</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold placeholder:text-zinc-700"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Official Email</label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold placeholder:text-zinc-700"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Phone Number</label>
                                        <input
                                            type="tel"
                                            required
                                            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold placeholder:text-zinc-700"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>

                                    {(formData.role === 'warden' || formData.role === 'student') && (
                                        <div>
                                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Assign Hostel</label>
                                            <select
                                                required
                                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold appearance-none"
                                                value={formData.hostel}
                                                onChange={e => setFormData({ ...formData, hostel: e.target.value })}
                                            >
                                                <option value="" className="bg-zinc-900">Select Hostel</option>
                                                <option value="Ganga" className="bg-zinc-900">Ganga Hostel</option>
                                                <option value="Yamuna" className="bg-zinc-900">Yamuna Hostel</option>
                                                <option value="Saraswati" className="bg-zinc-900">Saraswati Hostel</option>
                                            </select>
                                        </div>
                                    )}

                                    {formData.role === 'student' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Room Number</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold placeholder:text-zinc-700"
                                                value={formData.roomNo}
                                                onChange={e => setFormData({ ...formData, roomNo: e.target.value })}
                                                placeholder="A-101"
                                            />
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-4 rounded-xl font-black uppercase tracking-wider text-xs hover:shadow-lg hover:shadow-[#D4AF37]/20 hover:brightness-110 transition-all disabled:opacity-50 mt-6"
                                >
                                    {loading ? 'Creating Account...' : `Create ${formData.role} Account`}
                                </button>
                            </form>
                        </div>
                    )
                }

                {/* BULK UPLOAD VIEW */}
                {
                    activeTab === 'bulk' && (
                        <div className="max-w-2xl mx-auto glass-card bg-black/40 p-8 rounded-[32px] shadow-lg border border-white/10 h-fit">
                            <h2 className="text-xl font-heading font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                                <div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                                    <Upload className="w-5 h-5 text-[#D4AF37]" />
                                </div>
                                Bulk Upload Users
                            </h2>

                            {bulkResults && bulkResults.success > 0 && (
                                <div className="mb-6 bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Mail className="w-5 h-5 text-emerald-500" />
                                        <p className="font-black text-emerald-500 uppercase tracking-wide text-sm">Upload Successful!</p>
                                    </div>
                                    <p className="text-xs text-zinc-400 font-bold">
                                        {bulkResults.success} accounts created. {bulkResults.emailsSent.length} password reset emails sent.
                                    </p>
                                </div>
                            )}

                            {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-xl mb-6 border border-red-500/20 text-xs font-bold">{error}</div>}
                            {success && !bulkResults && <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-xl mb-6 border border-emerald-500/20 text-xs font-bold">{success}</div>}

                            <div className="space-y-4">
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                                    Upload a CSV file with the following columns in order:
                                    <br />
                                    <code className="bg-white/10 px-3 py-2 rounded-lg text-[10px] text-[#D4AF37] block mt-3 overflow-x-auto border border-white/10 font-mono">name,email,role,phone,hostel,roomNo</code>
                                </p>

                                <div className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:bg-white/5 hover:border-[#D4AF37]/50 transition-all cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleBulkUpload}
                                        disabled={loading}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center">
                                        <div className="p-4 bg-white/5 rounded-full mb-4 group-hover:bg-[#D4AF37]/10 transition-colors">
                                            <Upload className="w-8 h-8 text-zinc-600 group-hover:text-[#D4AF37] transition-colors" />
                                        </div>
                                        <span className="text-sm font-black text-zinc-400 uppercase tracking-widest group-hover:text-white transition-colors">
                                            {loading ? 'Processing CSV...' : 'Click to upload CSV file'}
                                        </span>
                                        <span className="text-[10px] text-zinc-600 mt-2 font-bold">Max file size: 5MB</span>
                                    </div>
                                </div>

                                <div className="bg-blue-500/5 p-5 rounded-2xl text-xs text-blue-400 border border-blue-500/10">
                                    <p className="font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        Important Notes
                                    </p>
                                    <ul className="list-disc list-inside space-y-2 ml-1 opacity-80 font-medium">
                                        <li>Roles must be lowercase: <span className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-blue-300">student</span>, <span className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-blue-300">warden</span>, <span className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-blue-300">security</span>, <span className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-blue-300">admin</span></li>
                                        <li>Passwords will be auto-generated and provided in a downloadable CSV after upload.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )
                }
            </motion.div >

            <BottomNav items={adminNavItems} />

            {/* Action Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.show && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            variants={overlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            onClick={() => !actionLoading && setConfirmModal(prev => ({ ...prev, show: false }))}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="relative w-full max-w-sm glass-card bg-zinc-900/90 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border ${confirmModal.type === 'delete' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]'}`}>
                                    {confirmModal.type === 'delete' ? <AlertTriangle className="w-8 h-8" /> : <Ban className="w-8 h-8" />}
                                </div>

                                <h3 className="text-xl font-black text-white mb-2 font-heading uppercase tracking-tight">
                                    {confirmModal.title}
                                </h3>
                                <p className="text-sm text-zinc-400 font-medium leading-relaxed mb-8">
                                    {confirmModal.message}
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                                        className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={actionLoading}
                                        onClick={executeAction}
                                        className={`flex-1 px-4 py-3 rounded-xl text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50
                                            ${confirmModal.type === 'delete'
                                                ? 'bg-red-500 hover:shadow-red-500/20'
                                                : 'bg-[#D4AF37] hover:shadow-[#D4AF37]/20'}`}
                                    >
                                        {actionLoading ? 'Processing...' : confirmModal.actionLabel}
                                    </button>
                                </div>
                            </div>

                            {/* Background decoration */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 ${confirmModal.type === 'delete' ? 'bg-red-500' : 'bg-[#D4AF37]'}`} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Feedback Modal (Success/Error) */}
            <AnimatePresence>
                {feedbackModal.show && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            variants={overlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            onClick={() => setFeedbackModal(prev => ({ ...prev, show: false }))}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="relative w-full max-w-sm glass-card bg-zinc-900/90 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden text-center"
                        >
                            <div className="relative z-10 flex flex-col items-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border ${feedbackModal.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                    {feedbackModal.type === 'success' ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                                </div>

                                <h3 className="text-xl font-black text-white mb-2 font-heading uppercase tracking-tight">
                                    {feedbackModal.title}
                                </h3>
                                <p className="text-sm text-zinc-400 font-medium leading-relaxed mb-8">
                                    {feedbackModal.message}
                                </p>

                                <button
                                    onClick={() => setFeedbackModal(prev => ({ ...prev, show: false }))}
                                    className="w-full px-4 py-3 rounded-xl bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest hover:shadow-[#D4AF37]/20 transition-all shadow-lg active:scale-95"
                                >
                                    Dismiss
                                </button>
                            </div>

                            {/* Background decoration */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 ${feedbackModal.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </MobileWrapper >
    );
}
