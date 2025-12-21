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
                <h2 className="text-2xl font-bold mb-2 text-center text-primary">
                    Reset your password
                </h2>
                <p className="text-center text-sm text-muted mb-6">
                    Enter your institute email address and we'll send you a link to reset your password.
                </p>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-muted">
                            Email address
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-muted" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white/20 focus:bg-white/30 transition-all placeholder-gray-500"
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
                            className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-3 rounded-2xl hover:opacity-90 hover:shadow-lg transition-all font-bold disabled:opacity-50 shadow-md border border-white/20"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>

                <div className="mt-4">
                    <Link
                        to="/login"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 glass-button-secondary hover:bg-white/40 transition-all text-sm font-semibold"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
