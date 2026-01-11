'use client';

import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface StarFieldProps {
  velocityRef: React.MutableRefObject<THREE.Vector3>;
  shipPosition: [number, number, number];
}

const StarField = ({ velocityRef, shipPosition }: StarFieldProps) => {
  const points = useRef<THREE.Points>(null);
  const count = 2000;
  
  // Create stars in a local box
  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
      sz[i] = Math.random() * 2;
    }
    return [pos, sz];
  }, [count]);

  const tempVec = new THREE.Vector3();

  useFrame((state, delta) => {
    if (!points.current) return;

    const posAttr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    
    // The stars are moving opposite to the ship's velocity to simulate speed
    // and we also need them to stay around the ship.
    // Instead of moving them, we can just center the group on the ship 
    // and wrap the individual star positions.
    
    for (let i = 0; i < count; i++) {
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        let z = posAttr.getZ(i);

        // Move stars opposite to ship's world velocity
        x -= velocityRef.current.x * delta;
        y -= velocityRef.current.y * delta;
        z -= velocityRef.current.z * delta;

        // Wrap around a 200 unit cube centered at ship
        // Since we are in local space of the scene, and we want them to stay around shipPosition
        if (x - shipPosition[0] > 100) x -= 200;
        if (x - shipPosition[0] < -100) x += 200;
        if (y - shipPosition[1] > 100) y -= 200;
        if (y - shipPosition[1] < -100) y += 200;
        if (z - shipPosition[2] > 100) z -= 200;
        if (z - shipPosition[2] < -100) z += 200;

        posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="white"
        sizeAttenuation={true}
        transparent
        alphaTest={0.5}
      />
    </points>
  );
};

export default memo(StarField);
