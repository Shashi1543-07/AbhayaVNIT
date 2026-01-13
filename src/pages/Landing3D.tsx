import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Points, PointMaterial } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function generateParticles(count: number, radius: number) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = radius * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    return positions;
}

function ParticleField(props: any) {
    const ref = useRef<any>(null);
    const sphere = useMemo(() => generateParticles(5000, 1.5), []);

    useFrame((_state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 10;
            ref.current.rotation.y -= delta / 15;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#D4AF37"
                    size={0.005}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.4}
                />
            </Points>
        </group>
    );
}

function Scene() {
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <ParticleField />
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </>
    );
}

export default function Landing3D() {
    return (
        <div
            className="relative w-full h-screen overflow-hidden bg-black"
            style={{
                background: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%)'
            }}
        >
            {/* 3D Background */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 1] }}>
                    <Scene />
                </Canvas>
            </div>

            {/* Overlay Content */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white px-4 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="text-center w-full max-w-6xl mx-auto pointer-events-auto flex flex-col items-center px-4"
                >
                    {/* VNIT Header - Full Width */}
                    <div className="w-full mb-4 md:mb-6">
                        <h3 className="text-sm md:text-lg lg:text-xl font-black tracking-[0.3em] md:tracking-[0.5em] leading-tight drop-shadow-2xl">
                            <span className="block font-serif italic text-white/40">Visvesvaraya</span>
                            <span className="block font-serif italic -mt-1 md:-mt-2 text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">National Institute of Technology</span>
                        </h3>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-1 md:gap-2 mb-3 md:mb-4 w-full">
                        <motion.div
                            animate={{ rotateY: 360 }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            className="flex-shrink-0"
                        >
                            <img
                                src="/logo.png"
                                alt="Abhaya Connect Logo"
                                className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 object-contain drop-shadow-[0_0_15px_rgba(26,124,204,0.6)]"
                            />
                        </motion.div>

                        <div className="flex flex-col items-center justify-center min-w-0">
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-white drop-shadow-2xl font-heading text-center">
                                ABHAYA <span className="text-[#D4AF37]">CONNECT</span>
                            </h1>
                            <h2 className="text-lg md:text-xl lg:text-2xl font-black text-[#D4AF37] font-hindi text-center mt-1 uppercase tracking-[0.2em] opacity-80">
                                अभया कनेक्ट
                            </h2>
                        </div>
                    </div>

                    <p className="text-sm md:text-base text-zinc-400 mb-6 md:mb-8 max-w-lg mx-auto leading-relaxed px-4 text-center font-bold uppercase tracking-widest opacity-60">
                        VNIT Smart Campus Security Protocol
                        <br className="hidden md:block" />
                        <span className="text-[#D4AF37] block mt-2">Secure • Connected • Instant</span>
                    </p>

                    <div className="flex flex-col gap-3 md:gap-4 w-full max-w-[320px] md:max-w-sm mx-auto">
                        <Link
                            to="/login?role=student"
                            className="group px-6 py-4 bg-white/5 backdrop-blur-3xl hover:bg-white/10 rounded-2xl transition-all flex flex-col items-center gap-0.5 text-center shadow-2xl border border-[#D4AF37]/20 active:scale-95"
                        >
                            <span className="font-black text-sm md:text-base text-[#D4AF37] uppercase tracking-widest">Student Portal</span>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter opacity-60">Authorize Access</span>
                        </Link>

                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                to="/login?role=warden"
                                className="group px-4 py-4 bg-white/5 backdrop-blur-3xl hover:bg-white/10 rounded-2xl transition-all flex flex-col items-center text-center shadow-2xl border border-[#D4AF37]/20 active:scale-95"
                            >
                                <span className="font-black text-[11px] text-[#D4AF37] uppercase tracking-widest">Warden</span>
                            </Link>
                            <Link
                                to="/login?role=security"
                                className="group px-4 py-4 bg-white/5 backdrop-blur-3xl hover:bg-white/10 rounded-2xl transition-all flex flex-col items-center text-center shadow-2xl border border-[#D4AF37]/20 active:scale-95"
                            >
                                <span className="font-black text-[11px] text-[#D4AF37] uppercase tracking-widest">Security</span>
                            </Link>
                        </div>

                        <Link
                            to="/login?role=admin"
                            className="group px-4 py-3 bg-transparent border border-white/5 hover:border-white/10 rounded-2xl transition-all flex items-center justify-center text-center active:scale-95"
                        >
                            <span className="font-black text-[9px] text-zinc-600 uppercase tracking-[0.3em] hover:text-zinc-400">System Command Center</span>
                        </Link>
                    </div>
                </motion.div>


            </div>
        </div>
    );
}
