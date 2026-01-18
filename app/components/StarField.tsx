import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface StarFieldProps {
  velocityRef: React.MutableRefObject<THREE.Vector3>;
  shipPositionRef: React.MutableRefObject<THREE.Vector3>;
}

const vertexShader = `
  varying vec3 vColor;
  varying float vOpacity;
  attribute float size;
  attribute float opacity;
  attribute vec3 color;
  
  uniform vec3 uShipPosMod;
  uniform vec3 uCameraOffset;
  uniform float uRadius;

  void main() {
    vColor = color;
    
    // Calculate relative position within the infinite grid
    // We use a modular ship position passed from JS to maintain precision
    vec3 relPos = mod(position - uShipPosMod + uRadius, uRadius * 2.0) - uRadius;
    
    // Render relative to the camera to avoid huge world coordinates
    // uCameraOffset is (CameraPosition - ShipPosition)
    vec4 mvPosition = modelViewMatrix * vec4(relPos - uCameraOffset, 1.0);
    
    // Distance-based size attenuation
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    // Fade out stars near the wrapping boundary to prevent popping
    float dist = length(relPos);
    vOpacity = opacity * smoothstep(uRadius, uRadius * 0.8, dist);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    // Round stars
    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;
    
    // Soft edges
    float alpha = vOpacity * smoothstep(0.5, 0.4, dist);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const StarField = ({ velocityRef, shipPositionRef }: StarFieldProps) => {
  const meshRef = useRef<THREE.Points>(null);
  const count = 25000;
  const radius = 2000;
  
  const [positions, colors, sizes, opacities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const op = new Float32Array(count);
    
    const colorPalette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#99ccff'),
      new THREE.Color('#ffcc99'),
      new THREE.Color('#ffeeff')
    ];

    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * radius * 2;
        pos[i * 3 + 1] = (Math.random() - 0.5) * radius * 2;
        pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
        
        const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
        
        sz[i] = 0.5 + Math.random() * 2.5;
        op[i] = 0.4 + Math.random() * 0.6;
    }
    return [pos, col, sz, op];
  }, [count, radius]);

  const uniforms = useMemo(() => ({
    uShipPosMod: { value: new THREE.Vector3() },
    uCameraOffset: { value: new THREE.Vector3() },
    uRadius: { value: radius }
  }), [radius]);

  const shipMod = new THREE.Vector3();
  const camOffset = new THREE.Vector3();

  useFrame((state) => {
    if (meshRef.current) {
        const shipPos = shipPositionRef.current;
        const camPos = state.camera.position;

        // Keep the ship position modular to [0, 2*radius] for shader precision
        shipMod.set(
            shipPos.x % (radius * 2),
            shipPos.y % (radius * 2),
            shipPos.z % (radius * 2)
        );
        if (shipMod.x < 0) shipMod.x += radius * 2;
        if (shipMod.y < 0) shipMod.y += radius * 2;
        if (shipMod.z < 0) shipMod.z += radius * 2;
        
        uniforms.uShipPosMod.value.copy(shipMod);

        // Camera offset relative to ship
        camOffset.subVectors(camPos, shipPos);
        uniforms.uCameraOffset.value.copy(camOffset);
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-opacity"
          count={count}
          array={opacities}
          itemSize={1}
          args={[opacities, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </points>
  );
};

export default StarField;
