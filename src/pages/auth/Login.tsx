import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Fingerprint, X, User, Eye, EyeOff, Home } from 'lucide-react';
import { biometricService, type SavedCredentials } from '../../services/biometricService';

export default function Login() {
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role') || 'student';
    const displayRole = roleParam.charAt(0).toUpperCase() + roleParam.slice(1);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [enabledAccounts, setEnabledAccounts] = useState<SavedCredentials[]>([]);
    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const navigate = useNavigate();

    React.useEffect(() => {
        const initBiometrics = async () => {
            const isAvailable = await biometricService.isAvailable();
            setBiometricAvailable(isAvailable);
            if (isAvailable) {
                const registry = await biometricService.getRegistry();
                // Filter by current role
                setEnabledAccounts(registry.filter(acc => acc.role === roleParam));
            }
        };
        initBiometrics();
    }, [roleParam]);

    const handleBiometricLogin = async (selectedEmail?: string) => {
        setError('');

        // If we have multiple accounts and none selected yet, show picker
        if (!selectedEmail && enabledAccounts.length > 1) {
            setShowAccountPicker(true);
            return;
        }

        // Use selected or the only one available
        const targetEmail = selectedEmail || (enabledAccounts.length === 1 ? enabledAccounts[0].email : email);

        if (!targetEmail) {
            setError('No biometric account selected. Please login manually first.');
            return;
        }

        try {
            const credentials = await biometricService.getCredentials(roleParam, targetEmail);
            if (credentials && credentials.username && credentials.password) {
                // If credentials match the current role's expected prefix/suffix or we just trust them
                // To be safe we should try logging in
                setLoading(true);
                const userCredential = await signInWithEmailAndPassword(auth, credentials.username, credentials.password);
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

                    if (userData.status === 'disabled') {
                        await signOut(auth);
                        setError('Access Denied: Your account has been disabled.');
                        setLoading(false);
                        return;
                    }

                    if (userData.forcePasswordReset) {
                        navigate('/change-password');
                        return;
                    }

                    routeToDashboard(userRole);
                } else {
                    setError('User profile not found.');
                }
            } else {
                setError('No biometric credentials saved. Please login manually first.');
            }
        } catch (err) {
            console.error('Biometric login failed:', err);
            setError('Biometric authentication failed.');
        } finally {
            setLoading(false);
            setShowAccountPicker(false);
        }
    };

    const routeToDashboard = (userRole: string) => {
        switch (userRole) {
            case 'student': navigate('/student/dashboard'); break;
            case 'warden': navigate('/warden/dashboard'); break;
            case 'security': navigate('/security/dashboard'); break;
            case 'admin': navigate('/admin/dashboard'); break;
            default: navigate('/student/dashboard'); // Fallback
        }
    };

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

                // Check for disabled status
                if (userData.status === 'disabled') {
                    await signOut(auth);
                    setError('Access Denied: Your account has been disabled. Please contact the administrator.');
                    setLoading(false);
                    return;
                }

                if (userData.forcePasswordReset) {
                    navigate('/change-password');
                    return;
                }

                // If biometric is available, suggest saving it or just save it securely under the hood
                if (biometricAvailable) {
                    // Try to save the credentials securely
                    // Note: This relies on native prompt "Do you want to allow this app to use Face ID/Touch ID?" 
                    await biometricService.saveCredentials(email, password, roleParam, email);
                }

                routeToDashboard(userRole);
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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Decorative Background Mesh - Royal Gold Style */}
            <div className="absolute top-[-20%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_0%,#000000_100%)] opacity-100"></div>
            <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-[#CF9E1B]/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-[#D4AF37]/5 rounded-full blur-[100px] animate-pulse-slow"></div>



            <div className="p-8 glass w-full max-w-md relative z-10 pt-20 rounded-[40px] border border-white/5 shadow-2xl">
                <Link
                    to="/"
                    className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-[#D4AF37] transition-all text-[10px] font-black uppercase tracking-widest border border-white/10 active:scale-95 shadow-xl backdrop-blur-md"
                >
                    <Home className="w-3.5 h-3.5" strokeWidth={3} />
                    Back to Home
                </Link>
                <h2 className="text-3xl font-black mb-8 text-center text-[#D4AF37] font-heading tracking-tight drop-shadow-md">
                    {displayRole} <span className="text-white">Login</span>
                </h2>

                {error && (
                    <div className="bg-emergency-pulse border border-emergency text-emergency-dark px-4 py-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-[#D4AF37] mb-2 uppercase tracking-[0.2em] ml-1">Email Terminal</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 placeholder:text-zinc-700 font-bold transition-all shadow-inner"
                            required
                            placeholder={`Enter ${roleParam} credentials`}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[#D4AF37] mb-2 uppercase tracking-[0.2em] ml-1">Secure Passkey</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 font-bold transition-all shadow-inner pr-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5 text-zinc-500 hover:text-[#D4AF37]" />
                                ) : (
                                    <Eye className="h-5 w-5 text-zinc-500 hover:text-[#D4AF37]" />
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-4.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 border border-white/20"
                    >
                        {loading ? 'Authorizing...' : 'Authorize Access'}
                    </button>

                    {biometricAvailable && (
                        <button
                            type="button"
                            onClick={() => handleBiometricLogin()}
                            disabled={loading}
                            className="w-full mt-3 bg-black/40 border border-[#D4AF37]/50 text-[#D4AF37] py-4 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#D4AF37]/10 transition-all shadow-inner"
                        >
                            <Fingerprint className="w-5 h-5" />
                            Fast Login with Biometrics
                        </button>
                    )}
                </form>

                <div className="mt-6 text-center text-sm">
                    <Link to="/forgot-password" className="text-[#D4AF37] font-black uppercase tracking-widest text-[10px] hover:text-[#CF9E1B] transition-colors">Emergency Password Reset?</Link>
                </div>
                <div className="mt-8 p-5 bg-white/5 border border-white/5 text-zinc-500 text-xs rounded-2xl backdrop-blur-md">
                    <p className="font-black mb-1 text-[#D4AF37] uppercase tracking-tighter">Security Protocol:</p>
                    <p className="leading-relaxed opacity-70">Credentials are issued via official channels. Contact administrators for access rights.</p>
                </div>
            </div>

            {/* Professional Account Picker Modal */}
            {showAccountPicker && (
                <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAccountPicker(false)} />
                    <div className="relative glass w-full max-w-sm rounded-[32px] border border-[#D4AF37]/20 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-[#D4AF37] uppercase tracking-tight">Select Account</h3>
                            <button onClick={() => setShowAccountPicker(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-500" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {enabledAccounts.map((acc) => (
                                <button
                                    key={acc.email}
                                    onClick={() => handleBiometricLogin(acc.email)}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all text-left active:scale-[0.98]"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                                        <User className="w-5 h-5 text-[#D4AF37]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">{acc.email}</p>
                                        <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold">Biometric Active</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <p className="mt-6 text-[10px] text-zinc-500 text-center uppercase tracking-widest font-bold opacity-50">
                            Secure isolation active
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
