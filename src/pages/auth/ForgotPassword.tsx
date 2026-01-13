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
            {/* Tactical Operational Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,#D4AF37_0%,transparent_70%)] opacity-20" />
            </div>


            <div className="p-8 glass rounded-[3rem] border border-white/5 shadow-2xl w-full max-w-md relative z-10 pt-16 bg-black/40">
                <Link
                    to="/"
                    className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 transition-all text-xs font-black border border-white/10 active:scale-95 shadow-sm uppercase tracking-widest"
                >
                    <Home className="w-3.5 h-3.5" strokeWidth={3} />
                    Back to Home
                </Link>
                <h2 className="text-2xl font-black mb-2 text-center text-white font-heading uppercase tracking-tight">
                    Reset your password
                </h2>
                <p className="text-center text-sm text-zinc-500 font-bold mb-6 opacity-60">
                    Enter your institute email address and we'll send you a link to reset your password.
                </p>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                            Email address
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
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
                                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all font-bold text-sm"
                                placeholder="student@students.vnit.ac.in"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-success/10 border border-success/30' : 'bg-emergency-pulse border border-emergency/30'}`}>
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
                            className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-4 rounded-2xl hover:opacity-95 shadow-xl transition-all font-black uppercase tracking-[0.2em] text-[11px] disabled:opacity-50 border border-white/10"
                        >
                            {loading ? 'Transmitting...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>

                <div className="mt-4">
                    <Link
                        to="/login"
                        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-white/5 hover:bg-white/10 text-[#D4AF37] transition-all text-sm font-black rounded-2xl border border-white/10 uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft className="w-4 h-4" strokeWidth={3} />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
