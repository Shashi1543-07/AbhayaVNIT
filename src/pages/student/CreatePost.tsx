import { useState } from 'react';
import { X, Image, Loader, ChevronLeft } from 'lucide-react';
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

            <main className="px-6 pt-24 pb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 rounded-[2rem] border-2 border-white/50 shadow-xl"
                >
                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-2xl">
                            <p className="text-sm text-red-700 font-bold">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Text Input */}
                        <div>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="What's on your mind?"
                                maxLength={280}
                                className="w-full p-5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 focus:border-primary/50 outline-none text-sm font-bold text-slate-700 transition-all resize-none h-48 placeholder:text-slate-400"
                                disabled={loading}
                                autoFocus
                            />
                            <div className="flex justify-end mt-2">
                                <span className={`text-xs font-black ${text.length > 280 ? 'text-red-500' : 'text-slate-400'}`}>
                                    {text.length}/280
                                </span>
                            </div>
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative rounded-2xl overflow-hidden border-2 border-white/60">
                                <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    disabled={loading}
                                    className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 hover:bg-white transition-all shadow-lg disabled:opacity-50"
                                >
                                    <X className="w-4 h-4 text-slate-700" />
                                </button>
                            </div>
                        )}

                        {/* Image Upload Button */}
                        {!imagePreview && (
                            <label className="flex items-center gap-3 p-4 rounded-2xl bg-white/30 border border-white/60 cursor-pointer hover:bg-white/40 transition-all">
                                <Image className="w-5 h-5 text-primary" />
                                <span className="text-sm font-bold text-slate-700">Add Image (optional)</span>
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
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading || !text.trim()}
                                className="w-full py-4 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white font-black rounded-2xl shadow-xl hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Posting...
                                    </>
                                ) : (
                                    'Share with Campus'
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </main>
        </MobileWrapper>
    );
}
