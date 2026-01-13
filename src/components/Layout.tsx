import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import { auth } from '../lib/firebase';
import { Menu, X, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
    children: React.ReactNode;
    role: 'student' | 'warden' | 'security' | 'admin';
}

export default function Layout({ children, role }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await auth.signOut();
        navigate(`/login?role=${role || 'student'}`);
    };

    // For Admin, we now use a mobile-first bottom nav approach similar to other roles
    // if (role === 'admin') block removed as pages now handle their own layout

    // Legacy Sidebar Layout for other roles (if they still use this Layout component)
    // Note: Student, Warden, Security seem to use MobileWrapper + specific BottomNavs directly in their pages.
    // This might be fallback or for desktop views of those roles if implemented.

    return (
        <div className="min-h-screen bg-transparent flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-md border-r border-white/20 transform transition-transform duration-200 ease-in-out lg:transform-none shadow-lg",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h1 className="text-xl font-bold text-indigo-600">VNIT Safety</h1>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
                            <X className="w-6 h-6 text-slate-500" />
                        </button>
                    </div>

                    <div className="flex-1 p-4 flex items-center justify-center text-slate-400 text-sm">
                        Sidebar navigation is being deprecated in favor of role-specific mobile dashboards.
                    </div>

                    <div className="p-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 px-4 py-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                {user?.displayName?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{user?.displayName || 'User'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white/80 backdrop-blur-md border-b border-white/20 fixed top-0 left-0 right-0 z-30 shadow-sm h-20 pt-6">
                    <div className="px-4 py-3 flex items-center justify-between h-full">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 lg:hidden">
                                <Menu className="w-6 h-6 text-slate-600" />
                            </button>
                            <span className="font-semibold text-slate-800 lg:hidden">VNIT Safety</span>
                        </div>

                        <div className="flex items-center gap-4 ml-auto">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="hidden sm:inline font-medium">Logout</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-8 pt-20 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
