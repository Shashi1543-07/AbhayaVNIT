import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { postService, type Post } from '../../services/postService';
import { useAuthStore } from '../../context/authStore';
import { useState } from 'react';

interface PostCardProps {
    post: Post;
}

export default function PostCard({ post }: PostCardProps) {
    const { user } = useAuthStore();
    const [deleting, setDeleting] = useState(false);
    const isAuthor = user?.uid === post.authorId;

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        setDeleting(true);
        try {
            await postService.deletePost(post.id);
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('Failed to delete post');
        } finally {
            setDeleting(false);
        }
    };

    const getRelativeTime = (timestamp: any) => {
        if (!timestamp) return 'Just now';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass p-5 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden group"
        >
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4AF37]/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16" />

            {/* Header */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-11 h-11 bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 rounded-2xl flex items-center justify-center font-black text-[#D4AF37] text-lg border border-[#D4AF37]/20 shadow-lg">
                        {post.authorName.charAt(0).toUpperCase()}
                    </div>
                    {/* Author Info */}
                    <div>
                        <h3 className="font-bold text-white text-sm leading-tight">{post.authorName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold text-[#D4AF37]/70 uppercase tracking-wide">
                                {post.hostelId}
                            </span>
                            <span className="text-[10px] text-zinc-600">•</span>
                            <span className="text-[10px] text-zinc-500 font-medium">
                                {getRelativeTime(post.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Delete Button (author only) */}
                {isAuthor && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all disabled:opacity-50 active:scale-90"
                        title="Delete post"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content */}
            <p className="text-sm text-zinc-300 leading-relaxed mb-4 whitespace-pre-wrap">
                {post.text}
            </p>

            {/* Image - supports both imageData (base64) and legacy imageUrl */}
            {(post.imageData || (post as any).imageUrl) && (
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                    <img
                        src={post.imageData || (post as any).imageUrl}
                        alt="Post image"
                        className="w-full max-h-80 object-cover"
                        loading="lazy"
                    />
                </div>
            )}
        </motion.div>
    );
}

