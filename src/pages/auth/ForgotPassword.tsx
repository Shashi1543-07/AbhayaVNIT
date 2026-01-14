import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, AlertCircle, CheckCircle, Home } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (!email.endsWith('@vnit.ac.in') && !email.endsWith('@students.vnit.ac.in')) {
            setMessage({ type: 'error', text: 'Please enter a valid VNIT email address (@vnit.ac.in or @students.vnit.ac.in)' });
            setLoading(false);
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage({
                type: 'success',
                text: 'Password reset link sent! Check your email inbox.'
            });
            setEmail('');
        } catch (error: any) {
            console.error('Reset password error:', error);
            let errorMsg = 'Failed to send reset email. Please try again.';
            if (error.code === 'auth/user-not-found') {
                errorMsg = 'No account found with this email address.';
            }
            setMessage({ type: 'error', text: errorMsg });
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

                <h2 className="text-3xl font-black mb-2 text-center text-[#D4AF37] font-heading tracking-tight drop-shadow-md uppercase">
                    RESET <span className="text-white">PASSWORD</span>
                </h2>
                <p className="text-center text-sm text-zinc-500 font-bold mb-8 opacity-60">
                    Enter your institute email address and we'll send you a link to reset your password.
                </p>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-[10px] font-black text-[#D4AF37] mb-2 uppercase tracking-[0.2em] ml-1">
                            Email Terminal
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-zinc-600" strokeWidth={3} />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 placeholder:text-zinc-700 font-bold transition-all shadow-inner text-sm"
                                placeholder="student@students.vnit.ac.in"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`rounded-xl p-4 ${message.type === 'success' ? 'bg-success/10 border border-success/30' : 'bg-emergency-pulse border border-emergency/30'}`}>
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    {message.type === 'success' ? (
                                        <CheckCircle className="h-5 w-5 text-success" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-emergency" />
                                    )}
                                </div>
                                <div className="ml-3">
                                    <p className={`text-sm font-medium ${message.type === 'success' ? 'text-success' : 'text-emergency-dark'}`}>
                                        {message.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-4.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 border border-white/20"
                        >
                            {loading ? 'Transmitting...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>

                <div className="mt-4">
                    <Link
                        to="/login"
                        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-white/5 hover:bg-white/10 text-[#D4AF37] transition-all text-[10px] font-black rounded-2xl border border-white/10 uppercase tracking-widest active:scale-95 shadow-xl backdrop-blur-md"
                    >
                        <ArrowLeft className="w-4 h-4" strokeWidth={3} />
                        Back to Login
                    </Link>
                </div>

                <div className="mt-8 p-5 bg-white/5 border border-white/5 text-zinc-500 text-xs rounded-2xl backdrop-blur-md">
                    <p className="font-black mb-1 text-[#D4AF37] uppercase tracking-tighter">Security Protocol:</p>
                    <p className="leading-relaxed opacity-70">Password reset links are valid for 1 hour. Ensure you check your spam folder.</p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
