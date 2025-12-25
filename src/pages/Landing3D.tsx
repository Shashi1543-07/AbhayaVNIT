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

    useFrame((state, delta) => {
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
                    color="#FF99AC"
                    size={0.005}
                    sizeAttenuation={true}
                    depthWrite={false}
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
            className="relative w-full h-screen overflow-hidden"
            style={{ background: 'linear-gradient(20deg, #FF99AC 0%, #C084FC 35%, #89CFF0 70%, #FFFFFF 100%)' }}
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
                    <div className="w-full mb-2 md:mb-3">
                        <h3 className="text-sm md:text-lg lg:text-xl font-light tracking-[0.2em] md:tracking-[0.4em] leading-tight drop-shadow-sm">
                            <span className="block font-serif italic text-[#0F4C81] drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">Visvesvaraya</span>
                            <span className="block font-serif italic -mt-1 md:-mt-2 text-[#0F4C81] drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">National Institute of Technology</span>
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
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1A7CCC] drop-shadow-lg font-sans text-center">
                                ABHAYA CONNECT
                            </h1>
                            <h2 className="text-base md:text-lg lg:text-xl font-bold text-[#1A7CCC] font-hindi text-center mt-0.5">
                                अभया कनेक्ट
                            </h2>
                        </div>
                    </div>

                    <p className="text-sm md:text-base text-[#0F4C81] mb-3 md:mb-4 max-w-lg mx-auto leading-relaxed px-4 text-center font-medium drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
                        VNIT smart campus safety system.
                        <br className="hidden md:block" />
                        <span className="text-[#0F4C81] font-bold block md:inline mt-1">Secure. Connected. Instant.</span>
                    </p>

                    <div className="flex flex-col gap-2 md:gap-2 w-full max-w-[320px] md:max-w-sm mx-auto">
                        <Link
                            to="/login?role=student"
                            className="group px-4 py-3 md:px-5 md:py-3 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] backdrop-blur-md hover:opacity-90 rounded-xl transition-all flex flex-col items-center gap-0.5 text-center shadow-xl border border-white/20"
                        >
                            <span className="font-bold text-base md:text-base text-[#0F4C81] drop-shadow-sm">Student Login</span>
                            <span className="text-xs md:text-[11px] text-[#0F4C81]/80 font-medium">Access your dashboard</span>
                        </Link>

                        <Link
                            to="/login?role=warden"
                            className="group px-4 py-3 md:px-5 md:py-3 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] backdrop-blur-md hover:opacity-90 rounded-xl transition-all flex flex-col items-center gap-0.5 text-center shadow-xl border border-white/20"
                        >
                            <span className="font-bold text-base md:text-base text-[#0F4C81] drop-shadow-sm">Warden Login</span>
                            <span className="text-xs md:text-[11px] text-[#0F4C81]/80 font-medium">Manage hostel & students</span>
                        </Link>

                        <Link
                            to="/login?role=security"
                            className="group px-4 py-3 md:px-5 md:py-3 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] backdrop-blur-md hover:opacity-90 rounded-xl transition-all flex flex-col items-center gap-0.5 text-center shadow-xl border border-white/20"
                        >
                            <span className="font-bold text-base md:text-base text-[#0F4C81] drop-shadow-sm">Security Login</span>
                            <span className="text-xs md:text-[11px] text-[#0F4C81]/80 font-medium">Patrols & Incident logs</span>
                        </Link>

                        <Link
                            to="/login?role=admin"
                            className="group px-4 py-3 md:px-5 md:py-3 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] backdrop-blur-md hover:opacity-90 rounded-xl transition-all flex flex-col items-center gap-0.5 text-center shadow-xl border border-white/20"
                        >
                            <span className="font-bold text-base md:text-base text-[#0F4C81] drop-shadow-sm">Admin Login</span>
                            <span className="text-xs md:text-[11px] text-[#0F4C81]/80 font-medium">System control panel</span>
                        </Link>
                    </div>
                </motion.div>


            </div>
        </div>
    );
}
