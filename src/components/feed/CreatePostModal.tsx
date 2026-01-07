import { useState } from 'react';
import { X, Image, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { postService } from '../../services/postService';
import { useAuthStore } from '../../context/authStore';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
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

        if (!user || !profile) return;

        setLoading(true);
        setError('');

        try {
            await postService.createPost({
                text: text.trim(),
                imageFile: imageFile || undefined,
                userData: {
                    uid: user.uid,
                    name: profile.name,
                    hostelId: profile.hostelId
                }
            });

            // Reset form
            setText('');
            removeImage();
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setText('');
            removeImage();
            setError('');
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="glass-card p-8 rounded-[2.5rem] w-full max-w-[440px] border-2 border-white/50 shadow-2xl relative mx-auto"
                    >
                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            disabled={loading}
                            className="absolute top-6 right-6 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-slate-700" />
                        </button>

                        {/* Header */}
                        <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Create Post</h2>
                        <p className="text-sm text-slate-500 font-medium mb-6">Share your thoughts with the campus community</p>

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
                                    className="w-full p-5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 focus:border-primary/50 outline-none text-sm font-bold text-slate-700 transition-all resize-none h-32 placeholder:text-slate-400"
                                    disabled={loading}
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

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-white/40 backdrop-blur-md border border-white/60 text-slate-700 font-bold rounded-2xl hover:bg-white/50 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !text.trim()}
                                    className="flex-1 py-3 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Posting...
                                        </>
                                    ) : (
                                        'Post'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
