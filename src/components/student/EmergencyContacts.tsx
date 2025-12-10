import { Phone, ArrowRight } from 'lucide-react';

export default function EmergencyContacts() {
    return (
        <div className="bg-surface rounded-2xl border border-surface shadow-sm p-6">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-emergency" />
                Emergency & Resources
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-emergency/10 rounded-xl border border-emergency/20">
                        <span className="font-bold text-emergency">Security Control</span>
                        <a href="tel:0712-222222" className="text-emergency font-mono font-bold hover:underline">0712-222222</a>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl border border-primary-100">
                        <span className="font-bold text-primary-dark">Women's Helpline</span>
                        <a href="tel:1091" className="text-primary font-mono font-bold hover:underline">1091</a>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-xl border border-secondary-100">
                        <span className="font-bold text-secondary-dark">Warden (H6)</span>
                        <a href="tel:+919876543210" className="text-secondary font-mono font-bold hover:underline">+91 98765 43210</a>
                    </div>
                </div>

                <div className="space-y-3">
                    <button className="w-full p-3 bg-background rounded-xl border border-surface text-primary font-medium hover:bg-primary-50 flex justify-between items-center transition-colors">
                        Counselor Appointment
                        <ArrowRight className="w-4 h-4 text-muted" />
                    </button>
                    <button className="w-full p-3 bg-background rounded-xl border border-surface text-primary font-medium hover:bg-primary-50 flex justify-between items-center transition-colors">
                        Campus Safety Guide
                        <ArrowRight className="w-4 h-4 text-muted" />
                    </button>
                    <button className="w-full p-3 bg-background rounded-xl border border-surface text-primary font-medium hover:bg-primary-50 flex justify-between items-center transition-colors">
                        Report Maintenance Issue
                        <ArrowRight className="w-4 h-4 text-muted" />
                    </button>
                </div>
            </div>
        </div>
    );
}
