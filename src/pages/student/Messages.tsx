import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import TopHeader from '../../components/layout/TopHeader';
import { chatService } from '../../services/chatService';
import type { Conversation } from '../../services/chatService';
import { userService } from '../../services/userService';
import type { UserProfile } from '../../services/userService';
import { useAuthStore } from '../../context/authStore';
import { MessageSquare, Shield, Plus, X, User as UserIcon, Search } from 'lucide-react';
import ChatWindow from '../../components/chat/ChatWindow';
import { wardenNavItems, securityNavItems } from '../../lib/navItems';

export default function Messages() {
    const { user, profile, role } = useAuthStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [listSearchTerm, setListSearchTerm] = useState('');

    // Persistence key
    const CACHE_KEY = `conversations_${user?.uid}`;

    // New Chat Modal State
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [staffList, setStaffList] = useState<UserProfile[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;

        // Try to load from cache first for instant UI
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                setConversations(JSON.parse(cached));
                setLoading(false); // We have something to show
            } catch (e) {
                console.warn("Failed to parse cached chats", e);
            }
        }

        const unsubscribe = chatService.subscribeToConversations(user.uid, (data) => {
            setConversations(data);
            setLoading(false);
            // Save to cache for next time
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        });

        return () => unsubscribe();
    }, [user, CACHE_KEY]);

    const handleOpenNewChat = async () => {
        setShowNewChatModal(true);
        setLoadingStaff(true);
        setSearchTerm(''); // Reset search when opening
        try {
            const allStaff = await userService.getStaff();
            let contactList: UserProfile[] = [];
            const myHostel = profile?.hostelId || profile?.hostel;

            if (role === 'student') {
                // Students: Can message their Warden and Security
                contactList = allStaff.filter(s =>
                    s.role === 'security' ||
                    (s.role === 'warden' && (
                        s.hostelId?.toLowerCase() === myHostel?.toLowerCase() ||
                        (s as any).hostel?.toLowerCase() === myHostel?.toLowerCase()
                    ))
                );
            } else if (role === 'warden') {
                // Wardens: Can message Security and Students from their hostel
                const security = allStaff.filter(s => s.role === 'security');
                const myStudents = await userService.getStudentsByHostel(myHostel || '');
                contactList = [
                    ...security,
                    ...myStudents.map(s => ({
                        uid: s.id,
                        name: s.displayName,
                        role: 'student' as const,
                        roomNo: s.roomNo,
                        hostelId: s.hostelId
                    }))
                ];
            } else if (role === 'security') {
                // Security: Can message all staff and all students
                const otherStaff = allStaff.filter(s => s.uid !== user?.uid);
                const allStudents = await userService.getAllStudents();
                contactList = [
                    ...otherStaff,
                    ...allStudents.map(s => ({
                        uid: s.id,
                        name: s.displayName,
                        role: 'student' as const,
                        roomNo: s.roomNo,
                        hostelId: s.hostelId
                    }))
                ];
            }

            setStaffList(contactList);
        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setLoadingStaff(false);
        }
    };

    const startChatWithUser = async (targetUser: UserProfile) => {
        if (!user || !profile) return;
        try {
            const participants = [
                { uid: user.uid, name: profile.name || 'Student', role: role || 'student' },
                { uid: targetUser.uid, name: targetUser.name || 'Staff', role: targetUser.role }
            ];

            const id = await chatService.createConversation('manual', participants);

            setShowNewChatModal(false);
            setSelectedChatId(id);
        } catch (error) {
            console.error("Failed to start chat", error);
            alert("Could not start chat. Please try again.");
        }
    };

    const getChatName = (chat: Conversation) => {
        if (chat.type === 'sos') return '🆘 SOS Emergency Channel';
        if (chat.type === 'safe_walk') return '🚶 Safe Walk Support';

        // Find the other participant's name
        if (chat.participantNames && user) {
            const otherId = Object.keys(chat.participantNames).find(id => id !== user.uid);
            if (otherId) return chat.participantNames[otherId];
        }

        return 'Support Chat';
    };

    const getChatRole = (chat: Conversation) => {
        if (chat.type !== 'manual') return chat.type.replace('_', ' ');

        if (chat.participantRoles && user) {
            const otherId = Object.keys(chat.participantRoles).find(id => id !== user.uid);
            if (otherId) return chat.participantRoles[otherId];
        }
        return '';
    };

    const getNavItems = () => {
        if (role === 'warden') return wardenNavItems;
        if (role === 'security') return securityNavItems;
        return undefined;
    };

    return (
        <MobileWrapper>
            <TopHeader title="Messages" showBackButton={true} />

            {/* Background Gradient - Ensuring Absolute Consistency */}
            <div className="absolute inset-0 pointer-events-none z-0" style={{
                background: 'linear-gradient(20deg, #FF99AC 0%, #C084FC 35%, #89CFF0 70%, #FFFFFF 100%)'
            }} />

            <div className="relative px-4 pt-nav-safe pb-nav-safe z-10">
                {/* Search Bar for Conversations */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={listSearchTerm}
                        onChange={(e) => setListSearchTerm(e.target.value)}
                        className="w-full bg-white/40 backdrop-blur-md border border-white/60 rounded-[28px] py-4 pl-12 pr-4 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold shadow-sm shadow-primary/5"
                    />
                </div>

                {/* Start New Chat Button - Premium Glassy Shadow */}
                <button
                    onClick={handleOpenNewChat}
                    className="w-full bg-gradient-to-r from-primary/30 to-secondary/30 hover:from-primary/40 hover:to-secondary/40 text-primary-dark font-extrabold py-4 rounded-[28px] flex items-center justify-center gap-2 transition-all border border-white/60 shadow-lg shadow-primary/10 backdrop-blur-md active:scale-95"
                >
                    <div className="bg-white/40 p-1.5 rounded-full">
                        <Plus className="w-5 h-5 text-primary-dark" />
                    </div>
                    New Message
                </button>

                {/* Chat List - Highly Rounded & Glassy */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">Syncing Encrypted Chats...</p>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-16 opacity-50">
                            <div className="w-24 h-24 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-inner">
                                <MessageSquare className="w-10 h-10 text-slate-300" />
                            </div>
                            <p className="text-base font-extrabold text-slate-600">Secure Inbox Empty</p>
                            <p className="text-xs mt-1 text-slate-500">Authorized support channels will appear here.</p>
                        </div>
                    ) : (
                        conversations
                            .filter(chat => {
                                const name = getChatName(chat).toLowerCase();
                                const lastMsg = (chat.lastMessage || '').toLowerCase();
                                return name.includes(listSearchTerm.toLowerCase()) || lastMsg.includes(listSearchTerm.toLowerCase());
                            })
                            .map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                    className="group relative bg-white/30 backdrop-blur-xl p-5 rounded-[32px] shadow-sm border border-white/50 flex items-center gap-4 hover:bg-white/60 transition-all cursor-pointer hover:shadow-2xl hover:scale-[1.03] active:scale-95 overflow-hidden"
                                >
                                    {/* Active Indicator Dot */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/40 group-hover:bg-primary transition-colors" />

                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md border border-white/40 shrink-0
                                    ${chat.type === 'sos' ? 'bg-red-50 text-red-600' : 'bg-white/80 text-primary'}
                                `}>
                                        {chat.type === 'sos' ? <Shield className="w-7 h-7" /> : <UserIcon className="w-7 h-7" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <h3 className="font-extrabold text-slate-800 text-[15px] truncate group-hover:text-primary-dark transition-colors tracking-tight">
                                                {getChatName(chat)}
                                            </h3>
                                            <span className="text-[9px] text-slate-500 font-extrabold whitespace-nowrap ml-2 bg-white/60 px-2.5 py-1 rounded-full border border-white/40 shadow-sm">
                                                {chat.lastMessageAt?.seconds ? new Date(chat.lastMessageAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-[13px] text-slate-600 truncate opacity-90 flex-1 leading-none font-medium">
                                                {chat.lastMessage || 'Channel established'}
                                            </p>
                                            <span className="text-[9px] bg-primary/10 text-primary-dark px-2 py-0.5 rounded-lg border border-primary/5 uppercase font-black tracking-tighter">
                                                {getChatRole(chat)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>

            <BottomNav items={getNavItems()} />

            {/* New Chat Modal - Premium Glassy style */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-[120] flex flex-col font-sans overflow-hidden py-10 pointer-events-none">
                    <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" onClick={() => setShowNewChatModal(false)} />

                    <div className="relative w-full max-w-[480px] mx-auto h-full flex flex-col shadow-2xl pointer-events-auto border-x border-white/20 rounded-t-[40px] overflow-hidden animate-in slide-in-from-bottom duration-500">
                        {/* Background Gradient - Global Consistency Fix */}
                        <div className="absolute inset-0 pointer-events-none" style={{
                            background: 'linear-gradient(20deg, #FF99AC 0%, #C084FC 35%, #89CFF0 70%, #FFFFFF 100%)'
                        }} />

                        {/* Header bg gradient matches theme */}
                        <div className="relative bg-gradient-to-r from-primary/90 to-[#A78BFA]/90 text-white px-6 pt-10 pb-6 shadow-lg rounded-b-3xl z-10 space-y-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowNewChatModal(false)} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all border border-white/30 active:scale-90 shadow-sm">
                                    <X className="w-6 h-6" />
                                </button>
                                <div>
                                    <h2 className="font-extrabold text-2xl leading-tight tracking-tight">New Message</h2>
                                    <p className="text-[10px] text-white/90 uppercase font-black tracking-[0.2em]">{staffList.length} contacts available</p>
                                </div>
                            </div>

                            {/* Search Bar - Glassy Refinement */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4 text-white/60 group-focus-within:text-white transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by name or room number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/10 border border-white/30 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 focus:border-white/50 transition-all backdrop-blur-md"
                                />
                            </div>
                        </div>

                        <div className="relative flex-1 divide-y divide-white/20 overflow-y-auto p-4 space-y-3 z-10 scrollbar-hide">
                            {loadingStaff ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : staffList.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-inner">
                                        <UserIcon className="w-12 h-12 text-slate-400" />
                                    </div>
                                    <p className="font-black text-slate-800 text-lg">No contacts found</p>
                                    <p className="text-xs mt-1 text-slate-600 font-bold opacity-60">Direct messaging is restricted for security.</p>
                                </div>
                            ) : (
                                staffList
                                    .filter(item =>
                                        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        item.roomNo?.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map(item => (
                                        <button
                                            key={item.uid}
                                            onClick={() => startChatWithUser(item)}
                                            className="w-full flex items-center gap-4 p-5 bg-white/30 backdrop-blur-xl rounded-[28px] hover:bg-white/50 text-left transition-all border border-white/60 shadow-lg shadow-primary/5 hover:scale-[1.02] active:scale-95 group"
                                        >
                                            <div className="w-14 h-14 bg-white/80 text-primary rounded-full flex items-center justify-center shrink-0 shadow-md border border-white/50 group-hover:bg-primary group-hover:text-white transition-all">
                                                <UserIcon className="w-7 h-7" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-800 text-[15px] truncate tracking-tight">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <p className="text-[10px] text-primary-dark font-black tracking-widest bg-primary/10 inline-block px-2 py-0.5 rounded-lg uppercase">{item.role}</p>
                                                    {item.roomNo && (
                                                        <p className="text-[10px] text-secondary-dark font-black tracking-widest bg-secondary/10 inline-block px-2 py-0.5 rounded-lg uppercase">Room: {item.roomNo}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                            )}
                        </div>

                        <div className="relative p-8 bg-white/20 backdrop-blur-2xl border-t border-white/30 text-center z-10">
                            <p className="text-[10px] text-primary-dark font-black uppercase tracking-[0.25em] opacity-80">
                                🔐 VNIT SECURE PROTOCOL ACTIVE
                            </p>
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
