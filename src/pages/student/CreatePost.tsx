import { useState } from 'react';
import { X, Image, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { postService } from '../../services/postService';
import { useAuthStore } from '../../context/authStore';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';

export default function CreatePost() {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const [text, setText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size
        if (file.size > 1024 * 1024) {
            setError('Image must be less than 1MB');
            return;
        }

        // Validate type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setError('');
    };

    const removeImage = () => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) {
            setError('Please enter some text');
            return;
        }

        if (text.length > 280) {
            setError('Post cannot exceed 280 characters');
            return;
        }

        if (!user || !profile) {
            setError('User profile not loaded. Please try again.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Use profile.hostelId OR profile.hostel (legacy field) with a fallback
            const hostelId = profile.hostelId || (profile as any).hostel || 'General';

            await postService.createPost({
                text: text.trim(),
                imageFile: imageFile || undefined,
                userData: {
                    uid: user.uid,
                    name: profile.name,
                    hostelId: hostelId
                }
            });

            // Navigate back to feed on success
            navigate('/feed');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileWrapper>
            <TopHeader title="Create Post" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                // Assuming containerStagger is defined elsewhere or meant to be added
                // variants={containerStagger}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <motion.div
                    className="glass p-8 rounded-[3rem] border border-white/5 shadow-2xl bg-black/40"
                >
                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-600/10 border border-red-500/20 rounded-2xl">
                            <p className="text-xs text-red-500 font-bold uppercase tracking-widest text-center">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Text Input */}
                        <div>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Broadcast tactical memo..."
                                maxLength={280}
                                className="w-full p-6 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 focus:ring-2 focus:ring-[#D4AF37]/30 outline-none text-sm font-bold text-white transition-all resize-none h-56 placeholder:text-zinc-700 shadow-inner"
                                disabled={loading}
                                autoFocus
                            />
                            <div className="flex justify-end mt-4 px-4">
                                <span className={`text-[10px] font-black tracking-widest ${text.length > 280 ? 'text-red-500' : 'text-zinc-500'}`}>
                                    {text.length} / 280 ENTRIES
                                </span>
                            </div>
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group">
                                <img src={imagePreview} alt="Preview" className="w-full max-h-72 object-cover" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all pointer-events-none" />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    disabled={loading}
                                    className="absolute top-4 right-4 p-3 rounded-2xl bg-black/60 backdrop-blur-3xl border border-white/10 hover:bg-black/80 transition-all shadow-2xl active:scale-90"
                                >
                                    <X className="w-5 h-5 text-red-500" strokeWidth={3} />
                                </button>
                            </div>
                        )}

                        {/* Image Upload Button */}
                        {!imagePreview && (
                            <label className="flex items-center gap-4 p-5 rounded-[22px] bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all group shadow-inner">
                                <div className="p-3 bg-[#D4AF37]/10 rounded-xl group-hover:bg-[#D4AF37]/20 transition-all">
                                    <Image className="w-6 h-6 text-[#D4AF37]" strokeWidth={3} />
                                </div>
                                <span className="text-sm font-black text-zinc-400 uppercase tracking-widest">Attach Visual Intel</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    disabled={loading}
                                    className="hidden"
                                />
                            </label>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading || !text.trim()}
                                className="w-full py-5 bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black font-black rounded-[24px] shadow-[0_10px_40px_rgba(212,175,55,0.2)] hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px] border border-white/20"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        TRANSMITTING...
                                    </>
                                ) : (
                                    'BROADCAST MEMO'
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.main>
        </MobileWrapper>
    );
}
