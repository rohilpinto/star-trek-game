'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Group } from 'three';

export interface StarshipProps {
  position: [number, number, number];
  rotation: [number, number, number];
}

export default function Starship({ position, rotation }: StarshipProps) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF('/star_trek_online__uss_enterprise_d.glb');

  useFrame((state) => {
    if (group.current) {
        // Subtle hover/engine rumble effect
        group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        // Rotation bank on turns (visual only for now, could be passed in)
        group.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.05; 
        
        // Ensure manual position updates from parent are respected (except slight hover)
        // We set x and z directly. y is modulated.
        group.current.position.x = position[0];
        group.current.position.z = position[2];
    }
  });

  return (
    <group 
        ref={group} 
        position={position} 
        rotation={rotation}
        scale={[0.15, 0.15, 0.15]} 
    >
      {/* Rotate the primitive so the saucer faces -Z (forward) */}
      <primitive object={scene} rotation={[0, Math.PI, 0]} />
      
      {/* Engine Lights/Glows */}
      <pointLight position={[0, 2, -10]} intensity={2} color="#00ffff" distance={5} />
    </group>
  );
}
