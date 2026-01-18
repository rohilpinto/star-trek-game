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
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [rank, setRank] = useState('Ensign');
  const [speedDisplay, setSpeedDisplay] = useState(0.0);
  const [shields, setShields] = useState(100);
  const [hull, setHull] = useState(100);
  const [distanceFromStarbase, setDistanceFromStarbase] = useState(0);
  const maxShields = 100;
  const maxHull = 100;
  const [shieldVisible, setShieldVisible] = useState(false);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  
  const xpToNextRank = 1000;
  const rankTitles = ['Ensign', 'Lieutenant', 'Commander', 'Captain', 'Admiral'];

  useEffect(() => {
    const rankIndex = Math.min(rankTitles.length - 1, Math.floor(xp / xpToNextRank));
    setRank(rankTitles[rankIndex]);
  }, [xp]);
  
  const shipPositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const shipRotationRef = useRef(new THREE.Euler(0, 0, 0));
  const starshipRef = useRef<THREE.Group>(null);
  const speedRef = useRef(0.0);
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const laserRef = useRef<LasersHandle>(null);
  const enemyRef = useRef<EnemiesHandle>(null);
  
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 's', 'a', 'd', 'q', 'e', 'r', 'f', '1', '2'].includes(e.key.toLowerCase())) {
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
    setXp(0);
    setShields(100);
    setHull(100);
    setGameState('PLAYING');
    shipPositionRef.current.set(0, 0, 0);
    shipRotationRef.current.set(0, 0, 0);
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
            {gameState !== 'GAMEOVER' && (
                <>
                    <StarField velocityRef={velocityRef} shipPositionRef={shipPositionRef} />
                    <Starship ref={starshipRef} shieldVisible={shieldVisible} />
                    <Lasers ref={laserRef} shipPositionRef={shipPositionRef} shipRotationRef={shipRotationRef} />
                    <Enemies ref={enemyRef} velocityRef={velocityRef} shipPositionRef={shipPositionRef} />
                </>
            )}
            
            <GameLogic 
                keys={keys} 
                shipPositionRef={shipPositionRef}
                shipRotationRef={shipRotationRef}
                starshipRef={starshipRef}
                laserRef={laserRef}
                enemyRef={enemyRef}
                setScoreVal={setScore}
                setXpVal={setXp}
                speedRef={speedRef}
                velocityRef={velocityRef}
                setSpeedDisplay={setSpeedDisplay}
                setDistanceVal={setDistanceFromStarbase}
                shields={shields}
                setShields={setShields}
                hull={hull}
                setHull={setHull}
                setShieldVisible={setShieldVisible}
                gameState={gameState}
                setGameState={setGameState}
            />
            
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
        fontFamily: "'Orbitron', sans-serif", fontSize: '24px', pointerEvents: 'none',
        textShadow: '0 0 10px #00ffff',
        fontWeight: 'bold'
      }}>
        LCARS OVERRIDE [VGR-74656] <br/>
        <div style={{ fontSize: '12px', color: '#ffcc00', letterSpacing: '1px', marginBottom: '10px' }}>
            DISTANCE FROM STARBASE: {distanceFromStarbase.toLocaleString()} KM
        </div>
        <div style={{ fontSize: '18px', display: 'flex', justifyContent: 'space-between', width: '300px' }}>
            <span>KILLS: {score}</span>
            <span style={{ color: '#ffcc00' }}>RANK: {rank.toUpperCase()}</span>
        </div>
        
        {/* Shield Bar */}
        <div style={{ marginTop: '10px', width: '300px', height: '10px', background: 'rgba(0,255,255,0.1)', border: '1px solid #00ffff' }}>
            <div style={{ width: `${(shields / maxShields) * 100}%`, height: '100%', background: '#00ffff', transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: '11px', color: '#00ffff', marginBottom: '4px' }}>SHIELD INTEGRITY: {Math.round(shields)}%</div>

        {/* Hull Bar */}
        <div style={{ width: '300px', height: '10px', background: 'rgba(255,0,0,0.1)', border: '1px solid #ff0000' }}>
            <div style={{ width: `${(hull / maxHull) * 100}%`, height: '100%', background: '#ff0000', transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: '11px', color: '#ff0000', marginBottom: '10px' }}>HULL INTEGRITY: {Math.round(hull)}%</div>

        {/* XP Bar */}
        <div style={{ width: '300px', height: '6px', background: 'rgba(255,204,0,0.1)', border: '1px solid #ffcc00' }}>
            <div style={{ width: `${(xp % xpToNextRank) / xpToNextRank * 100}%`, height: '100%', background: '#ffcc00', transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: '11px', color: '#ffcc00', marginBottom: '20px' }}>XP: {xp % xpToNextRank} / {xpToNextRank} TO NEXT RANK</div>
        
        <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '10px', color: '#666' }}>ACTIVE WEAPON</div>
            <div style={{ 
                color: laserRef.current?.weapon === 'PHASERS' ? '#ffcc00' : '#00ffff',
                fontSize: '14px',
                textShadow: laserRef.current?.weapon === 'PHASERS' ? '0 0 5px #ffcc00' : 'none'
            }}>
                [1] PHASERS {laserRef.current?.weapon === 'PHASERS' ? '<<' : ''}
            </div>
            <div style={{ 
                color: laserRef.current?.weapon === 'TORPEDOES' ? '#ff3300' : '#00ffff',
                fontSize: '14px',
                textShadow: laserRef.current?.weapon === 'TORPEDOES' ? '0 0 5px #ff3300' : 'none'
            }}>
                [2] PHOTON TORPEDOES {laserRef.current?.weapon === 'TORPEDOES' ? '<<' : ''}
            </div>
        </div>

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

      {gameState === 'GAMEOVER' && (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(50, 0, 0, 0.7)', backdropFilter: 'blur(15px)', zIndex: 1000,
            fontFamily: "'Orbitron', sans-serif", color: '#ff0000', textAlign: 'center'
        }}>
            <h1 style={{ fontSize: '72px', letterSpacing: '20px', textShadow: '0 0 30px #ff0000', margin: 0 }}>VESSEL DESTROYED</h1>
            <p style={{ fontSize: '20px', color: '#fff', marginBottom: '40px', letterSpacing: '4px', opacity: 0.8 }}>SIMULATION TERMINATED [CODE 47-B]</p>
            <button 
                onClick={resetGame}
                style={{
                    background: 'transparent', border: '2px solid #ff0000', color: '#ff0000',
                    padding: '20px 60px', fontSize: '24px', fontFamily: "'Orbitron', sans-serif",
                    cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 0 15px rgba(255, 0, 0, 0.2)',
                    letterSpacing: '2px'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ff0000';
                    e.currentTarget.style.color = '#000';
                    e.currentTarget.style.boxShadow = '0 0 40px #ff0000';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#ff0000';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.2)';
                }}
            >
                RESTART SIMULATION
            </button>
        </div>
      )}
    </div>
  );
}

interface GameLogicProps {
    keys: React.MutableRefObject<{ [key: string]: boolean }>;
    shipPositionRef: React.MutableRefObject<THREE.Vector3>;
    shipRotationRef: React.MutableRefObject<THREE.Euler>;
    starshipRef: React.RefObject<THREE.Group | null>;
    laserRef: React.RefObject<LasersHandle | null>;
    enemyRef: React.RefObject<EnemiesHandle | null>;
    setScoreVal: React.Dispatch<React.SetStateAction<number>>;
    setXpVal: React.Dispatch<React.SetStateAction<number>>;
    speedRef: React.MutableRefObject<number>;
    velocityRef: React.MutableRefObject<THREE.Vector3>;
    setSpeedDisplay: React.Dispatch<React.SetStateAction<number>>;
    setDistanceVal: React.Dispatch<React.SetStateAction<number>>;
    shields: number;
    setShields: React.Dispatch<React.SetStateAction<number>>;
    hull: number;
    setHull: React.Dispatch<React.SetStateAction<number>>;
    setShieldVisible: React.Dispatch<React.SetStateAction<boolean>>;
    gameState: 'START' | 'PLAYING' | 'GAMEOVER';
    setGameState: React.Dispatch<React.SetStateAction<'START' | 'PLAYING' | 'GAMEOVER'>>;
}

function GameLogic({ keys, shipPositionRef, shipRotationRef, starshipRef, laserRef, enemyRef, setScoreVal, setXpVal, speedRef, velocityRef, setSpeedDisplay, setDistanceVal, shields, setShields, hull, setHull, setShieldVisible, gameState, setGameState }: GameLogicProps) {
    const shakeRef = useRef(0);
    const lastHitRef = useRef(0);
    const frameCount = useRef(0);

    useFrame((state, delta) => {
        if (gameState !== 'PLAYING') return;

        // 1. Rotation Logic
        const rotSpeed = 2.5 * delta;
        if (keys.current.ArrowUp) shipRotationRef.current.x += rotSpeed;
        if (keys.current.ArrowDown) shipRotationRef.current.x -= rotSpeed;
        if (keys.current.ArrowLeft) shipRotationRef.current.y += rotSpeed;
        if (keys.current.ArrowRight) shipRotationRef.current.y -= rotSpeed;
        if (keys.current.a || keys.current.A) shipRotationRef.current.z += rotSpeed;
        if (keys.current.d || keys.current.D) shipRotationRef.current.z -= rotSpeed;

        // 2. Velocity Logic
        const acceleration = 60 * delta;
        const friction = 0.985; 
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(shipRotationRef.current);
        const up = new THREE.Vector3(0, 1, 0).applyEuler(shipRotationRef.current);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(shipRotationRef.current);

        if (keys.current.w || keys.current.W) velocityRef.current.addScaledVector(forward, acceleration);
        if (keys.current.s || keys.current.S) velocityRef.current.addScaledVector(forward, -acceleration);
        if (keys.current.q || keys.current.Q) velocityRef.current.addScaledVector(right, -acceleration);
        if (keys.current.e || keys.current.E) velocityRef.current.addScaledVector(right, acceleration);
        if (keys.current.r || keys.current.R) velocityRef.current.addScaledVector(up, acceleration);
        if (keys.current.f || keys.current.F) velocityRef.current.addScaledVector(up, -acceleration);

        velocityRef.current.multiplyScalar(friction);
        const currentSpeed = velocityRef.current.length();
        speedRef.current = currentSpeed;
        
        // Update HUD display less frequently to save React cycles
        frameCount.current++;
        if (frameCount.current % 10 === 0) {
            setSpeedDisplay(Math.round(currentSpeed * 10) / 10);
            setDistanceVal(Math.round(shipPositionRef.current.length()));
        }

        // 3. Position Update
        shipPositionRef.current.addScaledVector(velocityRef.current, delta);
        
        // Sync Visual Starship
        if (starshipRef.current) {
            starshipRef.current.position.copy(shipPositionRef.current);
            starshipRef.current.rotation.copy(shipRotationRef.current);
            // Dynamic Banking
            const banking = -velocityRef.current.dot(right) * 0.01;
            starshipRef.current.rotation.z += banking;
        }

        // 4. Camera Follow with Shake
        if (laserRef.current?.isFiring) {
            shakeRef.current = Math.min(0.4, shakeRef.current + delta * 3);
        } else {
            shakeRef.current = Math.max(0, shakeRef.current - delta * 5);
        }

        const camEuler = new THREE.Euler(shipRotationRef.current.x, shipRotationRef.current.y, 0);
        const camOffset = new THREE.Vector3(0, 6, 22).applyEuler(camEuler);
        const camPos = shipPositionRef.current.clone().add(camOffset);
        
        if (shakeRef.current > 0) {
            camPos.x += (Math.random() - 0.5) * shakeRef.current;
            camPos.y += (Math.random() - 0.5) * shakeRef.current;
            camPos.z += (Math.random() - 0.5) * shakeRef.current;
        }

        const lookAtOffset = new THREE.Vector3(0, 0, -25).applyEuler(camEuler);
        const lookAtPos = shipPositionRef.current.clone().add(lookAtOffset);

        state.camera.position.lerp(camPos, 0.15);
        state.camera.lookAt(lookAtPos);

        if (state.camera instanceof THREE.PerspectiveCamera) {
            const targetFov = 60 + (currentSpeed * 0.4);
            state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, Math.min(100, targetFov), 0.1);
            state.camera.updateProjectionMatrix();
        }

        // 5. Fire & Weapon Select
        if (keys.current['1']) laserRef.current?.startFiring('PHASERS');
        if (keys.current['2']) laserRef.current?.startFiring('TORPEDOES');

        if (keys.current[' ']) {
             laserRef.current?.startFiring();
        } else {
             laserRef.current?.stopFiring();
        }

        // 6. Combat Check (Phasers & Torpedoes & Collisions)
        if (enemyRef.current && gameState === 'PLAYING') {
            const enemies = enemyRef.current.getEnemies();
            
            // Player vs Enemy Ship Collision
            enemies.forEach(enemy => {
                if (!enemy.active) return;
                const dist = shipPositionRef.current.distanceTo(enemy.position);
                
                if (dist < 18) { // Collision radius
                    // Apply Damage (with cooldown)
                    if (state.clock.elapsedTime - lastHitRef.current > 0.5) {
                        const damage = 25;
                        if (shields > 0) {
                            setShields(prev => Math.max(0, prev - damage));
                            setShieldVisible(true);
                        } else {
                            setHull(prev => {
                                const next = Math.max(0, prev - damage);
                                if (next === 0) setGameState('GAMEOVER');
                                return next;
                            });
                        }
                        
                        shakeRef.current = 1.0;
                        lastHitRef.current = state.clock.elapsedTime;
                        
                        // Knockback
                        const pushDir = enemy.position.clone().sub(shipPositionRef.current).normalize();
                        enemy.velocity.addScaledVector(pushDir, 40);
                        velocityRef.current.addScaledVector(pushDir.negate(), 5);
                    }
                }
            });

            // Enemy Projectile Collision
            const projectiles = enemyRef.current.getProjectiles();
            projectiles.forEach(p => {
                const dist = p.position.distanceTo(shipPositionRef.current);
                if (dist < 10) {
                    if (state.clock.elapsedTime - lastHitRef.current > 0.3) {
                        const damage = 10;
                        if (shields > 0) {
                            setShields(prev => Math.max(0, prev - damage));
                            setShieldVisible(true);
                        } else {
                            setHull(prev => {
                                const next = Math.max(0, prev - damage);
                                if (next === 0) setGameState('GAMEOVER');
                                return next;
                            });
                        }
                        shakeRef.current = 0.5;
                        lastHitRef.current = state.clock.elapsedTime;
                        p.life = 0; // Destroy projectile
                    }
                }
            });

            // Phaser Collision (Hitscan-like)
            if (laserRef.current?.isFiring && laserRef.current.weapon === 'PHASERS') {
                enemies.forEach(enemy => {
                    if (!enemy.active) return;
                    const enemyVec = enemy.position;
                    const toEnemy = enemyVec.clone().sub(shipPositionRef.current).normalize();
                    const alignment = toEnemy.dot(forward);
                    if (alignment > 0.992 && shipPositionRef.current.distanceTo(enemyVec) < 250) {
                        enemyRef.current?.removeEnemy(enemy.id);
                        setScoreVal(s => s + 100);
                        setXpVal(x => x + 250);
                    }
                });
            }

            // Torpedo Collision (Projectile)
            const torpedoes = laserRef.current?.getTorpedoes() || [];
            torpedoes.forEach(t => {
                enemies.forEach(enemy => {
                    if (!enemy.active) return;
                    if (t.position.distanceTo(enemy.position) < 15) {
                        enemyRef.current?.removeEnemy(enemy.id);
                        setScoreVal(s => s + 200);
                        setXpVal(x => x + 500);
                        t.life = 0; // Destroy torpedo on hit
                    }
                });
            });
        }

        // 7. Shield Regeneration & Collision
        const now = state.clock.elapsedTime;
        if (now - lastHitRef.current > 3.0) {
            setShields(prev => Math.min(100, prev + delta * 5));
        }
    });
    return null;
}
