import { Home, AlertTriangle, FileText, Megaphone, Shield, Map as MapIcon, User, Bell, MessageCircle } from 'lucide-react';

export const wardenNavItems = [
    { icon: Home, label: 'Dashboard', path: '/warden/dashboard' },
    { icon: AlertTriangle, label: 'SOS', path: '/warden/sos' },
    { icon: MessageCircle, label: 'Messages', path: '/warden/messages' },
    { icon: FileText, label: 'Reports', path: '/warden/reports' },
    { icon: Megaphone, label: 'Broadcast', path: '/warden/broadcasts' },
];

export const securityNavItems = [
    { icon: Bell, label: 'Dashboard', path: '/security/dashboard' },
    { icon: MessageCircle, label: 'Messages', path: '/security/messages' },
    { icon: MapIcon, label: 'Map', path: '/security/map' },
    { icon: Shield, label: 'Patrol', path: '/security/patrol' },
    { icon: User, label: 'Profile', path: '/security/profile' },
];
