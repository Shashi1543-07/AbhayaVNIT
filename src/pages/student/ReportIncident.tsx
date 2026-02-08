import React, { useState } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { incidentService } from '../../services/incidentService';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Loader2, Send } from 'lucide-react';

import { motion } from 'framer-motion';
import { containerStagger, cardVariant, buttonGlow } from '../../lib/animations';

export default function ReportIncident() {
    const { user, profile } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [category, setCategory] = useState('harassment');
    const [description, setDescription] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [photo, setPhoto] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            console.log('ReportIncident: Fetching geolocation...');
            const position = await new Promise<GeolocationPosition>((resolve) => {
                navigator.geolocation.getCurrentPosition(resolve, () => {
                    console.warn("Location access denied or timed out, submitting with default coords");
                    resolve({ coords: { latitude: 0, longitude: 0 } } as any);
                }, { timeout: 8000 });
            });

            const targetHostelId = profile?.hostelId || profile?.hostel || 'H6';
            console.log('ReportIncident: Submitting to hostel:', targetHostelId);

            await incidentService.createIncident({
                userId: user.uid,
                reportedBy: user.uid,
                reporterName: isAnonymous ? 'Anonymous' : (profile?.name || user.displayName || 'Student'),
                category,
                description,
                imageFile: photo || undefined,
                location: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                },
                hostelId: targetHostelId,
                isAnonymous,
                // Pass identification if not anonymous
                ...(isAnonymous ? {} : {
                    studentUsername: profile?.username,
                    studentRealName: profile?.name,
                    studentIdNumber: profile?.idNumber,
                    studentEnrollmentNumber: profile?.enrollmentNumber,
                    studentPhone: profile?.phone || profile?.phoneNumber,
                    studentHostel: profile?.hostel || profile?.hostelId,
                    studentRoom: profile?.roomNo
                })
            });

            navigate('/student/reports');
        } catch (error: any) {
            console.error('Error reporting incident:', error);
            // Hide the generic "Failed to submit" if we already showed a specific alert
            if (!error.message?.includes('cancelled by user')) {
                alert(error.message || 'Failed to submit report. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileWrapper>
            <TopHeader title="New Report" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >

                <form onSubmit={handleSubmit} className="space-y-6">
                    <motion.div variants={cardVariant} className="glass p-5 rounded-[32px] shadow-2xl space-y-5 border border-white/5">
                        <div>
                            <label className="block text-[11px] font-black text-[#D4AF37] mb-2 uppercase tracking-[0.2em] ml-1">Threat Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-[#D4AF37]/40 outline-none transition-all font-bold appearance-none"
                            >
                                <option value="harassment" className="bg-zinc-900">Harassment</option>
                                <option value="stalking" className="bg-zinc-900">Stalking</option>
                                <option value="unsafe_area" className="bg-zinc-900">Unsafe Area / Lighting</option>
                                <option value="suspicious_activity" className="bg-zinc-900">Suspicious Activity</option>
                                <option value="other" className="bg-zinc-900">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-[#D4AF37] mb-2 uppercase tracking-[0.2em] ml-1">Incident Intel</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-[#D4AF37]/40 outline-none transition-all resize-none placeholder:text-zinc-700 font-bold"
                                placeholder="State clearly what happened..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-[#D4AF37] mb-2 uppercase tracking-[0.2em] ml-1">Visual Evidence</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/5 border-dashed rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 transition-all group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Camera className="w-8 h-8 text-[#D4AF37] mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                                        {photo ? photo.name : 'Deploy Photo Evidence'}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-[20px] border border-white/5">
                            <input
                                type="checkbox"
                                id="anonymous"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="w-5 h-5 bg-black border-white/10 rounded focus:ring-[#D4AF37] text-[#D4AF37]"
                            />
                            <label htmlFor="anonymous" className="text-xs font-black text-[#D4AF37] uppercase tracking-widest">Report Anonymously</label>
                        </div>
                    </motion.div>

                    <motion.div variants={cardVariant} className="pt-2">
                        <motion.button
                            type="submit"
                            disabled={loading}
                            variants={buttonGlow}
                            animate="animate"
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-4.5 rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_10px_40px_rgba(212,175,55,0.2)] hover:opacity-90 transition-all disabled:opacity-50 border border-white/20"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {loading ? 'Transmitting...' : 'Send Intel to Warden'}
                        </motion.button>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest text-center mt-5 flex items-center justify-center gap-2">
                            <MapPin className="w-4 h-4 text-[#D4AF37]" />
                            G-Pos data will be tagged automatically
                        </p>
                    </motion.div>
                </form>
            </motion.main>

            <BottomNav />
        </MobileWrapper >
    );
}
