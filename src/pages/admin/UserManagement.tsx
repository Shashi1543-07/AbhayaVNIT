import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
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
        <Layout role="admin">
            <TopHeader title="User Management" showBackButton={true} />

            <motion.div
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >

                {/* Tabs */}
                <motion.div
                    className="flex gap-4 mb-6 border-b border-slate-200"
                    variants={containerStagger}
                    initial="hidden"
                    animate="visible"
                >
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'list' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        All Users
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'create' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Add User
                    </button>
                    <button
                        onClick={() => setActiveTab('bulk')}
                        className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'bulk' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
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
                        className="glass-card rounded-xl shadow-sm border border-white/40 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Filter className="w-4 h-4 text-slate-500" />
                                <select
                                    className="p-2 border border-slate-300 rounded-lg outline-none text-sm"
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                >
                                    <option value="all">All Roles</option>
                                    <option value="student">Students</option>
                                    <option value="warden">Wardens</option>
                                    <option value="security">Security</option>
                                    <option value="admin">Admins</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/30 text-slate-600 font-medium border-b border-white/40 backdrop-blur-md">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Details</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {listLoading ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading users...</td></tr>
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">No users found.</td></tr>
                                    ) : (
                                        users.map(user => (
                                            <tr key={user.id} className="hover:bg-white/40 transition-colors">
                                                <td className="p-4 font-medium text-slate-800">{user.name}</td>
                                                <td className="p-4 text-slate-600">{user.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize
                                                    ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                            user.role === 'warden' ? 'bg-emerald-100 text-emerald-700' :
                                                                user.role === 'security' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-indigo-100 text-indigo-700'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-500">
                                                    {user.role === 'student' ? `${user.hostel || '-'} / ${user.roomNo || '-'}` : '-'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`flex items-center gap-1 text-xs font-bold ${user.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        {user.status?.toUpperCase() || 'ACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDisableUser(user.id, user.status)}
                                                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700"
                                                        title={user.status === 'active' ? "Disable User" : "Enable User"}
                                                    >
                                                        {user.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600"
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
                    <div className="max-w-2xl mx-auto glass-card p-8 rounded-xl shadow-sm border border-white/40">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <UserPlus className="w-6 h-6 text-indigo-600" />
                            Create New Account
                        </h2>

                        {message && (
                            <div className={`p-4 rounded-lg mb-6 ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {message}
                            </div>
                        )}

                        {generatedPassword && (
                            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <p className="text-sm text-indigo-800 font-bold mb-1">User Created Successfully!</p>
                                <p className="text-xs text-indigo-600 mb-2">Please share these credentials securely with the user.</p>
                                <div className="bg-white p-3 rounded border border-indigo-100 font-mono text-sm select-all">
                                    Password: <span className="font-bold">{generatedPassword}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* ... Same Form Fields as Before ... */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm"
                                >
                                    <option value="student">Student</option>
                                    <option value="warden">Warden</option>
                                    <option value="security">Security</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Official Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        required
                                        className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                {(formData.role === 'warden' || formData.role === 'student') && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Assign Hostel</label>
                                        <select
                                            required
                                            className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm"
                                            value={formData.hostel}
                                            onChange={e => setFormData({ ...formData, hostel: e.target.value })}
                                        >
                                            <option value="">Select Hostel</option>
                                            <option value="Ganga">Ganga Hostel</option>
                                            <option value="Yamuna">Yamuna Hostel</option>
                                            <option value="Saraswati">Saraswati Hostel</option>
                                        </select>
                                    </div>
                                )}

                                {formData.role === 'student' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm"
                                            value={formData.roomNo}
                                            onChange={e => setFormData({ ...formData, roomNo: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md mt-4 disabled:opacity-50"
                            >
                                {loading ? 'Creating Account...' : `Create ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} Account`}
                            </button>
                        </form>
                    </div>
                )}

                {/* BULK UPLOAD VIEW */}
                {activeTab === 'bulk' && (
                    <div className="max-w-2xl mx-auto glass-card p-8 rounded-xl shadow-sm border border-white/40 h-fit">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Upload className="w-6 h-6 text-indigo-600" />
                            Bulk Upload Users
                        </h2>

                        {bulkCredentials.length > 0 && (
                            <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-green-800">Upload Successful!</p>
                                        <p className="text-sm text-green-700">{bulkCredentials.length} users created.</p>
                                    </div>
                                    <button
                                        onClick={downloadCredentials}
                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-bold"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Credentials
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}
                        {success && !bulkCredentials.length && <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">{success}</div>}

                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">
                                Upload a CSV file with the following columns in order:
                                <br />
                                <code className="bg-white/50 px-2 py-1 rounded text-sm block mt-2 overflow-x-auto border border-white/40">name,email,role,phone,hostel,roomNo</code>
                            </p>

                            <div className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center hover:bg-white/40 transition-colors cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleBulkUpload}
                                    disabled={loading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center">
                                    <Upload className="w-10 h-10 text-purple-300 mb-3 group-hover:text-purple-500 transition-colors" />
                                    <span className="text-sm font-medium text-slate-600 group-hover:text-purple-600">
                                        {loading ? 'Processing CSV...' : 'Click to upload CSV file'}
                                    </span>
                                    <span className="text-xs text-slate-400 mt-1">Max file size: 5MB</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                                <p className="font-semibold mb-2">Important Notes:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1 opacity-80">
                                    <li>Roles must be lowercase: <span className="font-mono text-xs bg-white/60 px-1 rounded">student</span>, <span className="font-mono text-xs bg-white/60 px-1 rounded">warden</span>, <span className="font-mono text-xs bg-white/60 px-1 rounded">security</span>, <span className="font-mono text-xs bg-white/60 px-1 rounded">admin</span></li>
                                    <li>Passwords will be auto-generated and provided in a downloadable CSV after upload.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </Layout >
    );
}
