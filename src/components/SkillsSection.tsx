import { Canvas } from "@react-three/fiber";
import React, { useRef, useState } from "react";
import ScrollAnimations from "./ScrollAnimations";

const SkillsSection: React.FC = () => {
  const [hoveredSkill, setHoveredSkill] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const skills = [
    { name: "React", level: 95, color: "#61dafb", icon: "⚛️" },
    { name: "TypeScript", level: 90, color: "#3178c6", icon: "📘" },
    { name: "Three.js", level: 85, color: "#000000", icon: "🎮" },
    { name: "Node.js", level: 88, color: "#339933", icon: "🟢" },
    { name: "Python", level: 82, color: "#3776ab", icon: "🐍" },
    { name: "GSAP", level: 80, color: "#88ce02", icon: "✨" },
  ];

  return (
    <section
      ref={containerRef}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "5rem 2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                         radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Section Header */}
        <ScrollAnimations animation="fadeIn" delay={0.2}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2
              style={{
                fontSize: "3.5rem",
                fontWeight: "700",
                color: "white",
                marginBottom: "1rem",
                textShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
            >
              Skills & Expertise
            </h2>
            <p
              style={{
                fontSize: "1.2rem",
                color: "rgba(255,255,255,0.9)",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              Technologies I've mastered through years of passionate development
            </p>
          </div>
        </ScrollAnimations>

        {/* Skills Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
            marginBottom: "4rem",
          }}
        >
          {skills.map((skill, index) => (
            <ScrollAnimations
              key={skill.name}
              animation="slideUp"
              delay={index * 0.1}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "20px",
                  padding: "2rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  transform:
                    hoveredSkill === index
                      ? "translateY(-10px) scale(1.02)"
                      : "translateY(0) scale(1)",
                  boxShadow:
                    hoveredSkill === index
                      ? `0 20px 40px rgba(0,0,0,0.2), 0 0 30px ${skill.color}40`
                      : "0 10px 30px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={() => setHoveredSkill(index)}
                onMouseLeave={() => setHoveredSkill(null)}
              >
                {/* Skill Icon */}
                <div
                  style={{
                    fontSize: "3rem",
                    marginBottom: "1rem",
                    textAlign: "center",
                  }}
                >
                  {skill.icon}
                </div>

                {/* Skill Name */}
                <h3
                  style={{
                    color: "white",
                    fontSize: "1.5rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                    textAlign: "center",
                  }}
                >
                  {skill.name}
                </h3>

                {/* Progress Bar */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: "10px",
                    height: "8px",
                    overflow: "hidden",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: `${skill.level}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${skill.color}, ${skill.color}cc)`,
                      borderRadius: "10px",
                      transition: "width 1s ease",
                      boxShadow: `0 0 10px ${skill.color}60`,
                    }}
                  />
                </div>

                {/* Skill Level */}
                <div
                  style={{
                    textAlign: "right",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                  }}
                >
                  {skill.level}%
                </div>
              </div>
            </ScrollAnimations>
          ))}
        </div>

        {/* Interactive 3D Element */}
        <ScrollAnimations animation="scale" delay={0.5}>
          <div
            style={{
              height: "300px",
              borderRadius: "20px",
              overflow: "hidden",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={1} />

              {skills.map((skill, index) => (
                <mesh
                  key={skill.name}
                  position={[
                    (index - skills.length / 2) * 1.5,
                    Math.sin(Date.now() * 0.001 + index) * 0.5,
                    0,
                  ]}
                  rotation={[0, Date.now() * 0.001 + index, 0]}
                >
                  <sphereGeometry args={[0.3, 32, 32]} />
                  <meshStandardMaterial
                    color={skill.color}
                    emissive={skill.color}
                    emissiveIntensity={0.2}
                  />
                </mesh>
              ))}
            </Canvas>
          </div>
        </ScrollAnimations>
      </div>
    </section>
  );
};

export default SkillsSection;
