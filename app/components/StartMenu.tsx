'use client';

interface StartMenuProps {
  onStart: () => void;
}

export default function StartMenu({ onStart }: StartMenuProps) {
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
      backgroundColor: 'rgba(1, 1, 5, 0.85)',
      zIndex: 900,
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '60px'
      }}>
        <h1 style={{
          fontSize: '64px',
          margin: 0,
          letterSpacing: '8px',
          textShadow: '0 0 20px #00ffff',
          fontWeight: '900'
        }}>
          STAR TREK: VOYAGER
        </h1>
        <div style={{
          fontSize: '18px',
          letterSpacing: '4px',
          opacity: 0.8,
          marginTop: '10px'
        }}>
          TACTICAL SIMULATION [DELTA QUADRANT]
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          backgroundColor: 'transparent',
          border: '2px solid #00ffff',
          color: '#00ffff',
          padding: '20px 60px',
          fontSize: '24px',
          fontFamily: "'Orbitron', sans-serif",
          cursor: 'pointer',
          letterSpacing: '4px',
          transition: 'all 0.3s ease',
          boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#00ffff';
          e.currentTarget.style.color = '#000';
          e.currentTarget.style.boxShadow = '0 0 40px #00ffff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#00ffff';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.2)';
        }}
      >
        START MISSION
      </button>

      <div style={{
        marginTop: '100px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 150px)',
        gap: '40px',
        opacity: 0.6
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#ffcc00' }}>NAVIGATION</div>
          <div style={{ fontSize: '12px' }}>W/A/S/D / ARROWS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#ffcc00' }}>TACTICAL</div>
          <div style={{ fontSize: '12px' }}>SPACEBAR</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#ffcc00' }}>ALTITUDE</div>
          <div style={{ fontSize: '12px' }}>R / F</div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '40px',
        fontSize: '10px',
        opacity: 0.3,
        textAlign: 'right'
      }}>
        SECURE CHANNEL ACTIVE <br/>
        STARFLEET COMMAND // ST-31
      </div>
    </div>
  );
}
