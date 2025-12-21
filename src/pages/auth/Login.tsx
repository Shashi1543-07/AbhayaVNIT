import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Home } from 'lucide-react';

export default function Login() {
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role') || 'student';
    const displayRole = roleParam.charAt(0).toUpperCase() + roleParam.slice(1);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user role from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const userRole = userData.role;

                // STRICT ROLE ENFORCEMENT
                if (userRole !== roleParam) {
                    await signOut(auth);
                    setError(`Access Denied: You are trying to login as ${displayRole} but your account is registered as ${userRole}.`);
                    setLoading(false);
                    return;
                }

                if (userData.forcePasswordReset) {
                    navigate('/change-password');
                    return;
                }

                switch (userRole) {
                    case 'student':
                        navigate('/student/dashboard');
                        break;
                    case 'warden':
                        navigate('/warden/dashboard');
                        break;
                    case 'security':
                        navigate('/security/dashboard');
                        break;
                    case 'admin':
                        navigate('/admin/dashboard');
                        break;
                    default:
                        navigate('/student/dashboard'); // Fallback
                }
            } else {
                setError('User profile not found.');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else {
                setError('Failed to log in. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-secondary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>


            <div className="absolute top-6 left-6 z-20">
                <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2 glass-button-secondary hover:bg-white/40 transition-all text-sm font-semibold"
                >
                    <Home className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>

            <div className="p-8 glass-card-auth w-full max-w-md relative z-10">
                <h2 className="text-2xl font-bold mb-6 text-center text-primary">{displayRole} Login</h2>

                {error && (
                    <div className="bg-emergency-pulse border border-emergency text-emergency-dark px-4 py-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white/20 focus:bg-white/30 transition-all placeholder-gray-500"
                            required
                            placeholder={`Enter ${roleParam} email`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white/20 focus:bg-white/30 transition-all pr-10 placeholder-gray-500"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5 text-muted hover:text-primary" />
                                ) : (
                                    <Eye className="h-5 w-5 text-muted hover:text-primary" />
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-3 rounded-2xl hover:opacity-90 hover:shadow-lg transition-all font-bold disabled:opacity-50 shadow-md border border-white/20"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-muted">
                    <Link to="/forgot-password" className="text-secondary hover:text-secondary-dark hover:underline transition-colors font-medium">Forgot Password?</Link>
                </div>
                <div className="mt-6 p-4 bg-primary-50 border border-primary-200 text-muted text-sm rounded-lg">
                    <p className="font-semibold mb-1 text-primary-dark">Note:</p>
                    <p>New accounts are created by the Administrator. If you are a new student or staff member, please contact the Admin office for your credentials.</p>
                </div>
            </div>
        </div>
    );
}
