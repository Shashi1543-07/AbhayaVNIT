import { useState, useEffect } from 'react';
import { Plus, Newspaper, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { postService, type Post } from '../../services/postService';
import { useAuthStore } from '../../context/authStore';
import PostCard from '../../components/feed/PostCard';
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

    const canPost = ['student', 'admin', 'warden', 'security'].includes(role || '');
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
                className="px-4 pt-nav-safe pb-nav-safe space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {/* Posts List */}
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20"
                    >
                        <RefreshCw className="w-10 h-10 text-[#D4AF37] animate-spin mb-4" />
                        <p className="text-zinc-500 text-sm font-medium">Loading posts...</p>
                    </motion.div>
                ) : posts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-zinc-800"
                    >
                        <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 border border-zinc-800">
                            <Newspaper className="w-10 h-10 text-zinc-700" />
                        </div>
                        <p className="text-white font-semibold text-lg mb-2">No posts yet</p>
                        {canPost && (
                            <p className="text-zinc-500 text-sm">Be the first to share something!</p>
                        )}
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence initial={false}>
                            {posts.map((post, index) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <PostCard post={post} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Bottom spacer for FAB */}
                {canPost && <div className="h-20" />}
            </motion.main>

            {/* Floating Action Button (All authorized roles) */}
            {canPost && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/create-post')}
                    className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-br from-[#D4AF37] to-[#8B6E13] text-black rounded-2xl shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center border border-[#D4AF37]/30"
                >
                    <Plus className="w-7 h-7" strokeWidth={2.5} />
                </motion.button>
            )}

            <BottomNav items={getNavItems()} />
        </MobileWrapper>
    );
}
