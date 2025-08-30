import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ScrollAnimations from './ScrollAnimations';
import ParallaxSection from './ParallaxSection';

const GameShowcase: React.FC = () => {
  const [activeGame, setActiveGame] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const games = [
    {
      title: "Tank Battle",
      description: "3D tank combat with realistic physics",
      tech: ["Three.js", "WebGL", "Physics"],
      color: "#ff6b6b"
    },
    {
      title: "Space Explorer", 
      description: "Navigate through asteroid fields",
      tech: ["React", "Canvas", "Audio"],
      color: "#4ecdc4"
    },
    {
      title: "Puzzle Master",
      description: "Mind-bending 3D puzzles",
      tech: ["TypeScript", "GSAP", "WebGL"],
      color: "#45b7d1"
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)));
      setScrollProgress(progress);
      
      const gameIndex = Math.floor(progress * games.length);
      setActiveGame(Math.min(gameIndex, games.length - 1));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [games.length]);

  return (
    <section 
      ref={containerRef}
      style={{
        height: '400vh',
        position: 'relative',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
      }}
    >
      {/* Fixed Game Display */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 5%'
      }}>
        
        {/* Game Info */}
        <ScrollAnimations animation="slideLeft" delay={0.2}>
          <div style={{
            flex: 1,
            maxWidth: '400px',
            color: 'white'
          }}>
            <h2 style={{
              fontSize: '3rem',
              fontWeight: '700',
              marginBottom: '1rem',
              color: games[activeGame].color
            }}>
              {games[activeGame].title}
            </h2>
            
            <p style={{
              fontSize: '1.2rem',
              lineHeight: '1.6',
              marginBottom: '2rem',
              opacity: 0.9
            }}>
              {games[activeGame].description}
            </p>
            
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              {games[activeGame].tech.map((tech, index) => (
                <span
                  key={tech}
                  style={{
                    padding: '0.5rem 1rem',
                    background: `${games[activeGame].color}20`,
                    border: `1px solid ${games[activeGame].color}`,
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    color: games[activeGame].color
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </ScrollAnimations>

        {/* 3D Game Preview */}
        <div style={{
          flex: 1,
          height: '60vh',
          maxWidth: '600px'
        }}>
          <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <mesh rotation={[scrollProgress * Math.PI, scrollProgress * Math.PI * 2, 0]}>
              <boxGeometry args={[2, 2, 2]} />
              <meshStandardMaterial color={games[activeGame].color} />
            </mesh>
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
          </Canvas>
        </div>
      </div>

      {/* Game Navigation */}
      <div style={{
        position: 'fixed',
        left: '2rem',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 100
      }}>
        {games.map((game, index) => (
          <div
            key={game.title}
            style={{
              width: '4px',
              height: activeGame === index ? '60px' : '30px',
              background: activeGame === index ? game.color : 'rgba(255,255,255,0.3)',
              marginBottom: '1rem',
              borderRadius: '2px',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
          />
        ))}
      </div>

      {/* Floating Particles */}
      <ParallaxSection speed={0.3}>
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}>
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '2px',
                height: '2px',
                background: games[activeGame].color,
                borderRadius: '50%',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.6,
                animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`
              }}
            />
          ))}
        </div>
      </ParallaxSection>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </section>
  );
};

export default GameShowcase;