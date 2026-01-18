import { useState, useRef, forwardRef, useImperativeHandle, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface Enemy {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  active: boolean;
  lastFire: number;
  targetOffset: THREE.Vector3;
}

export interface EnemyLaser {
    id: string;
    position: THREE.Vector3;
    direction: THREE.Vector3;
    life: number;
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
  reset: () => void;
}

interface EnemiesProps {
    velocityRef: React.MutableRefObject<THREE.Vector3>;
    shipPositionRef: React.MutableRefObject<THREE.Vector3>;
}

const Enemies = forwardRef<EnemiesHandle, EnemiesProps>(({ velocityRef, shipPositionRef }, ref) => {
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const projectilesRef = useRef<EnemyLaser[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  
  const lastSpawnTime = useRef(0);
  const { scene } = useGLTF('/-x--fighter-alpha.glb');
  const instancedProjectilesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Audio Context for procedural enemy fire
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    const initAudio = () => {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx && !audioCtxRef.current) audioCtxRef.current = new Ctx();
    };
    window.addEventListener('mousedown', initAudio);
    return () => window.removeEventListener('mousedown', initAudio);
  }, []);

  const playEnemyFireSound = (position: THREE.Vector3) => {
    if (!audioCtxRef.current) return;
    try {
        const ctx = audioCtxRef.current;
        const dist = position.distanceTo(shipPositionRef.current);
        const volume = Math.max(0, 1 - dist / 500) * 0.3;
        if (volume <= 0) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        
        const pan = ctx.createPanner();
        pan.positionX.value = (position.x - shipPositionRef.current.x) / 50;
        
        osc.connect(gain);
        gain.connect(pan);
        pan.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  };

  const playExplosionSound = (position: THREE.Vector3) => {
    if (!audioCtxRef.current) return;
    try {
        const ctx = audioCtxRef.current;
        const dist = position.distanceTo(shipPositionRef.current);
        const volume = Math.max(0, 1 - dist / 500) * 0.8;
        if (volume <= 0) return;

        // Noise buffer for explosion
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.2);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        source.start();
    } catch (e) {}
  };

  useImperativeHandle(ref, () => ({
    getEnemies: () => enemies,
    getProjectiles: () => projectilesRef.current,
    removeEnemy: (id: string, withExp = true) => {
        setEnemies(prev => {
            const victim = prev.find(e => e.id === id);
            if (victim && withExp) {
                const expId = Math.random().toString(36).substr(2,9);
                setExplosions(exps => [...exps, { id: expId, position: [victim.position.x, victim.position.y, victim.position.z], time: performance.now() }]);
                playExplosionSound(victim.position);
            }
            return prev.filter(e => e.id !== id);
        });
    },
    removeProjectile: (id: string) => {
        projectilesRef.current = projectilesRef.current.filter(p => p.id !== id);
    },
    reset: () => {
        setEnemies([]);
        projectilesRef.current = [];
        setExplosions([]);
    }
  }), [enemies]);

  useFrame((state, delta) => {
    const shipVec = shipPositionRef.current;

    // Spawn Logic
    if (state.clock.elapsedTime - lastSpawnTime.current > 4.0) {
      if (enemies.length < 10) {
        const id = Math.random().toString(36).substr(2, 9);
        const angle = Math.random() * Math.PI * 2;
        const spawnPos = new THREE.Vector3(
            Math.cos(angle) * 350,
            (Math.random() - 0.5) * 100,
            Math.sin(angle) * 350
        ).add(shipVec);

        setEnemies(prev => [...prev, {
            id,
            position: spawnPos,
            velocity: new THREE.Vector3(),
            active: true,
            lastFire: state.clock.elapsedTime + Math.random() * 3,
            targetOffset: new THREE.Vector3(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 60
            )
        }]);
        lastSpawnTime.current = state.clock.elapsedTime;
      }
    }

    // Projectile Logic
    projectilesRef.current.forEach(p => {
        p.position.addScaledVector(p.direction, 80 * delta);
        p.life -= delta;
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.life > 0 && p.position.distanceTo(shipVec) < 600);

    // Enemy AI with Steering Behaviors
    enemies.forEach(e => {
        const dist = e.position.distanceTo(shipVec);
        const desiredPos = shipVec.clone().add(e.targetOffset);
        
        // Steering forces
        const steer = new THREE.Vector3();
        
        if (dist > 120) {
            // Arrive / Seek behavior
            const seek = desiredPos.clone().sub(e.position).normalize().multiplyScalar(40);
            steer.add(seek);
        } else if (dist < 60) {
            // Flee behavior if too close (avoid crashing)
            const flee = e.position.clone().sub(shipVec).normalize().multiplyScalar(60);
            steer.add(flee);
        } else {
            // Orbit behavior
            const tangent = e.position.clone().sub(shipVec).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(30);
            steer.add(tangent);
        }

        // Apply friction and limits
        e.velocity.addScaledVector(steer, delta * 2);
        e.velocity.multiplyScalar(0.98); // Drag
        if (e.velocity.length() > 50) e.velocity.setLength(50);
        
        e.position.addScaledVector(e.velocity, delta);

        // Periodically change target offset to make movement random but consistent
        if (state.clock.elapsedTime % 5 < 0.1) {
             e.targetOffset.set(
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 100
             );
        }

        // Firing Logic
        if (state.clock.elapsedTime - e.lastFire > 4) {
            if (dist < 200) {
                const toShip = shipVec.clone().sub(e.position).normalize();
                const pId = Math.random().toString(36).substr(2, 9);
                projectilesRef.current.push({
                    id: pId,
                    position: e.position.clone(),
                    direction: toShip.clone(),
                    life: 5.0
                });
                playEnemyFireSound(e.position);
                e.lastFire = state.clock.elapsedTime + (Math.random() * 2);
            }
        }
    });

    // Update Instanced Projectiles
    if (instancedProjectilesRef.current) {
        const mesh = instancedProjectilesRef.current;
        projectilesRef.current.forEach((p, i) => {
            dummy.position.copy(p.position);
            dummy.lookAt(p.position.clone().add(p.direction));
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.count = projectilesRef.current.length;
        mesh.instanceMatrix.needsUpdate = true;
    }

    const now = performance.now();
    if (explosions.length > 0) {
        setExplosions(prev => prev.filter(exp => now - exp.time < 1200));
    }
  });

  return (
    <group>
      {enemies.map(enemy => (
        <IndividualEnemy 
            key={enemy.id} 
            enemy={enemy} 
            scene={scene} 
        />
      ))}

      <instancedMesh ref={instancedProjectilesRef} args={[undefined, undefined, 100]}>
          <boxGeometry args={[0.2, 0.2, 3]} />
          <meshStandardMaterial 
            color="#ff3300" 
            emissive="#ff0000" 
            emissiveIntensity={15} 
          />
      </instancedMesh>

      {explosions.map(exp => (
          <ExplosionEffect key={exp.id} position={exp.position} />
      ))}
    </group>
  );
});

function ExplosionEffect({ position }: { position: [number, number, number] }) {
    const points = useRef<THREE.Points>(null);
    const count = 70;
    const [pts, vels] = useMemo(() => {
        const p = new Float32Array(count * 3);
        const v = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            v[i*3] = (Math.random() - 0.5) * 4;
            v[i*3+1] = (Math.random() - 0.5) * 4;
            v[i*3+2] = (Math.random() - 0.5) * 4;
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
                        args={[pts, 3]} 
                    />
                </bufferGeometry>
                <pointsMaterial 
                    size={0.8} 
                    color="#ff6600" 
                    transparent 
                    opacity={1} 
                    blending={THREE.AdditiveBlending}
                />
            </points>
            <mesh scale={[2,2,2]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
            </mesh>
            <pointLight intensity={30} color="#ff3300" distance={40} decay={2} />
        </group>
    );
}

function IndividualEnemy({ enemy, scene }: { enemy: Enemy, scene: THREE.Group }) {
    const ref = useRef<THREE.Group>(null);
    const cloned = useMemo(() => scene.clone(), [scene]);

    useFrame(() => {
        if (ref.current && enemy.velocity.length() > 0.1) {
            ref.current.position.copy(enemy.position);
            // Look in direction of velocity
            const target = enemy.position.clone().add(enemy.velocity);
            ref.current.lookAt(target);
            // Flip 180 because the model faces back
            ref.current.rotateY(Math.PI);
        }
    });

    return (
        <group ref={ref}>
             <primitive object={cloned} scale={[3, 3, 3]} />
             <pointLight position={[0, 0.5, 2]} intensity={20} color="#00ffff" distance={20} />
             <pointLight position={[0.8, -0.4, 1.5]} intensity={12} color="#00ffff" distance={15} />
             <pointLight position={[-0.8, -0.4, 1.5]} intensity={12} color="#00ffff" distance={15} />
        </group>
    );
}

Enemies.displayName = 'Enemies';

export default Enemies;
