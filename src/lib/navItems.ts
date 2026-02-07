import { Home, FileText, Megaphone, Map as MapIcon, User, Bell, MessageCircle, Newspaper } from 'lucide-react';

export const studentNavItems = [
    { icon: Home, label: 'Home', path: '/student/dashboard' },
    { icon: MapIcon, label: 'Track', path: '/student/safewalk' },
    { icon: MessageCircle, label: 'Messages', path: '/student/messages' },
    { icon: FileText, label: 'Reports', path: '/student/reports' },
    { icon: User, label: 'Profile', path: '/student/profile' },
];

export const wardenNavItems = [
    { icon: Home, label: 'Dashboard', path: '/warden/dashboard' },
    { icon: MessageCircle, label: 'Messages', path: '/warden/messages' },
    { icon: FileText, label: 'Reports', path: '/warden/reports' },
    { icon: Megaphone, label: 'Broadcast', path: '/warden/broadcasts' },
    { icon: User, label: 'Profile', path: '/warden/profile' },
];

export const securityNavItems = [
    { icon: Bell, label: 'Dashboard', path: '/security/dashboard' },
    { icon: MessageCircle, label: 'Messages', path: '/security/messages' },
    { icon: Newspaper, label: 'Feed', path: '/feed' },
    { icon: Megaphone, label: 'Broadcast', path: '/security/broadcasts' },
    { icon: User, label: 'Profile', path: '/security/profile' },
];
export const adminNavItems = [
    { icon: Home, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: User, label: 'Users', path: '/admin/users' },
    { icon: Newspaper, label: 'Feed', path: '/feed' },
    { icon: Megaphone, label: 'Broadcast', path: '/admin/broadcasts' },
    { icon: FileText, label: 'Logs', path: '/admin/logs' },
];
