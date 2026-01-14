'use client';

import { useRef, useState, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LasersProps {
    shipPosition: [number, number, number];
    shipRotation: [number, number, number];
}

export interface LasersHandle {
  startFiring: () => void;
  stopFiring: () => void;
  isFiring: boolean;
  reset: () => void;
}

const Lasers = forwardRef<LasersHandle, LasersProps>(({ shipPosition, shipRotation }, ref) => {
  const [firing, setFiring] = useState(false);
  const [beamVisible, setBeamVisible] = useState(false);
  const [chargeScale, setChargeScale] = useState(0);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  
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
            const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
            bufferRef.current = decodedBuffer;
        } catch (e) { console.error(e); }
    };
    loadAudio();
  }, []);

  const startSound = () => {
    if (sourceRef.current || !audioCtxRef.current || !bufferRef.current) return;
    try {
        const ctx = audioCtxRef.current;
        const source = ctx.createBufferSource();
        source.buffer = bufferRef.current;
        source.loop = true; 
        source.loopStart = bufferRef.current.duration * 0.4;
        source.loopEnd = bufferRef.current.duration;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.2); 
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        sourceRef.current = source;
        gainRef.current = gain;
    } catch (e) {}
  };

  const stopSound = () => {
    if (sourceRef.current && gainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        gainRef.current.gain.cancelScheduledValues(now);
        gainRef.current.gain.linearRampToValueAtTime(0, now + 0.1);
        const oldSource = sourceRef.current;
        oldSource.stop(now + 0.1);
        setTimeout(() => { if (sourceRef.current === oldSource) sourceRef.current = null; }, 150);
    }
  };

  useImperativeHandle(ref, () => ({
    startFiring: () => {
        if (!firing) {
            setFiring(true);
            setChargeScale(0.1);
            startSound();
            chargeTimeoutRef.current = setTimeout(() => { setBeamVisible(true); }, 250);
        }
    },
    stopFiring: () => {
        if (firing) {
            setFiring(false);
            setBeamVisible(false);
            setChargeScale(0);
            stopSound();
            if (chargeTimeoutRef.current) clearTimeout(chargeTimeoutRef.current);
        }
    },
    isFiring: beamVisible,
    reset: () => {
        setFiring(false);
        setBeamVisible(false);
        setChargeScale(0);
        stopSound();
        if (chargeTimeoutRef.current) clearTimeout(chargeTimeoutRef.current);
    }
  }), [firing, beamVisible]);

  useFrame((state, delta) => {
    if (firing && chargeScale < 1 && !beamVisible) {
        setChargeScale(prev => Math.min(1, prev + delta * 4));
    }
    if (ringRef.current) ringRef.current.rotation.z += 0.15;

    if (particlesRef.current) {
        const attr = particlesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < particleCount; i++) {
            if (beamVisible) {
                positions[i * 3 + 2] -= delta * 150;
                if (positions[i * 3 + 2] < -50) {
                    positions[i * 3] = (Math.random() - 0.5) * 0.5;
                    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
                    positions[i * 3 + 2] = 0;
                }
            } else {
                positions[i * 3 + 2] = 10;
            }
        }
        attr.needsUpdate = true;
    }
  });

  return (
    <group position={shipPosition} rotation={shipRotation}>
      {firing && !beamVisible && (
          <mesh ref={ringRef} position={[0, 0.2, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.8 * chargeScale, 0.08, 16, 100]} />
              <meshBasicMaterial color="#ffcc00" transparent opacity={0.9} />
          </mesh>
      )}

      {beamVisible && (
        <group>
          {/* High Intensity Beam Layers */}
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
  );
});

export default Lasers;
