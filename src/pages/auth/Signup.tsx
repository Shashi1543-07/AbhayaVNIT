import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Shield, ArrowRight, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        rollNo: '',
        dob: '',
        otp: '',
        password: '',
        confirmPassword: ''
    });

    // ... (rest of the component logic until handleSignup)

    // Step 3: Create Account
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Strong Password Regex: 8-25 chars, uppercase, lowercase, number, special char
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,25}$/;
        if (!passwordRegex.test(formData.password)) {
            setError("Password must be 8-25 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Create Auth User
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                verifiedUser.email,
                formData.password
            );

            // Create User Document in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                uid: userCredential.user.uid,
                name: verifiedUser.name,
                email: verifiedUser.email,
                role: 'student',
                rollNo: formData.rollNo,
                phone: verifiedUser.phone,
                hostelId: verifiedUser.hostelId,
                roomNo: verifiedUser.roomNo,
                createdAt: new Date().toISOString(),
                status: 'active'
            });

            navigate('/student/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-card rounded-2xl overflow-hidden">
                {/* ... (header and steps UI) ... */}
                <div className="bg-indigo-600 p-6 text-center">
                    <Shield className="w-12 h-12 text-white mx-auto mb-2" />
                    <h1 className="text-2xl font-bold text-white">Student Registration</h1>
                    <p className="text-indigo-100">Verify your identity to proceed</p>
                </div>

                <div className="p-8">
                    {/* Progress Steps */}
                    <div className="flex justify-between mb-8 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -z-10" />
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}
                            >
                                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={verifyIdentity} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., BT21CSE001"
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                    value={formData.rollNo}
                                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Identity'}
                                {!loading && <ArrowRight className="w-5 h-5" />}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={verifyOTP} className="space-y-4">
                            <div className="text-center mb-4">
                                <p className="text-sm text-slate-600">OTP sent to</p>
                                <p className="font-bold text-slate-800">{verifiedUser?.email}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Enter OTP</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="123456"
                                    maxLength={6}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center text-2xl tracking-widest"
                                    value={formData.otp}
                                    onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Create Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="8-16 chars, A-Z, a-z, 0-9, special"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Registration'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-slate-600 text-sm">
                            Already registered?{' '}
                            <Link to="/login" className="text-indigo-600 font-bold hover:underline">
                                Login here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
