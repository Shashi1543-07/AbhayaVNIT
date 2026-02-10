import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { Info, Lock, ScrollText, Heart, ChevronRight } from 'lucide-react';

export default function About() {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const sections = [
        { id: 'app-info', icon: Info, title: 'App Information', color: 'text-[#D4AF37]' },
        { id: 'privacy', icon: Lock, title: 'Privacy Policy', color: 'text-emerald-400' },
        { id: 'terms', icon: ScrollText, title: 'Terms & Conditions', color: 'text-blue-400' },
        { id: 'credits', icon: Heart, title: 'Credits', color: 'text-pink-400' },
    ];

    return (
        <MobileWrapper>
            <TopHeader title="About Safety App" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-24"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* App Hero Section */}
                <motion.div variants={cardVariant} className="flex flex-col items-center justify-center py-10">
                    <div className="w-32 h-32 rounded-3xl flex items-center justify-center mb-6 relative overflow-hidden group">
                        <img src="/logo.png" alt="Abhaya Connect Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-4xl font-black text-white font-heading tracking-tight text-center leading-none mb-2">ABHAYA CONNECT</h1>
                    <h2 className="text-lg font-bold text-zinc-400 font-heading tracking-wide text-center leading-none">VNIT Safety App</h2>
                    <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.3em] mt-4">Version 1.0.0 • Stable</p>
                </motion.div>

                {/* Table of Contents - Quick Navigation */}
                <motion.div variants={cardVariant} className="glass rounded-[2rem] p-6 mb-8 border border-white/5 bg-[#1a1a1a]/40 shadow-xl">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 ml-1">Quick Navigation</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group border border-transparent hover:border-white/10 active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl bg-zinc-900 group-hover:scale-110 transition-transform`}>
                                        <section.icon className={`w-5 h-5 ${section.color}`} />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{section.title}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Content Sections */}
                <div className="space-y-12">

                    {/* App Information Section */}
                    <section id="app-info" className="space-y-6">
                        <motion.div variants={cardVariant}>
                            <div className="flex items-center gap-3 mb-4 ml-1">
                                <Info className="w-5 h-5 text-[#D4AF37]" strokeWidth={2.5} />
                                <h3 className="text-lg font-black text-white uppercase tracking-tight font-heading">App Information</h3>
                            </div>
                            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 bg-[#1a1a1a]/40">
                                <div>
                                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                                        The <span className="text-[#D4AF37] font-bold">VNIT Girls' Safety App</span> is a real-time campus safety support system developed for the students of <span className="text-white font-bold">Visvesvaraya National Institute of Technology (VNIT), Nagpur</span>.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">Key Features</h4>
                                    <ul className="space-y-3">
                                        {[
                                            'Emergency SOS triggering with live location sharing',
                                            'Safe Walk monitoring during late movements',
                                            'Secure audio/video calling with campus security',
                                            'Role-based dashboards (Student, Security, Warden, Admin)',
                                            'Privacy-focused event-based tracking'
                                        ].map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3 text-xs text-zinc-400 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 shadow-[0_0_5px_rgba(212,175,55,0.5)]" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Emergency Disclaimer</h4>
                                    <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                                        This application is a support tool to assist campus authorities. It does not guarantee prevention of incidents. Users should always follow official campus safety protocols.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </section>

                    {/* Privacy Policy Section */}
                    <section id="privacy" className="space-y-6">
                        <motion.div variants={cardVariant}>
                            <div className="flex items-center gap-3 mb-4 ml-1">
                                <Lock className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
                                <h3 className="text-lg font-black text-white uppercase tracking-tight font-heading">Privacy Policy</h3>
                            </div>
                            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 bg-[#1a1a1a]/40">
                                <div className="space-y-4">
                                    {[
                                        { title: 'Data Collection', desc: 'We collect only necessary info: Name, Role, College ID, and Location (only during events).' },
                                        { title: 'Location Usage', desc: 'Tracking is ONLY active during SOS or Safe Walk. No background tracking occurs.' },
                                        { title: 'Data Sharing', desc: 'Data is shared ONLY with authorized campus authorities. Never sold or shared externally.' },
                                        { title: 'Data Security', desc: 'We use industry-standard encryption and access controls to protect your data.' }
                                    ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                            <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">{item.title}</p>
                                            <p className="text-xs text-zinc-400 font-medium leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </section>

                    {/* Terms & Conditions Section */}
                    <section id="terms" className="space-y-6">
                        <motion.div variants={cardVariant}>
                            <div className="flex items-center gap-3 mb-4 ml-1">
                                <ScrollText className="w-5 h-5 text-blue-400" strokeWidth={2.5} />
                                <h3 className="text-lg font-black text-white uppercase tracking-tight font-heading">Terms & Conditions</h3>
                            </div>
                            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 bg-[#1a1a1a]/40">
                                <div className="space-y-4">
                                    {[
                                        { title: 'Authorized Use', desc: 'Restricted to authorized VNIT Nagpur users. Unauthorized use is prohibited.' },
                                        { title: 'Usage Responsibility', desc: 'SOS and Safe Walk must be used responsibly. False use may lead to disciplinary action.' },
                                        { title: 'Account Security', desc: 'Users are responsible for maintaining the confidentiality of their login credentials.' },
                                        { title: 'Governing Authority', desc: 'These terms are governed by the policies and regulations of VNIT Nagpur.' }
                                    ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                            <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest">{item.title}</p>
                                            <p className="text-xs text-zinc-400 font-medium leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </section>

                    {/* Credits Section */}
                    <section id="credits" className="space-y-6">
                        <motion.div variants={cardVariant}>
                            <div className="flex items-center gap-3 mb-4 ml-1">
                                <Heart className="w-5 h-5 text-pink-400" strokeWidth={2.5} />
                                <h3 className="text-lg font-black text-white uppercase tracking-tight font-heading">Credits & Rights</h3>
                            </div>
                            <div className="glass rounded-[2rem] p-8 border border-white/5 bg-gradient-to-br from-indigo-500/5 via-transparent to-pink-500/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />

                                <div className="relative z-10 space-y-8">
                                    <div className="text-center space-y-8">

                                        {/* Student Council */}
                                        <div>
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Presented by</p>
                                            <h4 className="text-xl font-black text-[#D4AF37] font-heading mt-2">Student Council 2025-26</h4>
                                        </div>

                                        {/* Developer */}
                                        <div>
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Designed & Developed by</p>
                                            <h4 className="text-sm font-bold text-white font-heading mt-2">Shashi Shekhar Mishra</h4>
                                        </div>

                                        {/* Additional Credits */}
                                        <div className="space-y-4 border-t border-white/5 pt-6">
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Technical Affairs Secretary (VNIT)</p>
                                                <h5 className="text-sm font-bold text-zinc-300">Shreyansh Mishra</h5>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Initiated by Ladies Representative</p>
                                                <h5 className="text-sm font-bold text-zinc-300">Manasi Rupali Bapusaheb Pawar</h5>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 text-center space-y-4">
                                        <p className="text-[11px] text-zinc-400 font-medium">
                                            © 2026 VNIT Nagpur. All rights reserved.
                                        </p>
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Firebase</span>
                                            </div>
                                            <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">OpenStreetMap</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </section>

                </div>

                {/* Bottom Institution Footer */}
                <motion.div variants={cardVariant} className="mt-16 text-center space-y-2 opacity-50">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">Visvesvaraya National Institute of Technology</p>
                    <p className="text-[8px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Nagpur, MH • 440010</p>
                </motion.div>
            </motion.main>
        </MobileWrapper>
    );
}
