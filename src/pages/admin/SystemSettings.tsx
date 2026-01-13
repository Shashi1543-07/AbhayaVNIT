import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import { adminNavItems } from '../../lib/navItems';
import { Settings, Save, Plus, Trash2, Phone, MapPin } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { adminService } from '../../services/adminService';

import TopHeader from '../../components/layout/TopHeader';

export default function SystemSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings State
    const [settings, setSettings] = useState({
        allowAnonymousReporting: true,
        safeWalkTimeoutMinutes: 15,
        emergencyContacts: [
            { name: 'Campus Security', phone: '1234567890' },
            { name: 'Ambulance', phone: '102' },
            { name: 'Women Helpline', phone: '1091' }
        ],
        hostels: ['Ganga', 'Yamuna', 'Saraswati']
    });

    // New Item State
    const [newContact, setNewContact] = useState({ name: '', phone: '' });
    const [newHostel, setNewHostel] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'system_settings', 'config'));
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as any);
                } else {
                    // Initialize default settings if not exists
                    await setDoc(doc(db, 'system_settings', 'config'), settings);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'system_settings', 'config'), {
                ...settings,
                updatedAt: serverTimestamp()
            });
            await adminService.logAction('Update Settings', 'System Config', 'Updated system configuration');
            alert('Settings saved successfully!');
        } catch (error) {
            console.error("Error saving settings:", error);
            alert('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const addContact = () => {
        if (newContact.name && newContact.phone) {
            setSettings({
                ...settings,
                emergencyContacts: [...settings.emergencyContacts, newContact]
            });
            setNewContact({ name: '', phone: '' });
        }
    };

    const removeContact = (index: number) => {
        const updated = [...settings.emergencyContacts];
        updated.splice(index, 1);
        setSettings({ ...settings, emergencyContacts: updated });
    };

    const addHostel = () => {
        if (newHostel && !settings.hostels.includes(newHostel)) {
            setSettings({
                ...settings,
                hostels: [...settings.hostels, newHostel]
            });
            setNewHostel('');
        }
    };

    const removeHostel = (hostel: string) => {
        setSettings({
            ...settings,
            hostels: settings.hostels.filter(h => h !== hostel)
        });
    };

    if (loading) return (
        <MobileWrapper>
            <div className="flex items-center justify-center min-h-screen text-[#D4AF37] font-bold uppercase tracking-widest text-xs">Loading settings...</div>
        </MobileWrapper>
    );

    return (
        <MobileWrapper>
            <TopHeader title="System Configuration" showBackButton={true} />

            <div className="mb-8 flex justify-between items-center pt-nav-safe pb-nav-safe px-4">
                <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wide">Manage global app settings and resources.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black px-6 py-3 rounded-xl font-black uppercase tracking-wider text-xs hover:shadow-lg hover:shadow-[#D4AF37]/20 hover:brightness-110 transition-all disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 pb-24">
                {/* General Settings */}
                <div className="glass-card bg-black/40 p-6 rounded-[24px] shadow-sm border border-white/10 space-y-6">
                    <h2 className="text-lg font-heading font-black text-white flex items-center gap-3 border-b border-white/10 pb-4 uppercase tracking-tight">
                        <div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                            <Settings className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                        General Preferences
                    </h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-white text-sm uppercase tracking-wide">Anonymous Reporting</p>
                            <p className="text-[10px] text-zinc-500 font-medium mt-1">Allow students to report incidents without revealing identity.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.allowAnonymousReporting}
                                onChange={e => setSettings({ ...settings, allowAnonymousReporting: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37] peer-checked:after:bg-black"></div>
                        </label>
                    </div>

                    <div>
                        <label className="block font-bold text-white text-sm uppercase tracking-wide mb-1">Safe Walk Timeout</label>
                        <p className="text-[10px] text-zinc-500 font-medium mb-3">Time in minutes before an alert is triggered if destination is not reached.</p>
                        <input
                            type="number"
                            min="5"
                            max="60"
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold"
                            value={settings.safeWalkTimeoutMinutes}
                            onChange={e => setSettings({ ...settings, safeWalkTimeoutMinutes: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                {/* Emergency Contacts */}
                <div className="glass-card bg-black/40 p-6 rounded-[24px] shadow-sm border border-white/10 space-y-6">
                    <h2 className="text-lg font-heading font-black text-white flex items-center gap-3 border-b border-white/10 pb-4 uppercase tracking-tight">
                        <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                            <Phone className="w-5 h-5 text-red-500" />
                        </div>
                        Emergency Contacts
                    </h2>

                    <div className="space-y-3">
                        {settings.emergencyContacts.map((contact, index) => (
                            <div key={index} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10 group hover:border-[#D4AF37]/30 transition-colors">
                                <div>
                                    <p className="font-bold text-white text-sm group-hover:text-[#D4AF37] transition-colors uppercase tracking-wide">{contact.name}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">{contact.phone}</p>
                                </div>
                                <button onClick={() => removeContact(index)} className="text-zinc-500 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Name (e.g. Fire Station)"
                            className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50"
                            value={newContact.name}
                            onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            className="w-32 p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50"
                            value={newContact.phone}
                            onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                        />
                        <button
                            onClick={addContact}
                            className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 p-3 rounded-xl hover:bg-[#D4AF37]/20 transition-all shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Hostel Management */}
                <div className="glass-card bg-black/40 p-6 rounded-[24px] shadow-sm border border-white/10 space-y-6">
                    <h2 className="text-lg font-heading font-black text-white flex items-center gap-3 border-b border-white/10 pb-4 uppercase tracking-tight">
                        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <MapPin className="w-5 h-5 text-emerald-500" />
                        </div>
                        Manage Hostels
                    </h2>

                    <div className="flex flex-wrap gap-2">
                        {settings.hostels.map(hostel => (
                            <div key={hostel} className="bg-emerald-500/10 backdrop-blur-sm text-emerald-500 px-4 py-2 rounded-xl flex items-center gap-2 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                                <span className="font-black text-xs uppercase tracking-wider">{hostel}</span>
                                <button onClick={() => removeHostel(hostel)} className="hover:text-emerald-300">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New Hostel Name"
                            className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50"
                            value={newHostel}
                            onChange={e => setNewHostel(e.target.value)}
                        />
                        <button
                            onClick={addHostel}
                            className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 p-3 rounded-xl hover:bg-[#D4AF37]/20 transition-all shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <BottomNav items={adminNavItems} />
        </MobileWrapper>
    );
}
