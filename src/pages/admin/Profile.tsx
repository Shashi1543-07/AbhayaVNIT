import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { adminNavItems } from '../../lib/navItems';
import { User, Shield, Info, ChevronRight, Phone, Save, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { containerStagger, cardVariant } from '../../lib/animations';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { adminService } from '../../services/adminService';

export default function AdminProfile() {
    const { user, profile } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings State - Only keeping emergency contacts
    const [settings, setSettings] = useState({
        emergencyContacts: [
            { name: 'Campus Security', phone: '1234567890' },
            { name: 'Ambulance', phone: '102' },
            { name: 'Women Helpline', phone: '1091' }
        ]
    });

    const [newContact, setNewContact] = useState({ name: '', phone: '' });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'system_settings', 'config'));
                if (docSnap.exists()) {
                    // Only merge emergency contacts, ignore other old settings
                    const data = docSnap.data();
                    if (data.emergencyContacts) {
                        setSettings(prev => ({ ...prev, emergencyContacts: data.emergencyContacts }));
                    }
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
            // We do a merge to not overwrite other potential settings if they exist (though we are deprecating them)
            // ideally we just save what we manage here.
            await setDoc(doc(db, 'system_settings', 'config'), {
                emergencyContacts: settings.emergencyContacts,
                updatedAt: serverTimestamp()
            }, { merge: true });

            await adminService.logAction('Update Settings', 'System Config', 'Updated emergency contacts');
            alert('Contacts saved successfully!');
        } catch (error) {
            console.error("Error saving settings:", error);
            alert('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const addContact = () => {
        if (newContact.name && newContact.phone) {
            const updatedContacts = [...settings.emergencyContacts, newContact];
            setSettings({ ...settings, emergencyContacts: updatedContacts });
            setNewContact({ name: '', phone: '' });
        }
    };

    const removeContact = (index: number) => {
        const updated = [...settings.emergencyContacts];
        updated.splice(index, 1);
        setSettings({ ...settings, emergencyContacts: updated });
    };

    return (
        <MobileWrapper>
            <TopHeader title="Admin Profile" showBackButton={true} />
            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Profile Header */}
                <motion.div variants={cardVariant} className="flex flex-col items-center justify-center py-8">
                    <div className="w-32 h-32 bg-white/5 backdrop-blur-3xl rounded-full flex items-center justify-center mb-5 border border-white/10 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#CF9E1B]/20 via-transparent to-transparent rounded-full opacity-50" />
                        <User className="w-14 h-14 text-[#D4AF37] relative z-10" strokeWidth={2.5} />
                        <div className="absolute bottom-1 right-1 w-9 h-9 bg-red-500 rounded-full flex items-center justify-center border-4 border-[#121212] shadow-lg">
                            <Shield className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white font-heading tracking-tight text-center">{profile?.name || 'Administrator'}</h2>
                    <p className="text-[#D4AF37] text-sm font-bold mt-1">@{profile?.username || 'admin'}</p>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-red-500/20">
                            System Administrator
                        </span>
                    </div>
                </motion.div>

                {/* Email Info */}
                <motion.div variants={cardVariant} className="glass rounded-[2rem] shadow-2xl overflow-hidden mb-8 border border-white/5 bg-[#1a1a1a]/40">
                    <div className="p-5 border-b border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20 shrink-0">
                            <User className="w-5 h-5 text-[#D4AF37]" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Email Address</p>
                            <p className="text-sm font-semibold text-zinc-200 truncate font-heading">{user?.email || 'N/A'}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Emergency Contacts Management */}
                <motion.div variants={cardVariant} className="glass rounded-[2rem] shadow-2xl overflow-hidden mb-8 border border-white/5 bg-[#1a1a1a]/40 p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <Phone className="w-4 h-4 text-red-500" />
                            Emergency Contacts
                        </h3>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all disabled:opacity-50 uppercase tracking-wider flex items-center gap-1"
                        >
                            <Save className="w-3 h-3" />
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center text-zinc-500 text-xs py-4">Loading contacts...</div>
                        ) : (
                            settings.emergencyContacts.map((contact, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10 group hover:border-[#D4AF37]/30 transition-colors">
                                    <div>
                                        <p className="font-bold text-white text-xs group-hover:text-[#D4AF37] transition-colors uppercase tracking-wide">{contact.name}</p>
                                        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{contact.phone}</p>
                                    </div>
                                    <button onClick={() => removeContact(index)} className="text-zinc-500 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <input
                            type="text"
                            placeholder="Name"
                            className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50"
                            value={newContact.name}
                            onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            className="w-24 p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50"
                            value={newContact.phone}
                            onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                        />
                        <button
                            onClick={addContact}
                            className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 p-3 rounded-xl hover:bg-[#D4AF37]/20 transition-all shadow-sm flex-shrink-0"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>

                {/* About App Link */}
                <motion.div variants={cardVariant} className="mb-24">
                    <div
                        onClick={() => navigate('/about')}
                        className="glass rounded-[2rem] p-4 flex items-center justify-between border border-white/5 bg-[#1a1a1a]/40 hover:bg-[#1a1a1a]/60 transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                <Info className="w-5 h-5 text-zinc-400 group-hover:text-[#D4AF37] transition-colors" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">About App</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                    </div>
                </motion.div>
            </motion.main>
            <BottomNav items={adminNavItems} />
        </MobileWrapper>
    );
}
