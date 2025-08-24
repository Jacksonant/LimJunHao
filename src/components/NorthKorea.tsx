import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React from "react";
import { useLoading } from "../contexts/LoadingContext";
import NorthKoreaModel from "./three/NorthKoreaModel";

const NorthKorea: React.FC = () => {
  const { completeLoading } = useLoading();

  return (
    <section id="hero" style={{ height: "100vh", position: "relative" }}>
      <div className="absolute inset-0 z-10" style={{ height: "100vh", pointerEvents: "auto" }}>
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
          <NorthKoreaModel />
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            autoRotate={false}
            minDistance={0.5}
            maxDistance={50}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Canvas>
      </div>

      {/* Control Instructions */}
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
      </div>

      {/* Scroll Down Indicator */}
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
        }}
      >
        <div style={{ fontSize: "14px", marginBottom: "8px" }}>Scroll Down</div>
        <div style={{ fontSize: "24px" }}>↓</div>
      </div>

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
