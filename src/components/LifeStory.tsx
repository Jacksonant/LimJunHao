'use client';

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import HumanModel from "./three/HumanModel";

const LifeStory: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isStageChanging, setIsStageChanging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);

  // Lightning sound effect
  const playLightningSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Lightning crack sound
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      console.log('Audio not supported');
    }
  };

  const lifeStages = useMemo(
    () => [
      {
        age: "Early Years",
        year: "2000-2005",
        story:
          "Born in Kuala Lumpur, Malaysia. The foundation years of curiosity, wonder, and endless possibilities. Every day brought new discoveries and the joy of learning.",
        color: "#6366f1",
        accent: "#6366f1",
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        theme: "discovery",
      },
      {
        age: "Student",
        year: "2006-2012",
        story:
          "Academic excellence and technological fascination. First encounters with programming, robotics, and the digital world that would shape my future career path.",
        color: "#8b5cf6",
        accent: "#8b5cf6",
        gradient: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
        theme: "learning",
      },
      {
        age: "Explorer",
        year: "2013-2017",
        story:
          "High school innovation and creative problem-solving. Mastered Python, built first applications, and discovered the power of code to transform ideas into reality.",
        color: "#06b6d4",
        accent: "#06b6d4",
        gradient: "linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)",
        theme: "innovation",
      },
      {
        age: "Scholar",
        year: "2018-2022",
        story:
          "University excellence in Computer Science. Internships at leading tech companies, hackathon victories, and building scalable applications that impact thousands of users.",
        color: "#10b981",
        accent: "#10b981",
        gradient: "linear-gradient(135deg, #059669 0%, #0ea5e9 100%)",
        theme: "achievement",
      },
      {
        age: "Professional",
        year: "2023-Present",
        story:
          "Senior Full-Stack Engineer crafting enterprise solutions. Leading teams, architecting scalable systems, and pushing the boundaries of modern web development.",
        color: "#f59e0b",
        accent: "#f59e0b",
        gradient: "linear-gradient(135deg, #f59e0b 0%, #10b981 100%)",
        theme: "mastery",
      },
    ],
    []
  );

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const containerHeight = containerRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;

        const progress = Math.max(
          0,
          Math.min(1, -rect.top / (containerHeight - viewportHeight))
        );
        setScrollProgress(progress);

        const stageIndex = Math.floor(progress * (lifeStages.length - 1));
        const newStage = Math.min(stageIndex, lifeStages.length - 1);
        
        if (newStage !== currentStage) {
          setIsStageChanging(true);
          playLightningSound();
          setTimeout(() => setIsStageChanging(false), 300);
        }
        
        setCurrentStage(newStage);

        setIsVisible(rect.bottom > 0 && rect.top < viewportHeight);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [lifeStages.length, currentStage]);

  const currentStageData = lifeStages[currentStage] || lifeStages[0];
  const stageProgress = (scrollProgress * (lifeStages.length - 1)) % 1;
  const smoothProgress = scrollProgress;

  return (
    <>
      <style>{`
        html, body {
          overflow-x: hidden;
          max-width: 100vw;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
      <section
        ref={containerRef}
        style={{
          height: "600vh",
          position: "relative",
          background: "#000000",
          transition: "background 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          overflowX: "hidden",
          width: "100vw",
          maxWidth: "100%",
        }}
      >
        {/* Lightning Effect Overlay */}
        {isStageChanging && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              pointerEvents: "none",
              background: `radial-gradient(circle at 50% 50%, ${currentStageData.accent}40 0%, transparent 70%)`,
              animation: "lightning 0.3s ease-out, screenShake 0.15s ease-out",
            }}
          >
            {/* Lightning Flash */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255, 255, 255, 0.9)",
                animation: "flash 0.3s ease-out",
              }}
            />
            
            {/* Electric Bolts */}
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: "2px",
                  height: "60vh",
                  background: `linear-gradient(180deg, ${currentStageData.accent}, transparent)`,
                  transform: `rotate(${i * 45}deg) translateY(-50%)`,
                  transformOrigin: "center top",
                  animation: `bolt 0.15s ease-out ${i * 0.01}s`,
                  boxShadow: `0 0 20px ${currentStageData.accent}`,
                }}
              />
            ))}
            
            {/* Shining Particles */}
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  width: "4px",
                  height: "4px",
                  background: currentStageData.accent,
                  borderRadius: "50%",
                  animation: `sparkle 0.2s ease-out ${i * 0.005}s`,
                  boxShadow: `0 0 10px ${currentStageData.accent}`,
                }}
              />
            ))}
          </div>
        )}

        {/* Sophisticated Background Elements */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          {/* Animated Background Effects */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at ${
                50 + Math.sin(smoothProgress * Math.PI) * 30
              }% ${50 + Math.cos(smoothProgress * Math.PI) * 20}%, ${
                currentStageData.accent
              }20 0%, transparent 70%)`,
              transition: "all 1.5s ease",
            }}
          />

          {/* Subtle grid pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(${currentStageData.accent}10 1px, transparent 1px), linear-gradient(90deg, ${currentStageData.accent}10 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
              opacity: 0.3,
            }}
          />

          {/* Floating Geometric Elements */}
          {Array.from({ length: 12 }, (_, i) => {
            const delay = i * 0.5;
            const size = 8 + (i % 3) * 4;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: `${size}px`,
                  height: `${size}px`,
                  background: `${currentStageData.accent}60`,
                  borderRadius: i % 2 ? "50%" : "2px",
                  left: `${15 + ((i * 7) % 70)}%`,
                  top: `${20 + ((i * 11) % 60)}%`,
                  transform: `translateY(${
                    Math.sin(smoothProgress * Math.PI * 2 + delay) * 30
                  }px) rotate(${smoothProgress * 360 + i * 45}deg)`,
                  opacity:
                    0.4 + Math.sin(smoothProgress * Math.PI + delay) * 0.2,
                  transition: "background 0.8s ease",
                  backdropFilter: "blur(1px)",
                }}
              />
            );
          })}
        </div>

        {/* Premium 3D Scene */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 10,
          }}
        >
          <Canvas
            camera={{ position: [0, 0, 3], fov: 60, near: 0.1, far: 1000 }}
            style={{ background: "transparent", width: "100%" }}
          >
            <ambientLight intensity={1.5} />
            <directionalLight position={[5, 5, 5]} intensity={3} />
            <pointLight position={[0, 5, 0]} intensity={2} color="white" />

            {isVisible && (
              <HumanModel
                growthStage={currentStage}
                stageData={currentStageData}
                isStageChanging={isStageChanging}
              />
            )}

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.3}
              enableDamping
              dampingFactor={0.05}
            />
          </Canvas>
        </div>

        {/* Creative Speech Bubble from Human */}
        <div
          style={{
            position: "fixed",
            right: currentStage % 2 === 0 ? "5%" : "25%",
            left: currentStage % 2 === 0 ? "60%" : "15%",
            top: "20%",
            maxWidth: "350px",
            zIndex: 25,
            transition: "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            opacity: isVisible ? 1 : 0,
            transform: `translateX(${isStageChanging ? (currentStage % 2 === 0 ? '50px' : '-50px') : '0px'}) translateY(${
              Math.sin(stageProgress * Math.PI) * 10
            }px) scale(${isVisible ? 1 : 0.9})`,
          }}
        >
          {/* Speech Bubble */}
          <div
            style={{
              position: "relative",
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              backdropFilter: "blur(10px)",
              border: `2px solid ${currentStageData.accent}40`,
            }}
          >
            {/* Speech Bubble Tail */}
            <div
              style={{
                position: "absolute",
                left: currentStage % 2 === 0 ? "-10px" : "auto",
                right: currentStage % 2 === 0 ? "auto" : "-10px",
                top: "50%",
                transform: "translateY(-50%)",
                width: 0,
                height: 0,
                borderTop: "15px solid transparent",
                borderBottom: "15px solid transparent",
                borderRight: currentStage % 2 === 0 ? "15px solid rgba(255, 255, 255, 0.95)" : "none",
                borderLeft: currentStage % 2 === 0 ? "none" : "15px solid rgba(255, 255, 255, 0.95)",
              }}
            />

            {/* Stage Icon */}
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
              {currentStage === 0 && "🧸"}
              {currentStage === 1 && "📚"}
              {currentStage === 2 && "💻"}
              {currentStage === 3 && "🎓"}
              {currentStage === 4 && "💼"}
            </div>

            {/* Age Badge */}
            <div
              style={{
                display: "inline-block",
                background: currentStageData.accent,
                color: "white",
                padding: "0.3rem 0.8rem",
                borderRadius: "15px",
                fontSize: "0.8rem",
                fontWeight: "600",
                marginBottom: "0.8rem",
              }}
            >
              {currentStageData.year}
            </div>

            {/* Title */}
            <h3
              style={{
                color: "#333",
                fontSize: "1.4rem",
                fontWeight: "700",
                marginBottom: "0.8rem",
                margin: 0,
              }}
            >
              {currentStageData.age}
            </h3>

            {/* Story */}
            <p
              style={{
                color: "#666",
                fontSize: "0.9rem",
                lineHeight: "1.5",
                margin: 0,
              }}
            >
              {currentStageData.story}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        {isVisible && (
          <div
            style={{
              position: "fixed",
              bottom: "5%",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "0.5rem",
              zIndex: 25,
            }}
          >
          {lifeStages.map((stage, index) => (
            <div
              key={index}
              style={{
                width: index <= currentStage ? "30px" : "10px",
                height: "4px",
                borderRadius: "2px",
                background:
                  index <= currentStage
                    ? stage.accent
                    : "rgba(255,255,255,0.3)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
          </div>
        )}

        {/* Hidden original content panel for reference */}
        <div style={{ display: "none" }}>
          {/* Timeline Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.5rem 1rem",
              background: `${currentStageData.accent}15`,
              color: currentStageData.accent,
              borderRadius: "12px",
              fontSize: "0.875rem",
              fontWeight: "600",
              marginBottom: "1.5rem",
              border: `1px solid ${currentStageData.accent}25`,
              transform: `translateY(${(1 - stageProgress) * 8}px)`,
              opacity: 0.8 + stageProgress * 0.2,
              transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: currentStageData.accent,
                marginRight: "0.5rem",
                animation: "pulse 2s infinite",
              }}
            />
            {currentStageData.year}
          </div>

          {/* Stage Title */}
          <h2
            style={{
              color: "#1a1a1a",
              marginBottom: "1.5rem",
              fontSize: "2.75rem",
              fontWeight: "700",
              lineHeight: "1.1",
              letterSpacing: "-0.02em",
              transform: `translateY(${(1 - stageProgress) * 12}px)`,
              opacity: 0.9 + stageProgress * 0.1,
              transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
              backgroundImage: `linear-gradient(135deg, #1a1a1a 0%, ${currentStageData.accent} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {currentStageData.age}
          </h2>

          {/* Story Content */}
          <p
            style={{
              color: "#4a5568",
              fontSize: "1.125rem",
              lineHeight: "1.7",
              marginBottom: "2rem",
              transform: `translateY(${(1 - stageProgress) * 16}px)`,
              opacity: 0.7 + stageProgress * 0.3,
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {currentStageData.story}
          </p>

          {/* Progress Visualization */}
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: "rgba(248, 250, 252, 0.8)",
              borderRadius: "16px",
              border: "1px solid rgba(226, 232, 240, 0.8)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#64748b",
                }}
              >
                Journey Progress
              </span>
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  color: currentStageData.accent,
                }}
              >
                {Math.round(smoothProgress * 100)}%
              </span>
            </div>

            <div
              style={{
                height: "8px",
                background: "rgba(226, 232, 240, 0.6)",
                borderRadius: "4px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${smoothProgress * 100}%`,
                  background: `linear-gradient(90deg, ${currentStageData.accent}, ${currentStageData.accent}cc)`,
                  borderRadius: "4px",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: `0 0 12px ${currentStageData.accent}40`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    width: "4px",
                    height: "100%",
                    background: "rgba(255,255,255,0.8)",
                    borderRadius: "2px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stage Navigation */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.75rem",
              padding: "1rem 0",
            }}
          >
            {lifeStages.map((stage, index) => (
              <div
                key={index}
                style={{
                  width: index <= currentStage ? "24px" : "12px",
                  height: "12px",
                  borderRadius: "6px",
                  background:
                    index <= currentStage
                      ? `linear-gradient(90deg, ${stage.accent}, ${stage.accent}cc)`
                      : "rgba(203, 213, 225, 0.6)",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  transform: index === currentStage ? "scale(1.1)" : "scale(1)",
                  boxShadow:
                    index === currentStage
                      ? `0 4px 12px ${stage.accent}40, 0 0 0 2px ${stage.accent}20`
                      : "none",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(180deg); }
        }
        
        @keyframes lightning {
          0% { opacity: 0; }
          10% { opacity: 1; }
          20% { opacity: 0.3; }
          30% { opacity: 1; }
          40% { opacity: 0.1; }
          50% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        
        @keyframes flash {
          0% { opacity: 0; }
          5% { opacity: 0.9; }
          10% { opacity: 0.1; }
          15% { opacity: 0.7; }
          20% { opacity: 0; }
          100% { opacity: 0; }
        }
        
        @keyframes bolt {
          0% { 
            opacity: 0; 
            transform: rotate(var(--rotation, 0deg)) translateY(-50%) scaleY(0);
          }
          20% { 
            opacity: 1; 
            transform: rotate(var(--rotation, 0deg)) translateY(-50%) scaleY(1);
          }
          40% { 
            opacity: 0.3; 
            transform: rotate(var(--rotation, 0deg)) translateY(-50%) scaleY(0.8);
          }
          60% { 
            opacity: 0.8; 
            transform: rotate(var(--rotation, 0deg)) translateY(-50%) scaleY(1.2);
          }
          100% { 
            opacity: 0; 
            transform: rotate(var(--rotation, 0deg)) translateY(-50%) scaleY(0);
          }
        }
        
        @keyframes sparkle {
          0% { 
            opacity: 0; 
            transform: scale(0) rotate(0deg);
          }
          30% { 
            opacity: 1; 
            transform: scale(1.5) rotate(180deg);
          }
          60% { 
            opacity: 0.7; 
            transform: scale(1) rotate(270deg);
          }
          100% { 
            opacity: 0; 
            transform: scale(0) rotate(360deg);
          }
        }
        
        @keyframes screenShake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2px, -1px); }
          20% { transform: translate(2px, 1px); }
          30% { transform: translate(-1px, 2px); }
          40% { transform: translate(1px, -2px); }
          50% { transform: translate(-2px, 1px); }
          60% { transform: translate(2px, -1px); }
          70% { transform: translate(-1px, -2px); }
          80% { transform: translate(1px, 2px); }
          90% { transform: translate(-1px, -1px); }
        }
      `}</style>
        {/* Life Story Section Header */}
        <div
          style={{
            position: "fixed",
            top: "5%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.8)",
              padding: "1rem 2rem",
              borderRadius: "25px",
              border: `2px solid ${currentStageData.accent}`,
              backdropFilter: "blur(10px)",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                color: "white",
                fontSize: "1.5rem",
                fontWeight: "700",
                margin: 0,
                textShadow: `0 0 10px ${currentStageData.accent}`,
              }}
            >
              📖 Life Story
            </h1>
          </div>
        </div>
      </section>
    </>
  );
};

export default LifeStory;
