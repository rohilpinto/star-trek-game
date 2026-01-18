import { useRef, useState, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LasersProps {
    shipPositionRef: React.MutableRefObject<THREE.Vector3>;
    shipRotationRef: React.MutableRefObject<THREE.Euler>;
}

export interface LasersHandle {
  startFiring: (weapon?: 'PHASERS' | 'TORPEDOES') => void;
  stopFiring: () => void;
  isFiring: boolean;
  reset: () => void;
  weapon: 'PHASERS' | 'TORPEDOES';
  getTorpedoes: () => Torpedo[];
}

interface Torpedo {
    id: string;
    position: THREE.Vector3;
    direction: THREE.Vector3;
    life: number;
}

const Lasers = forwardRef<LasersHandle, LasersProps>(({ shipPositionRef, shipRotationRef }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const [firing, setFiring] = useState(false);
  const [beamVisible, setBeamVisible] = useState(false);
  const [chargeScale, setChargeScale] = useState(0);
  const [weaponMode, setWeaponMode] = useState<'PHASERS' | 'TORPEDOES'>('PHASERS');
  
  const torpedoesRef = useRef<Torpedo[]>([]);
  const instancedTorpedoesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const phaserSoundRef = useRef<{ source: AudioBufferSourceNode | null, gain: GainNode | null }>({ source: null, gain: null });
  const phaserBuffer = useRef<AudioBuffer | null>(null);
  
  const chargeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particleCount = 200;
  const positions = useMemo(() => new Float32Array(particleCount * 3), []);

  useEffect(() => {
    const loadAudio = async () => {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            audioCtxRef.current = ctx;
            const response = await fetch('/tng_phaser5_clean.mp3');
            const arrayBuffer = await response.arrayBuffer();
            phaserBuffer.current = await ctx.decodeAudioData(arrayBuffer);
        } catch (e) { }
    };
    loadAudio();
  }, []);

  const startPhaserSound = () => {
    if (phaserSoundRef.current.source || !audioCtxRef.current || !phaserBuffer.current) return;
    try {
        const ctx = audioCtxRef.current;
        const source = ctx.createBufferSource();
        source.buffer = phaserBuffer.current;
        source.loop = true; 
        source.loopStart = phaserBuffer.current.duration * 0.4;
        source.loopEnd = phaserBuffer.current.duration;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.2); 
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        phaserSoundRef.current = { source, gain };
    } catch (e) {}
  };

  const stopPhaserSound = () => {
    if (phaserSoundRef.current.source && phaserSoundRef.current.gain && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        phaserSoundRef.current.gain.gain.cancelScheduledValues(now);
        phaserSoundRef.current.gain.gain.linearRampToValueAtTime(0, now + 0.1);
        phaserSoundRef.current.source.stop(now + 0.1);
        phaserSoundRef.current = { source: null, gain: null };
    }
  };

  const playTorpedoSound = () => {
    if (!audioCtxRef.current) return;
    try {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);

        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  const fireTorpedo = () => {
      const direction = new THREE.Vector3(0, 0, -1).applyEuler(shipRotationRef.current);
      torpedoesRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          position: shipPositionRef.current.clone().add(direction.clone().multiplyScalar(5)),
          direction: direction.multiplyScalar(200), // Very fast
          life: 3.0
      });
      playTorpedoSound();
  };

  useImperativeHandle(ref, () => ({
    startFiring: (mode) => {
        if (mode) setWeaponMode(mode);
        const activeMode = mode || weaponMode;

        if (activeMode === 'PHASERS') {
            if (!firing) {
                setFiring(true);
                setChargeScale(0.1);
                startPhaserSound();
                chargeTimeoutRef.current = setTimeout(() => { setBeamVisible(true); }, 250);
            }
        } else {
            // Torpedoes are semi-auto
            if (!firing) {
                setFiring(true);
                fireTorpedo();
                setTimeout(() => setFiring(false), 500); // 0.5s cooldown
            }
        }
    },
    stopFiring: () => {
        if (firing) {
            setFiring(false);
            setBeamVisible(false);
            setChargeScale(0);
            stopPhaserSound();
            if (chargeTimeoutRef.current) clearTimeout(chargeTimeoutRef.current);
        }
    },
    isFiring: beamVisible || (weaponMode === 'TORPEDOES' && firing),
    weapon: weaponMode,
    getTorpedoes: () => torpedoesRef.current,
    reset: () => {
        setFiring(false);
        setBeamVisible(false);
        setChargeScale(0);
        stopPhaserSound();
        torpedoesRef.current = [];
        if (chargeTimeoutRef.current) clearTimeout(chargeTimeoutRef.current);
    }
  }), [firing, beamVisible, weaponMode]);

  useFrame((state, delta) => {
    if (groupRef.current) {
        groupRef.current.position.copy(shipPositionRef.current);
        groupRef.current.rotation.copy(shipRotationRef.current);
    }

    // Torpedo Physics
    torpedoesRef.current.forEach(t => {
        t.position.addScaledVector(t.direction, delta);
        t.life -= delta;
    });
    torpedoesRef.current = torpedoesRef.current.filter(t => t.life > 0);

    // Phaser Logic
    if (firing && weaponMode === 'PHASERS' && chargeScale < 1 && !beamVisible) {
        setChargeScale(prev => Math.min(1, prev + delta * 4));
    }
    if (ringRef.current) ringRef.current.rotation.z += 0.15;

    if (particlesRef.current) {
        const attr = particlesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < particleCount; i++) {
            if (beamVisible && weaponMode === 'PHASERS') {
                positions[i * 3 + 2] -= delta * 150;
                if (positions[i * 3 + 2] < -50) {
                    positions[i * 3] = (Math.random() - 0.5) * 0.5;
                    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
                    positions[i * 3 + 2] = 0;
                }
            } else {
                positions[i * 3 + 2] = 10;
            }
            attr.setXYZ(i, positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        }
        attr.needsUpdate = true;
    }

    // Update Torpedo Instances
    if (instancedTorpedoesRef.current) {
        const mesh = instancedTorpedoesRef.current;
        torpedoesRef.current.forEach((t, i) => {
            dummy.position.copy(t.position);
            dummy.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 20) * 0.2);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.count = torpedoesRef.current.length;
        mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Phaser Source Ring */}
      <group ref={groupRef}>
        {firing && weaponMode === 'PHASERS' && !beamVisible && (
            <mesh ref={ringRef} position={[0, 0.2, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.8 * chargeScale, 0.08, 16, 100]} />
                <meshBasicMaterial color="#ffcc00" transparent opacity={0.9} />
            </mesh>
        )}

        {beamVisible && weaponMode === 'PHASERS' && (
            <group>
            <mesh position={[0, 0.15, -25]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 50, 16]} />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0.15, -25]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 50, 16]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.5} />
            </mesh>

            <points ref={particlesRef}>
                <bufferGeometry>
                    <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                    count={particleCount}
                    array={positions}
                    itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial color="#ffcc00" size={0.15} transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />
            </points>

            <mesh position={[0, 0.2, -0.5]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
            <pointLight position={[0, 0.2, -1]} intensity={10} color="#ffaa00" distance={15} />
            </group>
        )}
      </group>

      {/* Photon Torpedoes */}
      <instancedMesh 
          ref={instancedTorpedoesRef} 
          args={[undefined, undefined, 100]}
          frustumCulled={false}
      >
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshStandardMaterial 
            color="#ff4400" 
            emissive="#ff0000" 
            emissiveIntensity={20} 
            transparent 
            opacity={0.9} 
            blending={THREE.AdditiveBlending} 
          />
      </instancedMesh>
    </group>
  );
});

export default Lasers;
