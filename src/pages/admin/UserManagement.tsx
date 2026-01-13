import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import { adminNavItems } from '../../lib/navItems';
import { UserPlus, Upload, Search, Filter, Trash2, Ban, CheckCircle, Download } from 'lucide-react';
import { adminService, type CreateUserData, validateUser } from '../../services/adminService';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

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
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [bulkCredentials, setBulkCredentials] = useState<any[]>([]);

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
    const handleDisableUser = async (uid: string, currentStatus: string) => {
        if (!confirm(`Are you sure you want to ${currentStatus === 'active' ? 'disable' : 'enable'} this user?`)) return;
        try {
            await updateDoc(doc(db, 'users', uid), {
                status: currentStatus === 'active' ? 'disabled' : 'active'
            });
            fetchUsers(); // Refresh list
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!confirm('Are you sure? This will delete the user record. Auth account must be deleted manually in Firebase Console (Free Tier limitation).')) return;
        try {
            await deleteDoc(doc(db, 'users', uid));
            fetchUsers();
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    // Create User Handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setGeneratedPassword('');

        // Validate
        const validationError = validateUser(formData);
        if (validationError) {
            setMessage(`Error: ${validationError}`);
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
            setGeneratedPassword(result.password || '');
            setFormData(prev => ({ ...prev, name: '', email: '', phone: '', hostel: '', roomNo: '' }));
        } catch (error: any) {
            console.error(error);
            setMessage(`Error creating account: ${error.message}`);
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
        setBulkCredentials([]);

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
                        console.warn(`Skipping invalid user at line ${i + 1}: ${validationError}`);
                        // Optional: Add to errors list to show user
                        continue;
                    }

                    users.push(userData);
                }

                if (users.length === 0) throw new Error('No valid users found in CSV');

                const results = await adminService.bulkCreateUsers(users);
                setSuccess(`Successfully processed batch. Created: ${results.success}, Failed: ${results.failed}`);
                if (results.credentials.length > 0) {
                    setBulkCredentials(results.credentials);
                }
                if (results.failed > 0) {
                    setError(`Failed users: ${results.errors.join(', ')}`);
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

    const downloadCredentials = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Email,Password,Role\n"
            + bulkCredentials.map(c => `${c.email},${c.password},${c.role}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "user_credentials.csv");
        document.body.appendChild(link);
        link.click();
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
                                                                    'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-zinc-500 text-xs font-bold">
                                                    {user.role === 'student' ? `${user.hostel || '-'} / ${user.roomNo || '-'}` : '-'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${user.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                        {user.status?.toUpperCase() || 'ACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDisableUser(user.id, user.status)}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors"
                                                        title={user.status === 'active' ? "Disable User" : "Enable User"}
                                                    >
                                                        {user.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-500 transition-colors"
                                                        title="Delete User"
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
                )}

                {/* CREATE USER VIEW */}
                {activeTab === 'create' && (
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

                        {generatedPassword && (
                            <div className="mb-6 p-6 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl">
                                <p className="text-sm text-[#D4AF37] font-black uppercase tracking-widest mb-2">User Created Successfully!</p>
                                <p className="text-xs text-zinc-400 mb-4 font-medium">Please share these credentials securely with the user.</p>
                                <div className="bg-black/40 p-4 rounded-xl border border-white/10 font-mono text-sm select-all text-white flex justify-between items-center">
                                    <span>Password:</span>
                                    <span className="font-bold text-[#D4AF37]">{generatedPassword}</span>
                                </div>
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
                )}

                {/* BULK UPLOAD VIEW */}
                {activeTab === 'bulk' && (
                    <div className="max-w-2xl mx-auto glass-card bg-black/40 p-8 rounded-[32px] shadow-lg border border-white/10 h-fit">
                        <h2 className="text-xl font-heading font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                            <div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                                <Upload className="w-5 h-5 text-[#D4AF37]" />
                            </div>
                            Bulk Upload Users
                        </h2>

                        {bulkCredentials.length > 0 && (
                            <div className="mb-6 bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-black text-emerald-500 uppercase tracking-wide text-sm mb-1">Upload Successful!</p>
                                        <p className="text-xs text-zinc-400 font-bold">{bulkCredentials.length} users created.</p>
                                    </div>
                                    <button
                                        onClick={downloadCredentials}
                                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-500 transition-colors text-xs font-black uppercase tracking-wider"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Credentials
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-xl mb-6 border border-red-500/20 text-xs font-bold">{error}</div>}
                        {success && !bulkCredentials.length && <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-xl mb-6 border border-emerald-500/20 text-xs font-bold">{success}</div>}

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
                )}
            </motion.div>

            <BottomNav items={adminNavItems} />
        </MobileWrapper>
    );
}
