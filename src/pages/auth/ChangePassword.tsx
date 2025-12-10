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
        <div className={`flex items-center gap-2 text-sm ${fulfilled ? 'text-success' : 'text-muted'}`}>
            {fulfilled ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-surface" />}
            <span>{text}</span>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
                    Set New Password
                </h2>
                <p className="mt-2 text-center text-sm text-muted">
                    Please set a new secure password for your account.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="glass-card py-8 px-4 sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-muted">
                                New Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-muted" />
                                </div>
                                <input
                                    id="new-password"
                                    name="new-password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 sm:text-sm border-surface rounded-lg focus:ring-primary focus:border-primary p-2 border"
                                    placeholder="Enter new password"
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

                            {/* Visual Password Checklist */}
                            <div className="mt-4 p-4 bg-primary-50 rounded-lg space-y-2 border border-surface">
                                <p className="text-xs font-semibold text-muted uppercase mb-2">Password Requirements:</p>
                                <ValidationItem fulfilled={validations.length} text="8-25 characters long" />
                                <ValidationItem fulfilled={validations.upper} text="At least one uppercase letter" />
                                <ValidationItem fulfilled={validations.lower} text="At least one lowercase letter" />
                                <ValidationItem fulfilled={validations.number} text="At least one number" />
                                <ValidationItem fulfilled={validations.special} text="At least one special character (!@#$%^&*...)" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-muted">
                                Confirm Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-muted" />
                                </div>
                                <input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 sm:text-sm border-surface rounded-lg focus:ring-primary focus:border-primary p-2 border"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5 text-muted hover:text-primary" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-muted hover:text-primary" />
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
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
