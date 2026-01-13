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
            await postService.deletePost(post.id, post.imageUrl);
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
            className="glass p-6 rounded-[2.5rem] border border-[#D4AF37]/10 shadow-2xl relative bg-black/40"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-white/5 backdrop-blur-3xl rounded-[18px] flex items-center justify-center font-black text-[#D4AF37] border border-white/10 shadow-2xl">
                        {post.authorName.charAt(0).toUpperCase()}
                    </div>
                    {/* Author Info */}
                    <div>
                        <h3 className="font-black text-white text-sm leading-tight drop-shadow-sm font-heading">{post.authorName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.1em]">
                                {post.hostelId}
                            </span>
                            <span className="text-[9px] text-[#D4AF37]/40">•</span>
                            <span className="text-[9px] text-zinc-500 font-black uppercase font-mono">
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
                        className="p-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 transition-all disabled:opacity-50 active:scale-90"
                        title="Delete post"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content */}
            <p className="text-sm text-zinc-300 font-bold leading-relaxed mb-5 whitespace-pre-wrap pl-1">
                {post.text}
            </p>

            {/* Image */}
            {post.imageUrl && (
                <div className="rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-black/50">
                    <img
                        src={post.imageUrl}
                        alt="Post image"
                        className="w-full max-h-[400px] object-cover hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                    />
                </div>
            )}
        </motion.div>
    );
}
