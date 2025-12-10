import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Settings, Save, Plus, Trash2, Phone, MapPin } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { adminService } from '../../services/adminService';

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

    if (loading) return <Layout role="admin"><div className="p-8 text-center">Loading settings...</div></Layout>;

    return (
        <Layout role="admin">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Configuration</h1>
                    <p className="text-slate-600">Manage global app settings and resources.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* General Settings */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Settings className="w-5 h-5 text-indigo-600" />
                        General Preferences
                    </h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800">Anonymous Incident Reporting</p>
                            <p className="text-sm text-slate-500">Allow students to report incidents without revealing identity.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.allowAnonymousReporting}
                                onChange={e => setSettings({ ...settings, allowAnonymousReporting: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div>
                        <label className="block font-medium text-slate-800 mb-1">Safe Walk Timeout (Minutes)</label>
                        <p className="text-sm text-slate-500 mb-3">Time before an alert is triggered if a student doesn't reach destination.</p>
                        <input
                            type="number"
                            min="5"
                            max="60"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={settings.safeWalkTimeoutMinutes}
                            onChange={e => setSettings({ ...settings, safeWalkTimeoutMinutes: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                {/* Emergency Contacts */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Phone className="w-5 h-5 text-red-600" />
                        Emergency Contacts
                    </h2>

                    <div className="space-y-3">
                        {settings.emergencyContacts.map((contact, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="font-bold text-slate-800">{contact.name}</p>
                                    <p className="text-sm text-slate-600">{contact.phone}</p>
                                </div>
                                <button onClick={() => removeContact(index)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Name (e.g. Fire Station)"
                            className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none"
                            value={newContact.name}
                            onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            className="w-32 p-2 border border-slate-300 rounded-lg text-sm outline-none"
                            value={newContact.phone}
                            onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                        />
                        <button
                            onClick={addContact}
                            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Hostel Management */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                        Manage Hostels
                    </h2>

                    <div className="flex flex-wrap gap-2">
                        {settings.hostels.map(hostel => (
                            <div key={hostel} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-2">
                                <span className="font-medium">{hostel}</span>
                                <button onClick={() => removeHostel(hostel)} className="hover:text-emerald-900">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New Hostel Name"
                            className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none"
                            value={newHostel}
                            onChange={e => setNewHostel(e.target.value)}
                        />
                        <button
                            onClick={addHostel}
                            className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
