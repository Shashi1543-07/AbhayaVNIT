import { useState, useEffect } from 'react';
import { Plus, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { postService, type Post } from '../../services/postService';
import { useAuthStore } from '../../context/authStore';
import PostCard from '../../components/feed/PostCard';
import { containerStagger, cardVariant } from '../../lib/animations';
import { studentNavItems, wardenNavItems, securityNavItems, adminNavItems } from '../../lib/navItems';
import { useNavigate } from 'react-router-dom';

export default function Feed() {
    const { role } = useAuthStore();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = postService.subscribeToPosts((fetchedPosts) => {
            setPosts(fetchedPosts);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const isStudent = role === 'student';
    const navigate = useNavigate();

    const getNavItems = () => {
        switch (role) {
            case 'warden': return wardenNavItems;
            case 'security': return securityNavItems;
            case 'admin': return adminNavItems;
            default: return studentNavItems;
        }
    };

    return (
        <MobileWrapper>
            <TopHeader title="Campus Feed" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Header Card */}
                <motion.div
                    variants={cardVariant}
                    className="glass-card p-6 rounded-[2rem] border border-white/50 shadow-2xl flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Community Feed</h2>
                        <p className="text-sm text-slate-500 font-medium opacity-80">
                            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-sm text-primary">
                        <Newspaper className="w-8 h-8" />
                    </div>
                </motion.div>

                {/* Posts List */}
                {loading ? (
                    <motion.div variants={cardVariant} className="glass-card p-12 rounded-[2.5rem] text-center border border-white/50 shadow-xl">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-400 font-bold">Loading posts...</p>
                    </motion.div>
                ) : posts.length === 0 ? (
                    <motion.div variants={cardVariant} className="glass-card p-12 rounded-[2.5rem] text-center border border-white/50 shadow-xl">
                        <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                        <p className="text-slate-400 font-bold">No posts yet</p>
                        {isStudent && (
                            <p className="text-xs text-slate-400 mt-2">Be the first to share!</p>
                        )}
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence initial={false}>
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.main>

            {/* Floating Action Button (Students Only) - Updated for full width */}
            {isStudent && (
                <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
                    <div className="relative h-screen w-full">
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/student/create-post')}
                            className="absolute bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white rounded-2xl shadow-2xl flex items-center justify-center pointer-events-auto border border-white/20"
                        >
                            <Plus className="w-6 h-6" strokeWidth={3} />
                        </motion.button>
                    </div>
                </div>
            )}

            <BottomNav items={getNavItems()} />
        </MobileWrapper>
    );
}
