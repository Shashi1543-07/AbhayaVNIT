import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const WarpGrid = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { viewport } = useThree();

    const uniforms = useMemo(() => ({
        uColor: { value: new THREE.Color("#D4AF37") },
        uAspect: { value: viewport.width / viewport.height }
    }), []);

    useFrame(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.uAspect.value = viewport.width / viewport.height;
        }
    });

    const vertexShader = `
        varying vec2 vUv;
        varying float vDepth;

        void main() {
            vUv = uv;
            vec3 pos = position;
            
            // Central gravitational well logic
            float dist = distance(uv, vec2(0.5));
            
            // FLAT TOP, SHARP DROP:
            // Depth 2.0 (Requested)
            // Power 3.0 creates a "flatter" top area before dropping sharply
            // Coefficient 3.5 tunes the width of the well
            float bulge = 2.0 / (1.0 + pow(dist * 3.5, 3.0));
            
            pos.z -= bulge;
            vDepth = bulge;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = `
        varying vec2 vUv;
        varying float vDepth;
        uniform vec3 uColor;
        uniform float uAspect;

        void main() {
            // Rectangular mapping
            vec2 scaledUv = vUv;
            scaledUv.x *= uAspect;
            scaledUv.x -= (uAspect - 1.0) * 0.5;

            // STANDARD GRID SCALE
            float gridScale = 28.0;
            vec2 grid = abs(fract(scaledUv * gridScale - 0.5) - 0.5);
            float lineValue = min(grid.x, grid.y);
            // Sharp lines
            float mask = 1.0 - smoothstep(0.0, 0.05, lineValue);

            // DEEP CONVERGENCE MASKING
            // Allows grid to be seen deep into the funnel (Low fade start)
            float verticalFade = smoothstep(0.25, 0.45, vUv.y) * smoothstep(0.9, 0.7, vUv.y);
            
            // FOCUSED RADIAL VISIBILITY (Not infinite)
            float dist = distance(vUv, vec2(0.5));
            float radialFade = smoothstep(0.65, 0.2, dist);
            
            float finalFade = verticalFade * radialFade;

            // Deep Stable Glow
            float centerWeight = vDepth * 0.3;
            vec3 finalColor = uColor + vec3(centerWeight * 0.6);
            
            // High visibility
            float alpha = mask * finalFade * (0.6 + centerWeight * 0.5);

            gl_FragColor = vec4(finalColor, alpha);
        }
    `;

    // STANDARD WIDTH: 1.8x viewport width (Reverted from infinite 3.5x)
    const meshWidth = viewport.width * 1.8;
    const meshHeight = meshWidth * 0.6;

    return (
        <mesh rotation={[-Math.PI / 2.15, 0, 0]} position={[0, -0.2, 0]} scale={[meshWidth, meshHeight, 1]}>
            <planeGeometry args={[1, 1, 120, 120]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent={true}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

export default function SpacetimeWarp() {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
            {/* STANDARD CAMERA: Reverted to Z=9 for closer, standard view */}
            <Canvas camera={{ position: [0, 5, 9], fov: 24 }} gl={{ alpha: true }}>
                <WarpGrid />
            </Canvas>
        </div>
    );
}
