import { useState } from 'react';
import { X, Image, Loader, Send } from 'lucide-react';
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

        // Allow up to 5MB, will be compressed
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

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
            const hostelId = profile.hostelId || (profile as any).hostel || 'General';

            await postService.createPost({
                text: text.trim(),
                imageFile: imageFile || undefined,
                userData: {
                    uid: user.uid,
                    name: profile.name || user.email?.split('@')[0] || 'Anonymous',
                    username: profile.username || (profile as any).userName,
                    hostelId: hostelId,
                    role: profile.role as any
                }
            });

            navigate('/feed');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    const charCount = text.length;
    const isOverLimit = charCount > 280;
    const canSubmit = text.trim().length > 0 && !isOverLimit && !loading;

    return (
        <MobileWrapper>
            <TopHeader title="Create Post" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="rounded-3xl bg-zinc-900 border border-white/10 overflow-hidden">
                    {/* Error Banner */}
                    {error && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            className="bg-red-500/10 border-b border-red-500/20 px-5 py-3"
                        >
                            <p className="text-sm text-red-400 font-medium">{error}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Text Input */}
                        <div className="p-5">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="What's happening on campus?"
                                maxLength={300}
                                className="w-full bg-transparent text-white text-base placeholder:text-zinc-600 resize-none h-40 outline-none leading-relaxed"
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="px-5 pb-4">
                                <div className="relative rounded-2xl overflow-hidden border border-white/10">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full max-h-64 object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        disabled={loading}
                                        className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 hover:bg-black/80 transition-all"
                                    >
                                        <X className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Actions Bar */}
                        <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
                            <div className="flex items-center gap-3">
                                {/* Image Upload */}
                                {!imagePreview && (
                                    <label className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all border border-white/5">
                                        <Image className="w-5 h-5 text-[#D4AF37]" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            disabled={loading}
                                            className="hidden"
                                        />
                                    </label>
                                )}

                                {/* Character Counter */}
                                <div className={`text-sm font-medium ${isOverLimit ? 'text-red-400' : charCount > 240 ? 'text-amber-400' : 'text-zinc-500'}`}>
                                    {charCount}/280
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#8B6E13] text-black font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        <span>Posting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Post</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Tips */}
                <div className="mt-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        <strong className="text-zinc-400">Tip:</strong> Images up to 5MB are automatically compressed. Posts are visible to all campus students and staff.
                    </p>
                </div>
            </motion.main>
        </MobileWrapper>
    );
}
