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
                    className="glass p-8 rounded-[2.5rem] border border-[#D4AF37]/20 shadow-2xl flex items-center justify-between bg-black/40"
                >
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight font-heading drop-shadow-sm">Campus <span className="text-[#D4AF37]">Feed</span></h2>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">
                            {posts.length} {posts.length === 1 ? 'INTEL POST' : 'INTEL POSTS'}
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center border border-[#D4AF37]/20 shadow-2xl text-[#D4AF37]">
                        <Newspaper className="w-8 h-8" strokeWidth={3} />
                    </div>
                </motion.div>

                {/* Posts List */}
                {loading ? (
                    <motion.div variants={cardVariant} className="glass p-12 rounded-[2.5rem] text-center border border-white/5 shadow-2xl">
                        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                        <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Accessing Intel...</p>
                    </motion.div>
                ) : posts.length === 0 ? (
                    <motion.div variants={cardVariant} className="glass p-12 rounded-[2.5rem] text-center border border-white/5 shadow-2xl">
                        <Newspaper className="w-16 h-16 text-zinc-800 mx-auto mb-6 opacity-20" />
                        <p className="text-white font-black uppercase tracking-widest text-sm mb-2">Network is Quiet</p>
                        {isStudent && (
                            <p className="text-xs text-zinc-500 font-bold">Be the first to broadcast!</p>
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
                            className="absolute bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black rounded-3xl shadow-[0_10px_30px_rgba(212,175,55,0.3)] flex items-center justify-center pointer-events-auto border border-white/20 active:scale-90 transition-all"
                        >
                            <Plus className="w-8 h-8" strokeWidth={4} />
                        </motion.button>
                    </div>
                </div>
            )}

            <BottomNav items={getNavItems()} />
        </MobileWrapper>
    );
}
