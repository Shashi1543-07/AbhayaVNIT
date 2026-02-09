import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import TopHeader from '../../components/layout/TopHeader';
import { chatService } from '../../services/chatService';
import type { Conversation } from '../../services/chatService';
import { userService } from '../../services/userService';
import type { UserProfile } from '../../services/userService';
import { useAuthStore } from '../../context/authStore';
import { MessageSquare, Shield, Plus, User as UserIcon, Search, ArrowLeft, Users, GraduationCap, ChevronDown } from 'lucide-react';
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

    // Categorized Contacts
    const [wardensList, setWardensList] = useState<UserProfile[]>([]);
    const [securityList, setSecurityList] = useState<UserProfile[]>([]);
    const [studentList, setStudentList] = useState<UserProfile[]>([]); // For Wardens/Security to msg students
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Expanded Sections State
    const [expandedSections, setExpandedSections] = useState({
        wardens: true,
        security: true,
        students: false
    });

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
        setWardensList([]);
        setSecurityList([]);
        setStudentList([]);

        try {
            // 1. Fetch Staff (Wardens & Security)
            const allStaff = await userService.getStaff();
            // Robust hostel key extraction
            const myHostelRaw = profile?.hostelId || (profile as any)?.hostel || (profile as any)?.hostelName || '';
            const myHostel = myHostelRaw.toString().toLowerCase().trim();

            console.log("Chat Debug - My Hostel:", myHostel);

            if (role === 'student') {
                // Wardens: All users with role 'warden'
                const allWardens = allStaff.filter(s => s.role?.toLowerCase() === 'warden');
                setWardensList(allWardens.sort((a, b) => a.name.localeCompare(b.name)));

                // Security: All security personnel
                const allSecurity = allStaff.filter(s => s.role?.toLowerCase() === 'security');
                setSecurityList(allSecurity.sort((a, b) => a.name.localeCompare(b.name)));

            } else if (role === 'warden') {
                // Warden View: All Security + My Students
                const allSecurity = allStaff.filter(s => s.role?.toLowerCase() === 'security');
                setSecurityList(allSecurity.sort((a, b) => a.name.localeCompare(b.name)));

                const myStudents = await userService.getStudentsByHostel(myHostel || '');
                setStudentList(myStudents.map(s => ({
                    uid: s.id,
                    name: s.displayName,
                    role: 'student' as const,
                    roomNo: s.roomNo,
                    hostelId: s.hostelId,
                    phoneNumber: s.phone
                })).sort((a, b) => a.name.localeCompare(b.name)));

            } else if (role === 'security') {
                // Security View: All Staff (excluding self) + All Students
                const otherStaff = allStaff.filter(s => s.uid !== user?.uid);

                // Split other staff into Wardens and Security
                setWardensList(otherStaff.filter(s => s.role?.toLowerCase() === 'warden').sort((a, b) => a.name.localeCompare(b.name)));
                setSecurityList(otherStaff.filter(s => s.role?.toLowerCase() === 'security').sort((a, b) => a.name.localeCompare(b.name)));

                const allStudents = await userService.getAllStudents();
                setStudentList(allStudents.map(s => ({
                    uid: s.id,
                    name: s.displayName,
                    role: 'student' as const,
                    roomNo: s.roomNo,
                    hostelId: s.hostelId,
                    phoneNumber: s.phone
                })).sort((a, b) => a.name.localeCompare(b.name)));
            }

        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setLoadingStaff(false);
        }
    };

    const startChatWithUser = async (targetUser: UserProfile) => {
        if (!user || !profile) {
            alert("Authentication profile not found. Please try logging in again.");
            return;
        }

        if (!targetUser.uid) {
            alert("Contact profile is incomplete. Cannot start chat.");
            return;
        }

        try {
            const participants = [
                {
                    uid: user.uid,
                    name: profile.name || (profile as any).displayName || 'User',
                    role: role || 'student'
                },
                {
                    uid: targetUser.uid,
                    name: targetUser.name || 'Staff',
                    role: targetUser.role
                }
            ];

            const id = await chatService.createConversation('manual', participants);

            setShowNewChatModal(false);
            setSelectedChatId(id);
        } catch (error: any) {
            console.error("Failed to start chat:", error);
            alert(`Technical Error: ${error.message || "Could not bridge communications."}`);
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
            if (otherId) {
                // If we have detailed logic to show sub-role here, we could, but basic role for now
                return chat.participantRoles[otherId];
            }
        }
        return '';
    };

    const getNavItems = () => {
        if (role === 'warden') return wardenNavItems;
        if (role === 'security') return securityNavItems;
        return undefined;
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Helper to render contact list section
    const renderContactSection = (
        sectionKey: keyof typeof expandedSections,
        title: string,
        contacts: UserProfile[],
        icon: any,
        colorClass: string
    ) => {
        if (contacts.length === 0) return null;

        const filtered = contacts.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.subRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.roomNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c as any).hostel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.hostelId?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filtered.length === 0 && searchTerm) return null;

        const isExpanded = expandedSections[sectionKey] || !!searchTerm;

        return (
            <div className="mb-4 animate-in slide-in-from-bottom-2 duration-300">
                <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between py-3 px-4 bg-white/[0.03] hover:bg-white/[0.08] rounded-[20px] transition-all mb-2 group border border-white/5 active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10`}>
                            {icon}
                        </div>
                        <h3 className="text-[13px] font-black text-white/90 uppercase tracking-[0.15em] flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                            {title} <span className="text-zinc-600 text-[10px] ml-1 font-bold">({filtered.length})</span>
                        </h3>
                    </div>
                    <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className={`w-5 h-5 ${isExpanded ? 'text-[#D4AF37]' : 'text-zinc-600'}`} />
                    </div>
                </button>

                {isExpanded && (
                    <div className="space-y-2.5 mt-3 px-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
                        {filtered.map(item => (
                            <button
                                key={item.uid}
                                onClick={() => startChatWithUser(item)}
                                className="w-full flex items-center gap-4 p-4 bg-white/5 backdrop-blur-xl rounded-[24px] hover:bg-white/10 text-left transition-all border border-white/10 active:scale-95 group shadow-lg ring-1 ring-white/5 hover:ring-[#D4AF37]/20"
                            >
                                <div className={`w-12 h-12 ${colorClass} rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white/10`}>
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-white text-[15px] truncate tracking-tight group-hover:text-[#D4AF37] transition-colors font-heading uppercase tracking-[0.05em]">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {item.role === 'security' && item.subRole ? (
                                            <span className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/20">
                                                {item.subRole}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{item.role}</span>
                                        )}

                                        {(item.hostelId || (item as any).hostel) && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                <span className="text-[10px] text-zinc-500 font-bold truncate">
                                                    {item.hostelId || (item as any).hostel}
                                                </span>
                                            </>
                                        )}

                                        {item.roomNo && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Room {item.roomNo}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <MobileWrapper>
            <TopHeader title="Messages" showBackButton={true} />

            {/* Background Gradient - Dark & Tactical */}
            <div className="absolute inset-0 bg-black z-0 opacity-100" />

            <div className="relative px-4 pt-nav-safe pb-nav-safe z-10">
                <div className="relative group mb-6">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={listSearchTerm}
                        onChange={(e) => setListSearchTerm(e.target.value)}
                        className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] py-4.5 pl-14 pr-6 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/10 transition-all font-bold shadow-2xl font-heading"
                    />
                </div>

                <button
                    onClick={handleOpenNewChat}
                    className="w-full bg-white/5 hover:bg-white/10 text-[#D4AF37] font-black py-4 rounded-[24px] flex items-center justify-center gap-2 transition-all border border-[#D4AF37]/20 shadow-xl active:scale-95 mb-6 font-heading tracking-tight"
                >
                    <div className="bg-[#D4AF37]/10 p-1.5 rounded-xl">
                        <Plus className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    Start New Conversation
                </button>

                {/* Chat List - Highly Rounded & Glassy */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-6">Syncing Protocols...</p>
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
                                    className="group relative bg-black/40 backdrop-blur-2xl p-5 rounded-[28px] shadow-xl border border-white/5 flex items-center gap-4 hover:bg-black/60 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 overflow-hidden ring-1 ring-white/5 hover:ring-[#D4AF37]/20"
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 shrink-0
                                    ${chat.type === 'sos' ? 'bg-red-600/20 text-red-500' : 'bg-white/5 text-[#D4AF37]'}
                                `}>
                                        {chat.type === 'sos' ? <Shield className="w-7 h-7" /> : <UserIcon className="w-7 h-7" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-black text-white text-[17px] truncate group-hover:text-[#D4AF37] transition-colors tracking-tight font-heading">
                                                {getChatName(chat)}
                                            </h3>
                                            <span className="text-[10px] text-zinc-500 font-black whitespace-nowrap ml-2 font-heading">
                                                {chat.lastMessageAt?.seconds ? new Date(chat.lastMessageAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm text-zinc-500 truncate flex-1 font-bold">
                                                {chat.lastMessage || 'Channel Established'}
                                            </p>
                                            <span className="text-[9px] bg-[#D4AF37]/5 text-[#D4AF37] px-2 py-1 rounded-lg uppercase font-black tracking-widest font-heading border border-[#D4AF37]/10">
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

            {/* New Chat Modal - Full Screen Native Page */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-[120] flex flex-col font-sans bg-black">
                    {/* Consistent Global Background */}
                    <div className="absolute inset-0 pointer-events-none bg-black" />

                    {/* Standard Full Width Header - Exact Match to TopHeader */}
                    <div className="relative z-10 px-6 pb-6 pt-6 flex items-end justify-between safe-top">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowNewChatModal(false)}
                                className="p-2.5 -ml-2 rounded-xl bg-white/5 backdrop-blur-md hover:bg-white/10 text-zinc-400 transition-all shadow-lg border border-white/10 active:scale-90"
                            >
                                <ArrowLeft className="w-5 h-5" strokeWidth={3} />
                            </button>
                            <div>
                                <h1 className="text-xl font-heading font-black text-[#D4AF37] tracking-tight uppercase tracking-[0.2em]">Start Chat</h1>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar Container */}
                    <div className="px-5 pb-4 z-10">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name, role or hostel..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-[28px] py-4 pl-12 pr-4 text-[15px] font-black text-white placeholder:text-zinc-700 focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/10 transition-all backdrop-blur-md font-heading"
                            />
                        </div>
                    </div>

                    {/* List Content */}
                    <div className="flex-1 overflow-y-auto px-4 pb-20 z-10 custom-scrollbar">
                        {loadingStaff ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
                            </div>
                        ) : (wardensList.length === 0 && securityList.length === 0 && studentList.length === 0) ? (
                            <div className="py-20 text-center opacity-60">
                                <div className="w-20 h-20 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-3xl">
                                    <UserIcon className="w-10 h-10 text-zinc-600" />
                                </div>
                                <p className="font-black text-white uppercase tracking-widest text-[10px]">No contacts found</p>
                            </div>
                        ) : (
                            <>
                                {renderContactSection("wardens", "Hostel Wardens", wardensList, <GraduationCap className="w-4 h-4" />, "bg-emerald-500/10 text-emerald-500")}
                                {renderContactSection("security", "Campus Security & Support", securityList, <Shield className="w-4 h-4" />, "bg-amber-500/10 text-amber-500")}
                                {renderContactSection("students", "Students", studentList, <Users className="w-4 h-4" />, "bg-blue-500/10 text-blue-500")}
                            </>
                        )}
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
