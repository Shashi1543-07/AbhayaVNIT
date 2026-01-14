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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center w-full max-w-lg mx-auto pointer-events-auto flex flex-col items-center"
                >
                    {/* VNIT Header - Refined Hierarchy */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12 md:mb-20 lg:mb-24"
                    >
                        <h3 className="flex flex-col items-center font-black tracking-normal leading-tight drop-shadow-2xl">
                            <span className="text-xl md:text-2xl lg:text-3xl font-serif italic text-white uppercase tracking-tighter">
                                Visvesvaraya
                            </span>
                            <span className="text-sm md:text-lg lg:text-xl font-sans font-bold text-[#D4AF37] tracking-[0.2em] md:tracking-[0.4em] uppercase mt-1">
                                National Institute of Technology
                            </span>
                        </h3>
                    </motion.div>

                    {/* Branding Unit - Glass Card */}
                    <div className="w-full glass-card p-6 md:p-8 flex flex-col items-center relative overflow-hidden group">
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                        <div className="flex flex-col items-center gap-4 mb-8">
                            <motion.div
                                animate={{ rotateY: 360 }}
                                transition={{
                                    duration: 12,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                className="relative w-20 h-20 md:w-28 md:h-28"
                            >
                                <img
                                    src="/logo.png"
                                    alt="Abhaya Connect Logo"
                                    className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                                />
                            </motion.div>

                            <div className="flex flex-col items-center">
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-white drop-shadow-2xl font-heading leading-tight">
                                    ABHAYA <span className="text-[#D4AF37]">CONNECT</span>
                                </h1>
                                <h2 className="text-base md:text-lg lg:text-xl font-black font-hindi mt-1 uppercase tracking-[0.2em] opacity-90">
                                    <span className="text-white">अभया</span> <span className="text-[#D4AF37]">कनेक्ट</span>
                                </h2>
                            </div>
                        </div>

                        {/* Navigation Portals - Compact Grid */}
                        <div className="flex flex-col gap-3 w-full max-w-[340px]">
                            <Link
                                to="/login?role=student"
                                className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black font-black py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-xs md:text-sm uppercase tracking-widest border border-white/20 flex flex-col items-center justify-center leading-none"
                            >
                                <span className="mb-0.5">Student Portal</span>
                                <span className="text-[8px] opacity-60 font-black">Authorize Access</span>
                            </Link>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <Link
                                    to="/login?role=warden"
                                    className="glass py-3.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/5 hover:border-[#D4AF37]/40 transition-all text-center"
                                >
                                    Warden
                                </Link>
                                <Link
                                    to="/login?role=security"
                                    className="glass py-3.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/5 hover:border-[#D4AF37]/40 transition-all text-center"
                                >
                                    Security
                                </Link>
                            </div>

                            <Link
                                to="/login?role=admin"
                                className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-[#D4AF37]/40 hover:text-[#D4AF37]/80 transition-all text-center border border-dashed border-[#D4AF37]/10 mt-2"
                            >
                                System Command Center
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
