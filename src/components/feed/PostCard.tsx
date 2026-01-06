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
            className="glass-card p-6 rounded-[2.2rem] border border-white/50 shadow-xl relative"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center font-black text-primary border border-white/60 shadow-sm">
                        {post.authorName.charAt(0).toUpperCase()}
                    </div>
                    {/* Author Info */}
                    <div>
                        <h3 className="font-black text-slate-800 text-sm leading-tight">{post.authorName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                {post.hostelId}
                            </span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-[10px] text-slate-400 font-medium">
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
                        className="p-2 rounded-xl bg-red-100/50 hover:bg-red-100 text-red-600 transition-all disabled:opacity-50"
                        title="Delete post"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content */}
            <p className="text-sm text-slate-700 font-medium leading-relaxed mb-4 whitespace-pre-wrap">
                {post.text}
            </p>

            {/* Image */}
            {post.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-white/60 shadow-sm">
                    <img
                        src={post.imageUrl}
                        alt="Post image"
                        className="w-full max-h-96 object-cover"
                        loading="lazy"
                    />
                </div>
            )}
        </motion.div>
    );
}
