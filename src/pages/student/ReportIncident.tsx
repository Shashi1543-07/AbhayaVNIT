import React, { useState } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthStore } from '../../context/authStore';
import { incidentService } from '../../services/incidentService';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Loader2, Send } from 'lucide-react';

import { motion } from 'framer-motion';
import { containerStagger, cardVariant, buttonGlow } from '../../lib/animations';

export default function ReportIncident() {
    const { user } = useAuthStore();
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
            let photoURL = '';

            if (photo) {
                const storageRef = ref(storage, `incidents/${Date.now()}_${photo.name}`);
                await uploadBytes(storageRef, photo);
                photoURL = await getDownloadURL(storageRef);
            }

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            await incidentService.createIncident({
                userId: isAnonymous ? null : user.uid,
                reportedBy: isAnonymous ? 'Anonymous' : user.uid,
                reporterName: isAnonymous ? 'Anonymous' : (user.displayName || 'Student'),
                category,
                description,
                photoURL: photoURL || '',
                location: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                },
                hostelId: (user as any).hostelId || 'H6',
                isAnonymous
            });

            navigate('/student/reports');
        } catch (error) {
            console.error('Error reporting incident:', error);
            alert('Failed to submit report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileWrapper>
            <TopHeader title="New Report" showBackButton={true} />

            <motion.main
                className="px-4 py-6 pb-20"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <motion.div variants={cardVariant} className="glass-card p-4 rounded-2xl shadow-soft space-y-4 border border-white/40">
                        <div>
                            <label className="block text-sm font-bold text-primary mb-2">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-primary-50 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            >
                                <option value="harassment">Harassment</option>
                                <option value="stalking">Stalking</option>
                                <option value="unsafe_area">Unsafe Area / Lighting</option>
                                <option value="suspicious_activity">Suspicious Activity</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-primary mb-2">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-3 bg-primary-50 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                                placeholder="Describe what happened..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-primary mb-2">Photo Evidence</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-primary-200 border-dashed rounded-xl cursor-pointer bg-primary-50 hover:bg-primary-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Camera className="w-8 h-8 text-text-light mb-2" />
                                    <p className="text-xs text-text-secondary font-medium">
                                        {photo ? photo.name : 'Tap to upload photo'}
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

                        <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                            <input
                                type="checkbox"
                                id="anonymous"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="w-5 h-5 text-primary border-primary-200 rounded focus:ring-primary"
                            />
                            <label htmlFor="anonymous" className="text-sm font-medium text-primary">Report Anonymously</label>
                        </div>
                    </motion.div>

                    <motion.div variants={cardVariant} className="pt-2">
                        <motion.button
                            type="submit"
                            disabled={loading}
                            variants={buttonGlow}
                            animate="animate"
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-4 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-70 disabled:cursor-not-allowed border border-white/20"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {loading ? 'Submitting...' : 'Submit Report'}
                        </motion.button>
                        <p className="text-xs text-text-light text-center mt-3 flex items-center justify-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Location will be attached automatically
                        </p>
                    </motion.div>
                </form>
            </motion.main>

            <BottomNav />
        </MobileWrapper >
    );
}
