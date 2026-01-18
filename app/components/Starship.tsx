import { useRef, forwardRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group } from 'three';
import ShieldEffect from './ShieldEffect';

export interface StarshipProps {
  shieldVisible?: boolean;
}

const Starship = forwardRef<Group, StarshipProps>(({ shieldVisible = false }, ref) => {
  const { scene } = useGLTF('/star_trek_online__uss_enterprise_d.glb');

  return (
    <group 
        ref={ref} 
        scale={[0.25, 0.25, 0.25]} 
    >
      {/* Rotate the primitive so the saucer faces -Z (forward) */}
      <primitive object={scene} rotation={[0, Math.PI, 0]} />
      
      {/* Engine Lights/Glows */}
      <pointLight position={[0, 2, -10]} intensity={2} color="#00ffff" distance={5} />
      
      {/* Shield Bubble */}
      <ShieldEffect visible={shieldVisible} />
    </group>
  );
});

Starship.displayName = 'Starship';

export default Starship;
