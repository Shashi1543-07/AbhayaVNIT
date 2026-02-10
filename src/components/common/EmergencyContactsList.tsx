import { useState, useEffect } from 'react';
import { Phone, AlertTriangle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface EmergencyContact {
    name: string;
    phone: string;
}

export default function EmergencyContactsList() {
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'system_settings', 'config'));
                if (docSnap.exists() && docSnap.data().emergencyContacts) {
                    setContacts(docSnap.data().emergencyContacts);
                }
            } catch (error) {
                console.error("Error fetching emergency contacts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, []);

    if (loading) return (
        <div className="glass rounded-[2rem] p-6 border border-white/5 bg-[#1a1a1a]/40 animate-pulse">
            <div className="h-5 w-1/3 bg-white/10 rounded mb-4"></div>
            <div className="space-y-3">
                <div className="h-12 bg-white/5 rounded-xl"></div>
                <div className="h-12 bg-white/5 rounded-xl"></div>
            </div>
        </div>
    );

    if (contacts.length === 0) return null;

    return (
        <div className="glass rounded-[2rem] p-6 border border-red-500/20 bg-[#1a1a1a]/40 relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[50px] pointer-events-none" />

            <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2 font-heading">
                <AlertTriangle className="w-4 h-4" />
                Emergency Contacts
            </h3>

            <div className="space-y-3 relative z-10">
                {contacts.map((contact, index) => (
                    <a
                        key={index}
                        href={`tel:${contact.phone}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 transition-all group/item active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover/item:bg-red-500 group-hover/item:text-white transition-all">
                                <Phone className="w-5 h-5 text-red-500 group-hover/item:text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-300 uppercase tracking-wide group-hover/item:text-white transition-colors">
                                    {contact.name}
                                </p>
                                <p className="text-[10px] font-mono text-zinc-500 group-hover/item:text-red-400 transition-colors">
                                    {contact.phone}
                                </p>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
