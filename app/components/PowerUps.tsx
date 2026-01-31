import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type PowerUpType = 'SHIELD' | 'HULL' | 'BOOST';

export interface PowerUp {
    id: string;
    position: THREE.Vector3;
    type: PowerUpType;
    collected: boolean;
}

export interface PowerUpsHandle {
    drop: (position: THREE.Vector3) => void;
    getPowerUps: () => PowerUp[];
    collect: (id: string) => void;
    reset: () => void;
}

interface PowerUpsProps {
    shipPositionRef: React.MutableRefObject<THREE.Vector3>;
}

const PowerUps = forwardRef<PowerUpsHandle, PowerUpsProps>(({ shipPositionRef }, ref) => {
    const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
    const powerUpsRef = useRef<PowerUp[]>([]);

    useImperativeHandle(ref, () => ({
        drop: (position: THREE.Vector3) => {
            const types: PowerUpType[] = ['SHIELD', 'HULL', 'BOOST'];
            const type = types[Math.floor(Math.random() * types.length)];
            const newPowerUp: PowerUp = {
                id: Math.random().toString(36).substr(2, 9),
                position: position.clone(),
                type,
                collected: false
            };
            powerUpsRef.current.push(newPowerUp);
            setPowerUps([...powerUpsRef.current]);
        },
        getPowerUps: () => powerUpsRef.current,
        collect: (id: string) => {
            powerUpsRef.current = powerUpsRef.current.filter(p => p.id !== id);
            setPowerUps([...powerUpsRef.current]);
        },
        reset: () => {
            powerUpsRef.current = [];
            setPowerUps([]);
        }
    }));

    useFrame((state, delta) => {
        const shipPos = shipPositionRef.current;
        
        // Remove distant power-ups
        const initialCount = powerUpsRef.current.length;
        powerUpsRef.current = powerUpsRef.current.filter(p => p.position.distanceTo(shipPos) < 1000);
        if (powerUpsRef.current.length !== initialCount) {
             setPowerUps([...powerUpsRef.current]);
        }
    });

    return (
        <group>
            {powerUps.map(p => (
                <PowerUpItem key={p.id} type={p.type} position={p.position} />
            ))}
        </group>
    );
});

function PowerUpItem({ type, position }: { type: PowerUpType, position: THREE.Vector3 }) {
    const meshRef = useRef<THREE.Group>(null);
    const color = type === 'SHIELD' ? '#00ffff' : type === 'HULL' ? '#ff0000' : '#ffff00';

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.05;
            meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 3) * 0.5;
        }
    });

    return (
        <group ref={meshRef} position={[position.x, position.y, position.z]}>
            <mesh>
                <octahedronGeometry args={[1.5, 0]} />
                <meshStandardMaterial 
                    color={color} 
                    emissive={color} 
                    emissiveIntensity={10} 
                    transparent 
                    opacity={0.8} 
                />
            </mesh>
            <pointLight intensity={10} color={color} distance={10} />
            
            {/* Outer Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[2.5, 0.1, 16, 50]} />
                <meshBasicMaterial color={color} transparent opacity={0.4} />
            </mesh>
        </group>
    );
}

PowerUps.displayName = 'PowerUps';

export default PowerUps;
