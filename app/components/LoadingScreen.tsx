'use client';

import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const { active, progress, errors, item, loaded, total } = useProgress();
  const [shown, setShown] = useState(true);

  useEffect(() => {
    if (!active) {
      const timer = setTimeout(() => setShown(false), 500);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!shown) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#010105',
      zIndex: 1000,
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
      transition: 'opacity 0.5s ease-in-out',
      opacity: active ? 1 : 0,
      pointerEvents: active ? 'all' : 'none'
    }}>
      <div style={{
        fontSize: '24px',
        marginBottom: '20px',
        letterSpacing: '4px',
        textShadow: '0 0 10px #00ffff'
      }}>
        INITIALIZING NEURAL INTERFACE...
      </div>
      
      <div style={{
        width: '300px',
        height: '4px',
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: '#00ffff',
          boxShadow: '0 0 15px #00ffff',
          transition: 'width 0.2s ease-out'
        }} />
      </div>

      <div style={{
        marginTop: '15px',
        fontSize: '12px',
        opacity: 0.6,
        textTransform: 'uppercase'
      }}>
        {progress < 100 ? `Loading Subsystems: ${Math.round(progress)}%` : 'Systems Ready'}
      </div>

      <div style={{
        position: 'absolute',
        bottom: '40px',
        fontSize: '10px',
        opacity: 0.4,
        letterSpacing: '2px'
      }}>
        LCARS VERSION 9.2 // STARSHIP OPERATIONS
      </div>
    </div>
  );
}
