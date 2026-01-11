'use client';

import { useState, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface Enemy {
  id: string;
  position: [number, number, number];
  active: boolean;
  drift: [number, number]; 
  lastFire: number;
}

export interface EnemyLaser {
    id: string;
    position: [number, number, number];
}

interface Explosion {
    id: string;
    position: [number, number, number];
    time: number;
}

export interface EnemiesHandle {
  getEnemies: () => Enemy[];
  getProjectiles: () => EnemyLaser[];
  removeEnemy: (id: string, withExp?: boolean) => void;
  removeProjectile: (id: string) => void;
}

interface EnemiesProps {
    velocityRef: React.MutableRefObject<THREE.Vector3>;
    shipPosition: [number, number, number];
}

const Enemies = forwardRef<EnemiesHandle, EnemiesProps>(({ velocityRef, shipPosition }, ref) => {
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<EnemyLaser[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  
  const lastSpawnTime = useRef(0);
  const { scene } = useGLTF('/-x--fighter-alpha.glb');

  useImperativeHandle(ref, () => ({
    getEnemies: () => enemies,
    getProjectiles: () => projectiles,
    removeEnemy: (id: string, withExp = true) => {
        setEnemies(prev => {
            const victim = prev.find(e => e.id === id);
            if (victim && withExp) {
                const expId = Math.random().toString(36).substr(2,9);
                setExplosions(exps => [...exps, { id: expId, position: victim.position, time: performance.now() }]);
            }
            return prev.filter(e => e.id !== id);
        });
    },
    removeProjectile: (id: string) => {
        setProjectiles(prev => prev.filter(p => p.id !== id));
    }
  }));

  const shipVec = new THREE.Vector3();

  useFrame((state, delta) => {
    shipVec.set(...shipPosition);

    if (state.clock.elapsedTime - lastSpawnTime.current > 4.0) {
      if (enemies.length < 8) {
        const id = Math.random().toString(36).substr(2, 9);
        const spawnPos = new THREE.Vector3(
            (Math.random() - 0.5) * 150,
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 150
        ).add(shipVec);

        if (spawnPos.distanceTo(shipVec) > 50) {
            setEnemies(prev => [...prev, {
                id,
                position: [spawnPos.x, spawnPos.y, spawnPos.z],
                active: true,
                drift: [(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5],
                lastFire: state.clock.elapsedTime
            }]);
            lastSpawnTime.current = state.clock.elapsedTime;
        }
      }
    }

    setProjectiles(prev => prev.map(p => {
        const pVec = new THREE.Vector3(...p.position);
        const dir = shipVec.clone().sub(pVec).normalize();
        pVec.addScaledVector(dir, 45 * delta);
        return { ...p, position: [pVec.x, pVec.y, pVec.z] as [number, number, number] };
    }).filter(p => new THREE.Vector3(...p.position).distanceTo(shipVec) < 250));

    enemies.forEach(e => {
        if (state.clock.elapsedTime - e.lastFire > 5) {
            const eVec = new THREE.Vector3(...e.position);
            if (eVec.distanceTo(shipVec) < 120) {
                const pId = Math.random().toString(36).substr(2, 9);
                setProjectiles(prev => [...prev, {
                    id: pId,
                    position: [...e.position] as [number, number, number]
                }]);
                e.lastFire = state.clock.elapsedTime;
            }
        }
    });

    const now = performance.now();
    if (explosions.length > 0) {
        setExplosions(prev => prev.filter(exp => now - exp.time < 1200));
    }
  });

  return (
    <group>
      {enemies.map(enemy => (
        <group key={enemy.id} position={enemy.position}>
             <primitive object={scene.clone()} rotation={[0, 0, 0]} scale={[3, 3, 3]} />
        </group>
      ))}

      {projectiles.map(p => (
          <mesh key={p.id} position={p.position}>
              <sphereGeometry args={[0.4, 8, 8]} />
              <meshStandardMaterial 
                color="#ff4400" 
                emissive="#ff0000" 
                emissiveIntensity={10} 
              />
          </mesh>
      ))}

      {explosions.map(exp => (
          <ExplosionEffect key={exp.id} position={exp.position} />
      ))}
    </group>
  );
});

function ExplosionEffect({ position }: { position: [number, number, number] }) {
    const points = useRef<THREE.Points>(null);
    const count = 50;
    const [pts, vels] = useMemo(() => {
        const p = new Float32Array(count * 3);
        const v = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            v[i*3] = (Math.random() - 0.5) * 3;
            v[i*3+1] = (Math.random() - 0.5) * 3;
            v[i*3+2] = (Math.random() - 0.5) * 3;
        }
        return [p, v];
    }, []);

    useFrame((state, delta) => {
        if (!points.current) return;
        const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < count; i++) {
            attr.setXYZ(i, attr.getX(i) + vels[i*3], attr.getY(i) + vels[i*3+1], attr.getZ(i) + vels[i*3+2]);
        }
        attr.needsUpdate = true;
        points.current.scale.multiplyScalar(1.02);
    });

    return (
        <group position={position}>
            <points ref={points}>
                <bufferGeometry>
                    <bufferAttribute 
                        attach="attributes-position" 
                        count={count} 
                        array={pts} 
                        itemSize={3} 
                    />
                </bufferGeometry>
                <pointsMaterial 
                    size={0.6} 
                    color="#ff6600" 
                    transparent 
                    opacity={1} 
                    blending={THREE.AdditiveBlending}
                />
            </points>
            <mesh scale={[1.5,1.5,1.5]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
            </mesh>
            <pointLight intensity={20} color="#ff3300" distance={30} decay={2} />
        </group>
    );
}

export default Enemies;
