import React, { useState, useEffect } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { Lock, AlertCircle, Eye, EyeOff, Check } from 'lucide-react';

const ChangePassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user, setForcePasswordReset } = useAuthStore();

    // Validation States
    const [validations, setValidations] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false
    });

    useEffect(() => {
        setValidations({
            length: newPassword.length >= 8 && newPassword.length <= 25,
            upper: /[A-Z]/.test(newPassword),
            lower: /[a-z]/.test(newPassword),
            number: /\d/.test(newPassword),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)
        });
    }, [newPassword]);

    const isPasswordValid = Object.values(validations).every(Boolean);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (newPassword !== confirmPassword) {
            setError("Passwords don't match");
            setLoading(false);
            return;
        }

        if (!isPasswordValid) {
            setError("Please fulfill all password requirements.");
            setLoading(false);
            return;
        }

        if (!user) {
            setError("No user logged in.");
            setLoading(false);
            return;
        }

        try {
            await updatePassword(user, newPassword);

            // Update Firestore to remove force reset flag
            await updateDoc(doc(db, 'users', user.uid), {
                forcePasswordReset: false
            });

            // Update local state
            setForcePasswordReset(false);

            alert("Password updated successfully!");
            navigate('/'); // Redirect to home/dashboard which will handle role-based routing
        } catch (err: any) {
            console.error("Error updating password:", err);
            if (err.code === 'auth/requires-recent-login') {
                setError("For security reasons, your session has expired. Please log out and log back in to change your password.");
                // Optional: Automatically log out after a delay or provide a button
            } else {
                setError(err.message || "Failed to update password");
            }
        } finally {
            setLoading(false);
        }
    };

    const ValidationItem = ({ fulfilled, text }: { fulfilled: boolean; text: string }) => (
        <div className={`flex items-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all ${fulfilled ? 'text-[#D4AF37]' : 'text-zinc-600'}`}>
            {fulfilled ? (
                <div className="w-4 h-4 rounded-full bg-[#D4AF37]/20 flex items-center justify-center border border-[#D4AF37]/30">
                    <Check className="w-2.5 h-2.5 text-[#D4AF37]" strokeWidth={4} />
                </div>
            ) : (
                <div className="w-4 h-4 rounded-full border-2 border-zinc-800" />
            )}
            <span>{text}</span>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Tactical Operational Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,#D4AF37_0%,transparent_70%)] opacity-20" />
            </div>

            <div className="p-8 glass rounded-[3rem] border border-white/5 shadow-2xl w-full max-w-md relative z-10 pt-10 bg-black/40">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <h2 className="text-2xl font-black mb-2 text-center text-white font-heading uppercase tracking-tight">
                        Set New Password
                    </h2>
                    <p className="text-center text-sm text-zinc-500 font-bold mb-6 opacity-60">
                        Please set a new secure password for your account.
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="new-password" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                            New Password
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-zinc-600" strokeWidth={3} />
                            </div>
                            <input
                                id="new-password"
                                name="new-password"
                                type={showPassword ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all font-bold text-sm"
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5 text-zinc-500 hover:text-[#D4AF37] transition-colors" strokeWidth={3} />
                                ) : (
                                    <Eye className="h-5 w-5 text-zinc-500 hover:text-[#D4AF37] transition-colors" strokeWidth={3} />
                                )}
                            </button>
                        </div>

                        {/* Visual Password Checklist */}
                        <div className="mt-4 p-5 bg-white/5 rounded-2xl space-y-2 border border-white/10 shadow-inner">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Operational Requirements:</p>
                            <div className="space-y-2">
                                <ValidationItem fulfilled={validations.length} text="8-25 characters long" />
                                <ValidationItem fulfilled={validations.upper} text="One uppercase letter" />
                                <ValidationItem fulfilled={validations.lower} text="One lowercase letter" />
                                <ValidationItem fulfilled={validations.number} text="One number" />
                                <ValidationItem fulfilled={validations.special} text="Special character (!@#...)" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirm-password" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                            Confirm Password
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-zinc-600" strokeWidth={3} />
                            </div>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all font-bold text-sm"
                                placeholder="Repeat password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-5 w-5 text-zinc-500 hover:text-[#D4AF37] transition-colors" strokeWidth={3} />
                                ) : (
                                    <Eye className="h-5 w-5 text-zinc-500 hover:text-[#D4AF37] transition-colors" strokeWidth={3} />
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-emergency-pulse p-4 border border-emergency">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-emergency" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-emergency-dark">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !isPasswordValid}
                            className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-4 rounded-2xl hover:opacity-95 shadow-xl transition-all font-black uppercase tracking-[0.2em] text-[11px] disabled:opacity-50 border border-white/10"
                        >
                            {loading ? 'Committing...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
