import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react';

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
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-muted">
                    Enter your institute email address and we'll send you a link to reset your password.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="glass-card py-8 px-4 sm:rounded-lg sm:px-10">
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
                                    className="block w-full pl-10 sm:text-sm border-primary-200 rounded-lg focus:ring-primary focus:border-primary p-3 border bg-white/80"
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

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-primary-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-muted">
                                    Or go back to
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <Link to="/login" className="flex items-center text-sm font-medium text-secondary hover:text-secondary-dark transition-colors">
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
