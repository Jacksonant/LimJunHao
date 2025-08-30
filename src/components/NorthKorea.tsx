import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import { useLoading } from "../contexts/LoadingContext";
import NorthKoreaModel from "./three/NorthKoreaModel";

const NorthKorea: React.FC = () => {
  const { completeLoading } = useLoading();
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollAttempts, setScrollAttempts] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const lastScrollTime = useRef(0);

  useEffect(() => {
    const handleWheel = () => {
      if (!isPlaying) {
        const now = Date.now();
        if (now - lastScrollTime.current > 100) {
          setScrollAttempts(prev => prev + 1);
          lastScrollTime.current = now;
          
          if (scrollAttempts > 3) {
            setShowScrollHint(true);
            setTimeout(() => setShowScrollHint(false), 3000);
          }
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlaying) {
        setIsPlaying(false);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scrollAttempts, isPlaying]);

  return (
    <section id="hero" style={{ height: "100vh", position: "relative" }}>
      
      {/* Play Button Overlay */}
      {!isPlaying && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(5px)",
            cursor: "pointer"
          }}
          onClick={() => setIsPlaying(true)}
        >
          <div
            style={{
              textAlign: "center",
              color: "white"
            }}
          >
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                border: "3px solid rgba(255,255,255,0.5)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "25px solid white",
                  borderTop: "15px solid transparent",
                  borderBottom: "15px solid transparent",
                  marginLeft: "8px"
                }}
              />
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              🎮 Tank Battle
            </h2>
            <p style={{ fontSize: "1.1rem", opacity: 0.9 }}>
              Click to start the interactive tank experience
            </p>
          </div>
        </div>
      )}
      <div className="absolute inset-0 z-10" style={{ height: "100vh", pointerEvents: isPlaying ? "auto" : "none" }}>
        <Canvas
          shadows
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ pointerEvents: "auto" }}
          onCreated={() => {
            // Once Three.js canvas is created, complete loading
            setTimeout(completeLoading, 1000);
          }}
        >
          <ambientLight intensity={0.5} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            intensity={1}
            castShadow
          />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <NorthKoreaModel isActive={isPlaying} />
          <OrbitControls
            enabled={isPlaying}
            enableZoom={isPlaying}
            enablePan={isPlaying}
            enableRotate={isPlaying}
            autoRotate={false}
            minDistance={0.5}
            maxDistance={50}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Canvas>
      </div>

      {/* Control Instructions - Only show when playing */}
      {isPlaying && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            zIndex: 20,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: "white",
            padding: "8px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          <div>WASD / Arrow Keys</div>
          <div>Enter: Fire Cannon</div>
          <div>Space: Machine Gun</div>
          <div>Mouse: Look Around</div>
          <div>Scroll: Zoom In/Out</div>
          <div style={{ marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.3)", paddingTop: "4px" }}>
            <strong>ESC: Exit Game</strong>
          </div>
        </div>
      )}

      {/* Enhanced Scroll Indicator - Only show when not playing */}
      {!isPlaying && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            color: "white",
            textAlign: "center",
            animation: "bounce 2s infinite",
            background: showScrollHint ? 'rgba(255,255,255,0.1)' : 'transparent',
            padding: showScrollHint ? '1rem' : '0',
            borderRadius: '10px',
            backdropFilter: showScrollHint ? 'blur(10px)' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ fontSize: "14px", marginBottom: "8px" }}>
            {showScrollHint ? "Keep scrolling to see more!" : "Scroll Down"}
          </div>
          <div style={{ fontSize: "24px" }}>↓</div>
        </div>
      )}

      {/* Exit Button - Only show when playing */}
      {isPlaying && (
        <button
          onClick={() => setIsPlaying(false)}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 20,
            background: "rgba(255,0,0,0.8)",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,0,0,1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,0,0,0.8)";
          }}
        >
          ✕ Exit Game
        </button>
      )}

      <style>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          40% {
            transform: translateX(-50%) translateY(-10px);
          }
          60% {
            transform: translateX(-50%) translateY(-5px);
          }
        }
      `}</style>
    </section>
  );
};

export default NorthKorea;
