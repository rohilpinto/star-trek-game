'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ShieldEffectProps {
    visible: boolean;
    hitPoint?: THREE.Vector3;
}

export default function ShieldEffect({ visible, hitPoint }: ShieldEffectProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);
    const pulseRef = useRef(0);

    // Initial opacity state handled by visibility
    useFrame((state, delta) => {
        if (!meshRef.current || !materialRef.current) return;

        if (visible) {
            pulseRef.current = Math.min(1.5, pulseRef.current + delta * 10);
            materialRef.current.opacity = (Math.sin(state.clock.elapsedTime * 15) * 0.1 + 0.3) * (pulseRef.current / 1.5);
        } else {
            pulseRef.current = Math.max(0, pulseRef.current - delta * 5);
            materialRef.current.opacity = Math.max(0, materialRef.current.opacity - delta * 2);
        }

        meshRef.current.scale.setScalar(20 + Math.sin(state.clock.elapsedTime * 5) * 0.2);
    });

    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[1, 3]} />
            <meshBasicMaterial 
                ref={materialRef}
                color="#4488ff" 
                transparent 
                opacity={0} 
                wireframe
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
}
