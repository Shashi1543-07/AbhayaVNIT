import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface SpacetimeGridProps {
    progress: number;
}

const SpacetimeGrid = ({ progress }: SpacetimeGridProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(() => ({
        uColor: { value: new THREE.Color("#D4AF37") },
        uTime: { value: 0 }
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    const vertexShader = `
        varying vec2 vUv;
        varying float vDepth;

        void main() {
            vUv = uv;
            vec3 pos = position;
            
            // Distance from center
            float dist = distance(uv, vec2(0.5));
            
            // DRAMATIC CIRCULAR BULGE from all sides
            float depth = 9.0; // Much deeper for dramatic effect
            float sharpness = 2.8; // Reduced for wider, more visible bulge
            float bulge = depth / (1.0 + pow(dist * sharpness, 3.0));
            
            pos.y -= bulge;
            vDepth = bulge;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `;

    const fragmentShader = `
        varying vec2 vUv;
        varying float vDepth;
        uniform vec3 uColor;
        uniform float uTime;

        void main() {
            // VISIBLE RECTANGULAR GRID
            float gridScale = 380.0; // Increased for very small technical squares
            vec2 grid = abs(fract(vUv * gridScale - 0.5) - 0.5);
            float lineValue = min(grid.x, grid.y);
            
            // Sharp visible lines
            float mask = 1.0 - smoothstep(0.0, 0.05, lineValue);
            
            // Fade at edges
            float distFromCenter = distance(vUv, vec2(0.5));
            float radialFade = smoothstep(0.65, 0.2, distFromCenter);
            
            // VERTICAL FADE - Visible around button, fades before instruction text
            // Visible from top to ~55%, starts fading at 55%, fully gone by 68%
            float verticalFade = smoothstep(0.25, 0.45, vUv.y) * smoothstep(0.68, 0.55, vUv.y);
            
            float finalFade = verticalFade * radialFade;
            
            // Depth-based glow with ROYAL GOLDEN emphasis
            float centerGlow = vDepth * 0.4;
            // Boost golden color for royal look
            vec3 finalColor = uColor * 1.5 + vec3(centerGlow * 0.8);
            
            // High visibility with better base alpha
            float alpha = mask * finalFade * (0.8 + centerGlow * 0.6);
            
            if (alpha < 0.01) discard;
            
            gl_FragColor = vec4(finalColor, alpha);
        }
    `;

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -1, -2]}>
            <planeGeometry args={[140, 84, 200, 200]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent={true}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
};

export default function SpacetimeWarp({ progress = 0 }: { progress?: number }) {
    return (
        <div className="w-full h-full pointer-events-none">
            <Canvas
                camera={{
                    position: [0, 8, 12],
                    fov: 28,
                    near: 0.1,
                    far: 1000
                }}
                gl={{ antialias: true, alpha: true }}
            >
                <SpacetimeGrid progress={progress} />
            </Canvas>
        </div>
    );
}
