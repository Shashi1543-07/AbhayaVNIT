import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { chatService } from '../../services/chatService';
import type { Conversation } from '../../services/chatService';
import { userService } from '../../services/userService';
import type { UserProfile } from '../../services/userService';
import { useAuthStore } from '../../context/authStore';
import { MessageSquare, Shield, Plus, X, User as UserIcon } from 'lucide-react';
import ChatWindow from '../../components/chat/ChatWindow';
import { wardenNavItems, securityNavItems } from '../../lib/navItems';

export default function Messages() {
    const { user, role } = useAuthStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // New Chat Modal State
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [staffList, setStaffList] = useState<UserProfile[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = chatService.subscribeToConversations(user.uid, (data) => {
            setConversations(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleOpenNewChat = async () => {
        setShowNewChatModal(true);
        setLoadingStaff(true);
        const staff = await userService.getStaff();
        setStaffList(staff);
        setLoadingStaff(false);
    };

    const startChatWithUser = async (targetUser: UserProfile) => {
        if (!user) return;
        try {
            const participants = {
                [user.uid]: true,
                [targetUser.uid]: true
            };
            const participantRoles = {
                [role || 'student']: user.uid,
                [targetUser.role]: targetUser.uid
            };

            // Should probably put correct role for current user too
            // But strict role checking isn't blocking creation currently

            const id = await chatService.createConversation('manual', participants, participantRoles);

            setShowNewChatModal(false);
            setSelectedChatId(id);
        } catch (error) {
            console.error("Failed to start chat", error);
            alert("Could not start chat. Please try again.");
        }
    };

    const getDisplayName = (conversation: Conversation) => {
        if (conversation.type === 'sos') return 'SOS Emergency Channel';
        if (conversation.type === 'safe_walk') return 'Safe Walk Monitoring';

        // For manual chats, show the "other" person's role or name
        return `Support Chat`;
    };

    const getNavItems = () => {
        if (role === 'warden') return wardenNavItems;
        if (role === 'security') return securityNavItems;
        return undefined; // Default to Student items
    };

    return (
        <MobileWrapper>
            <TopHeader title="Messages" showBackButton={true} />

            <div className="px-4 py-4 space-y-4 pt-24">
                {/* Start New Chat Button */}
                <button
                    onClick={handleOpenNewChat}
                    className="w-full bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 text-primary-dark font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/50 shadow-sm backdrop-blur-sm"
                >
                    <Plus className="w-5 h-5" />
                    New Message
                </button>

                {/* Chat List */}
                <div className="space-y-3 pb-20">
                    {loading ? (
                        <p className="text-center text-slate-500 text-sm mt-10 animate-pulse">Loading conversations...</p>
                    ) : conversations.length === 0 ? (
                        <div className="text-center mt-10 opacity-60">
                            <div className="w-16 h-16 mx-auto mb-3 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-md">
                                <MessageSquare className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">No active conversations.</p>
                        </div>
                    ) : (
                        conversations.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                className="group bg-white/40 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/40 flex items-center gap-4 hover:bg-white/60 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]"
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-110
                                    ${chat.type === 'sos' ? 'bg-gradient-to-br from-red-100 to-red-50 text-red-600' : 'bg-gradient-to-br from-indigo-100 to-purple-50 text-primary'}
                                `}>
                                    {chat.type === 'sos' ? <Shield className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-primary-dark transition-colors">
                                            {getDisplayName(chat)}
                                        </h3>
                                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap ml-2 bg-white/50 px-2 py-0.5 rounded-full">
                                            {chat.lastMessageAt?.seconds ? new Date(chat.lastMessageAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 truncate mt-1 font-medium opacity-80">
                                        {chat.lastMessage || 'No messages yet'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <BottomNav items={getNavItems()} />

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm rounded-3xl p-1 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200 overflow-hidden">
                        {/* Gradient Border/Background Wrapper */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-xl" />

                        <div className="relative bg-white/40 backdrop-blur-xl rounded-[22px] p-6 border border-white/40">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-bold text-lg text-slate-800">Start New Chat</h2>
                                <button onClick={() => setShowNewChatModal(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Available Staff</p>
                                {loadingStaff ? (
                                    <p className="text-center text-sm text-slate-400 py-4">Loading staff...</p>
                                ) : staffList.length === 0 ? (
                                    <p className="text-center text-sm text-slate-400 py-4">No staff online.</p>
                                ) : (
                                    staffList.map(staff => (
                                        <button
                                            key={staff.uid}
                                            onClick={() => startChatWithUser(staff)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 text-left"
                                        >
                                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800">{staff.name || 'Unknown Staff'}</p>
                                                <p className="text-xs text-slate-500 capitalize">{staff.role}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Window Modal */}
            {selectedChatId && (
                <ChatWindow
                    chatId={selectedChatId}
                    onClose={() => setSelectedChatId(null)}
                />
            )}
        </MobileWrapper>
    );
}
