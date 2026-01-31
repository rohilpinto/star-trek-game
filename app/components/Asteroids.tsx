import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface Asteroid {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
    spin: THREE.Vector3;
}

export interface AsteroidsHandle {
    getAsteroids: () => Asteroid[];
}

interface AsteroidsProps {
    shipPositionRef: React.MutableRefObject<THREE.Vector3>;
}

const Asteroids = forwardRef<AsteroidsHandle, AsteroidsProps>(({ shipPositionRef }, ref) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = 300;
    const radius = 1000;
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const asteroids = useMemo(() => {
        const arr: Asteroid[] = [];
        for (let i = 0; i < count; i++) {
            arr.push({
                position: new THREE.Vector3(
                    (Math.random() - 0.5) * radius * 2,
                    (Math.random() - 0.5) * radius * 0.5, // Flattened field
                    (Math.random() - 0.5) * radius * 2
                ),
                rotation: new THREE.Euler(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                ),
                scale: 2 + Math.random() * 8,
                spin: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5
                )
            });
        }
        return arr;
    }, [count, radius]);

    useImperativeHandle(ref, () => ({
        getAsteroids: () => asteroids
    }));

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        const shipPos = shipPositionRef.current;
        const mesh = meshRef.current;

        asteroids.forEach((a, i) => {
            // Apply spin
            a.rotation.x += a.spin.x * delta;
            a.rotation.y += a.spin.y * delta;
            a.rotation.z += a.spin.z * delta;

            // Simple wrapping logic (Keep asteroids around the ship)
            const relX = a.position.x - shipPos.x;
            const relY = a.position.y - shipPos.y;
            const relZ = a.position.z - shipPos.z;

            if (relX > radius) a.position.x -= radius * 2;
            if (relX < -radius) a.position.x += radius * 2;
            if (relY > radius * 0.25) a.position.y -= radius * 0.5;
            if (relY < -radius * 0.25) a.position.y += radius * 0.5;
            if (relZ > radius) a.position.z -= radius * 2;
            if (relZ < -radius) a.position.z += radius * 2;

            dummy.position.copy(a.position);
            dummy.rotation.copy(a.rotation);
            dummy.scale.setScalar(a.scale);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });

        mesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial 
                color="#444444" 
                roughness={0.8} 
                metalness={0.2}
            />
        </instancedMesh>
    );
});

Asteroids.displayName = 'Asteroids';

export default Asteroids;
