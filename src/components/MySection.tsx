import React from 'react';

const MySection: React.FC = () => {
  return (
    <section style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      position: 'relative'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '800px',
        padding: '2rem'
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: '700',
          marginBottom: '1rem',
          background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Lim Jun Hao
        </h1>
        
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '400',
          marginBottom: '2rem',
          opacity: 0.9
        }}>
          Full-Stack Developer & 3D Enthusiast
        </h2>
        
        <p style={{
          fontSize: '1.1rem',
          lineHeight: '1.6',
          opacity: 0.8,
          marginBottom: '3rem'
        }}>
          Crafting immersive web experiences with React, Three.js, and modern technologies.
          Passionate about creating interactive applications that push the boundaries of web development.
        </p>

        <div style={{
          display: 'flex',
          gap: '2rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{
            padding: '1rem 2rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <strong>React</strong> • <strong>TypeScript</strong> • <strong>Three.js</strong>
          </div>
          
          <div style={{
            padding: '1rem 2rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <strong>Node.js</strong> • <strong>Python</strong> • <strong>WebGL</strong>
          </div>
        </div>
      </div>

      {/* Floating particles */}
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            background: '#6366f1',
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.6,
            animation: `float ${3 + Math.random() * 2}s ease-in-out infinite ${Math.random() * 2}s`
          }}
        />
      ))}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </section>
  );
};

export default MySection;