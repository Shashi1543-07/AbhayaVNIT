import { useState, useEffect } from 'react';
import { Fingerprint, CheckCircle, Trash2 } from 'lucide-react';
import { biometricService } from '../../services/biometricService';

interface BiometricSettingsProps {
    role: string;
}

export default function BiometricSettings({ role }: BiometricSettingsProps) {
    const [isAvailable, setIsAvailable] = useState(false);
    const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkBiometricStatus = async () => {
            setLoading(true);
            const available = await biometricService.isAvailable();
            setIsAvailable(available);

            if (available) {
                // Check if credentials exist for this specific role
                const exists = await biometricService.hasCredentials(role);
                setHasSavedCredentials(exists);
            }
            setLoading(false);
        };
        checkBiometricStatus();
    }, [role]);

    const handleRemoveBiometric = async () => {
        if (window.confirm('Are you sure you want to remove biometric login for this device? You will need to login manually next time.')) {
            await biometricService.deleteCredentials(role);
            setHasSavedCredentials(false);
            alert('Biometric login removed for this device.');
        }
    };

    if (!isAvailable || loading) return null;

    return (
        <div className="glass rounded-[2rem] p-5 border border-white/5 bg-[#1a1a1a]/40 mb-4 transition-all hover:bg-[#1a1a1a]/60">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-[#D4AF37]" />
                Device Authentication
            </h3>

            {hasSavedCredentials ? (
                <div>
                    <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <div>
                            <p className="text-xs font-bold text-emerald-400">Biometric Login Enabled</p>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-tight">Active for {role} dashboard</p>
                        </div>
                    </div>

                    <button
                        onClick={handleRemoveBiometric}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest rounded-xl border border-red-500/20 transition-all active:scale-95"
                    >
                        <Trash2 className="w-4 h-4" />
                        Remove Biometric Login
                    </button>
                </div>
            ) : (
                <div className="text-center p-4">
                    <p className="text-xs font-bold text-zinc-400">Biometric login is not active.</p>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Log out and log back in to enable it.</p>
                </div>
            )}
        </div>
    );
}
