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
            let photoURL = '';

            if (photo) {
                console.log('ReportIncident: Sanitizing and uploading photo:', photo.name);
                const safeName = photo.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const storageRef = ref(storage, `incidents/${Date.now()}_${safeName}`);
                try {
                    await uploadBytes(storageRef, photo);
                    photoURL = await getDownloadURL(storageRef);
                    console.log('ReportIncident: Photo uploaded successfully:', photoURL);
                } catch (uploadError: any) {
                    console.error('ReportIncident: Photo upload failed:', uploadError);

                    // Specific handling for CORS/Network failures
                    const isNetworkError = uploadError.code === 'storage/unknown' || uploadError.message?.includes('net::ERR');

                    if (isNetworkError) {
                        const proceed = window.confirm(
                            "Photo upload failed (likely a CORS or Network issue).\n\n" +
                            "Would you like to submit the report WITHOUT the photo?"
                        );
                        if (!proceed) throw new Error('Submission cancelled by user due to upload failure.');
                    } else if (uploadError.code === 'storage/unauthorized') {
                        throw new Error('Permission denied to upload photo. Please check your Firebase rules.');
                    } else {
                        throw uploadError;
                    }
                }
            }

            console.log('ReportIncident: Fetching geolocation...');
            const position = await new Promise<GeolocationPosition>((resolve) => {
                navigator.geolocation.getCurrentPosition(resolve, () => {

                    console.warn("Location access denied or timed out, submitting with default coords");
                    resolve({ coords: { latitude: 0, longitude: 0 } } as any);
                }, { timeout: 8000 }); // Slightly faster timeout
            });


            const targetHostelId = profile?.hostelId || profile?.hostel || 'H6';
            console.log('ReportIncident: Submitting to hostel:', targetHostelId);

            await incidentService.createIncident({
                userId: user.uid, // ALWAYS store the real owner's ID privately
                reportedBy: isAnonymous ? 'Anonymous' : user.uid,
                reporterName: isAnonymous ? 'Anonymous' : (profile?.name || user.displayName || 'Student'),
                category,
                description,
                photoURL: photoURL || '',
                location: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                },
                hostelId: targetHostelId,
                isAnonymous
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
                className="px-4 py-6 pb-20 pt-24"
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
