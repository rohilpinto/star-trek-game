'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import StarField from './StarField';
import Starship from './Starship';
import Lasers, { LasersHandle } from './Lasers';
import Enemies, { EnemiesHandle } from './Enemies';
import StartMenu from './StartMenu';
import LoadingScreen from './LoadingScreen';

export default function GameScene() {
  const [shipPosition, setShipPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [shipRotation, setShipRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [score, setScore] = useState(0);
  const [speedDisplay, setSpeedDisplay] = useState(0.0);
  const [shields, setShields] = useState(100);
  const maxShields = 100;
  const [shieldVisible, setShieldVisible] = useState(false);
  const [gameState, setGameState] = useState<'START' | 'PLAYING'>('START');
  
  const speedRef = useRef(0.0);
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const laserRef = useRef<LasersHandle>(null);
  const enemyRef = useRef<EnemiesHandle>(null);
  
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 's', 'a', 'd', 'q', 'e', 'r', 'f'].includes(e.key.toLowerCase())) {
          e.preventDefault();
      }
      keys.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const resetGame = () => {
    setScore(0);
    setShields(100);
    setShipPosition([0, 0, 0]);
    setShipRotation([0, 0, 0]);
    velocityRef.current.set(0, 0, 0);
    speedRef.current = 0;
    enemyRef.current?.reset();
    laserRef.current?.reset();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundColor: 'black' }}>
      <LoadingScreen />
      
      {gameState === 'START' && (
        <StartMenu onStart={() => setGameState('PLAYING')} />
      )}
      <Canvas 
        shadows 
        camera={{ position: [0, 5, 20], fov: 60 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={['#010105']} />
        <fog attach="fog" args={['#010105', 100, 1500]} />
        
        <ambientLight intensity={0.4} />
        <spotLight position={[50, 50, 50]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <hemisphereLight intensity={0.5} color="#00ffff" groundColor="#000000" />
        
        <Suspense fallback={null}>
            <StarField velocityRef={velocityRef} shipPosition={shipPosition} />
            <GameLogic 
                keys={keys} 
                shipPosition={shipPosition} 
                setShipPosition={setShipPosition}
                shipRotation={shipRotation}
                setShipRotation={setShipRotation}
                laserRef={laserRef}
                enemyRef={enemyRef}
                setScoreVal={setScore}
                speedRef={speedRef}
                velocityRef={velocityRef}
                setSpeedDisplay={setSpeedDisplay}
                shields={shields}
                setShields={setShields}
                setShieldVisible={setShieldVisible}
                gameState={gameState}
            />
            
            <Starship position={shipPosition} rotation={shipRotation} shieldVisible={shieldVisible} />
            <Lasers ref={laserRef} shipPosition={shipPosition} shipRotation={shipRotation} />
            <Enemies ref={enemyRef} velocityRef={velocityRef} shipPosition={shipPosition} />
            
            <EffectComposer>
                <Bloom 
                    luminanceThreshold={0.5} 
                    mipmapBlur 
                    intensity={1.2} 
                    radius={0.4} 
                />
                <Noise opacity={0.05} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
                <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} />
            </EffectComposer>
        </Suspense>
      </Canvas>
      
      {/* HUD Layer */}
      <div style={{
        position: 'absolute', top: 30, left: 40, color: '#00ffff',
        fontFamily: "'Orbitron', sans-serif", fontSize: '28px', pointerEvents: 'none',
        textShadow: '0 0 10px #00ffff',
        fontWeight: 'bold'
      }}>
        LCARS OVERRIDE [VGR-74656] <br/>
        <span style={{ fontSize: '18px', opacity: 0.8 }}>KILLS: {score}</span>
        <div style={{ marginTop: '10px', width: '250px', height: '12px', background: 'rgba(0,255,255,0.2)', border: '1px solid #00ffff' }}>
            <div style={{ width: `${(shields / maxShields) * 100}%`, height: '100%', background: '#00ffff', transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: '12px', color: '#00ffff', marginBottom: '15px' }}>SHIELD INTEGRITY: {Math.round(shields)}%</div>
        
        <button 
            onClick={resetGame}
            style={{
                background: 'rgba(255, 68, 0, 0.2)',
                border: '1px solid #ff4400',
                color: '#ff4400',
                padding: '5px 15px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '10px',
                cursor: 'pointer',
                letterSpacing: '2px',
                pointerEvents: 'auto'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 68, 0, 0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 68, 0, 0.2)'}
        >
            RESET SIMULATION
        </button>
      </div>

      <div style={{
        position: 'absolute', bottom: 40, right: 40, color: '#ffcc00',
        fontFamily: "'Orbitron', sans-serif", fontSize: '36px', pointerEvents: 'none',
        textAlign: 'right'
      }}>
        <div style={{ fontSize: '14px', color: '#666' }}>WARP FIELD INTENSITY</div>
        {speedDisplay}c {speedRef.current > 40 ? '< WARP ENGAGED >' : ''}
      </div>

      <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '200px', height: '200px', border: '1px solid #ff0000', borderRadius: '50%',
          opacity: 0.2, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
          <div style={{ width: '10px', height: '10px', background: 'red', borderRadius: '50%' }} />
      </div>
    </div>
  );
}

interface GameLogicProps {
    keys: React.MutableRefObject<{ [key: string]: boolean }>;
    shipPosition: [number, number, number];
    setShipPosition: (pos: [number, number, number]) => void;
    shipRotation: [number, number, number];
    setShipRotation: (rot: [number, number, number]) => void;
    laserRef: React.RefObject<LasersHandle | null>;
    enemyRef: React.RefObject<EnemiesHandle | null>;
    setScoreVal: React.Dispatch<React.SetStateAction<number>>;
    speedRef: React.MutableRefObject<number>;
    velocityRef: React.MutableRefObject<THREE.Vector3>;
    setSpeedDisplay: React.Dispatch<React.SetStateAction<number>>;
    shields: number;
    setShields: React.Dispatch<React.SetStateAction<number>>;
    setShieldVisible: React.Dispatch<React.SetStateAction<boolean>>;
    gameState: 'START' | 'PLAYING';
}

function GameLogic({ keys, shipPosition, setShipPosition, shipRotation, setShipRotation, laserRef, enemyRef, setScoreVal, speedRef, velocityRef, setSpeedDisplay, shields, setShields, setShieldVisible, gameState }: GameLogicProps) {
    const shakeRef = useRef(0);
    const lastHitRef = useRef(0);

    useFrame((state, delta) => {
        if (gameState !== 'PLAYING') return;

        // 1. Rotation Logic
        const rotSpeed = 2.5 * delta;
        let [rX, rY, rZ] = shipRotation;
        if (keys.current.ArrowUp) rX += rotSpeed;
        if (keys.current.ArrowDown) rX -= rotSpeed;
        if (keys.current.ArrowLeft) rY += rotSpeed;
        if (keys.current.ArrowRight) rY -= rotSpeed;
        if (keys.current.a || keys.current.A) rZ += rotSpeed;
        if (keys.current.d || keys.current.D) rZ -= rotSpeed;
        setShipRotation([rX, rY, rZ]);

        // 2. Velocity Logic
        const acceleration = 60 * delta;
        const friction = 0.985; 
        const rotationEuler = new THREE.Euler(rX, rY, rZ);
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(rotationEuler);
        const up = new THREE.Vector3(0, 1, 0).applyEuler(rotationEuler);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(rotationEuler);

        if (keys.current.w || keys.current.W) velocityRef.current.addScaledVector(forward, acceleration);
        if (keys.current.s || keys.current.S) velocityRef.current.addScaledVector(forward, -acceleration);
        if (keys.current.q || keys.current.Q) velocityRef.current.addScaledVector(right, -acceleration);
        if (keys.current.e || keys.current.E) velocityRef.current.addScaledVector(right, acceleration);
        if (keys.current.r || keys.current.R) velocityRef.current.addScaledVector(up, acceleration);
        if (keys.current.f || keys.current.F) velocityRef.current.addScaledVector(up, -acceleration);

        velocityRef.current.multiplyScalar(friction);
        const currentSpeed = velocityRef.current.length();
        speedRef.current = currentSpeed;
        setSpeedDisplay(Math.round(currentSpeed * 10) / 10);

        // 3. Position Update
        const newPos: [number, number, number] = [
            shipPosition[0] + velocityRef.current.x * delta,
            shipPosition[1] + velocityRef.current.y * delta,
            shipPosition[2] + velocityRef.current.z * delta
        ];
        setShipPosition(newPos);

        // 4. Camera Follow with Shake
        if (laserRef.current?.isFiring) {
            shakeRef.current = Math.min(0.4, shakeRef.current + delta * 3);
        } else {
            shakeRef.current = Math.max(0, shakeRef.current - delta * 5);
        }

        const camEuler = new THREE.Euler(rX, rY, 0);
        const camOffset = new THREE.Vector3(0, 6, 22).applyEuler(camEuler);
        const camPos = new THREE.Vector3(...newPos).add(camOffset);
        
        if (shakeRef.current > 0) {
            camPos.x += (Math.random() - 0.5) * shakeRef.current;
            camPos.y += (Math.random() - 0.5) * shakeRef.current;
            camPos.z += (Math.random() - 0.5) * shakeRef.current;
        }

        const lookAtOffset = new THREE.Vector3(0, 0, -25).applyEuler(camEuler);
        const lookAtPos = new THREE.Vector3(...newPos).add(lookAtOffset);

        state.camera.position.lerp(camPos, 0.15);
        state.camera.lookAt(lookAtPos);

        if (state.camera instanceof THREE.PerspectiveCamera) {
            const targetFov = 60 + (currentSpeed * 0.4);
            state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, Math.min(100, targetFov), 0.1);
            state.camera.updateProjectionMatrix();
        }

        // 5. Fire
        if (keys.current[' ']) {
             laserRef.current?.startFiring();
        } else {
             laserRef.current?.stopFiring();
        }

        // 6. Combat Check
        if (laserRef.current?.isFiring && enemyRef.current) {
            const enemies = enemyRef.current.getEnemies();
            const shipVec = new THREE.Vector3(...newPos);
            enemies.forEach(enemy => {
                if (!enemy.active) return;
                const enemyVec = new THREE.Vector3(...enemy.position);
                const toEnemy = enemyVec.clone().sub(shipVec).normalize();
                const alignment = toEnemy.dot(forward);
                if (alignment > 0.992 && shipVec.distanceTo(enemyVec) < 250) {
                     enemyRef.current?.removeEnemy(enemy.id);
                     setScoreVal(s => s + 100);
                     try {
                        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
                        if (Ctx) {
                            const ctx = new Ctx();
                            const gain = ctx.createGain();
                            const filter = ctx.createBiquadFilter();
                            filter.type = 'lowpass';
                            filter.frequency.setValueAtTime(600, ctx.currentTime);
                            filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.0);
                            
                            const bufferSize = ctx.sampleRate * 2.0;
                            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                            const data = buffer.getChannelData(0);
                            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/bufferSize, 2);
                            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);

                            const noise = ctx.createBufferSource();
                            noise.buffer = buffer;
                            gain.gain.setValueAtTime(1.5, ctx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
                            noise.connect(filter);
                            filter.connect(gain);
                            gain.connect(ctx.destination);
                            noise.start();
                        }
                    } catch (e) { }
                }
            });
        }

        // 7. Shield Regeneration & Collision
        const now = state.clock.elapsedTime;
        if (now - lastHitRef.current > 3.0) {
            setShields(prev => Math.min(100, prev + delta * 5));
        }

        if (enemyRef.current) {
            const projectiles = enemyRef.current.getProjectiles();
            const shipVec = new THREE.Vector3(...shipPosition);
            projectiles.forEach(p => {
                const pVec = new THREE.Vector3(...p.position);
                if (pVec.distanceTo(shipVec) < 6) {
                    enemyRef.current?.removeProjectile(p.id);
                    setShields(prev => Math.max(0, prev - 10));
                    setShieldVisible(true);
                    lastHitRef.current = now;
                    setTimeout(() => setShieldVisible(false), 300);
                }
            });
        }
    });
    return null;
}
