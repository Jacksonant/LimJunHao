import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React from "react";
import { useLoading } from "../contexts/LoadingContext";
import NorthKoreaModel from "./three/NorthKoreaModel";

const NorthKorea: React.FC = () => {
  const { completeLoading } = useLoading();

  return (
    <section id="hero" style={{ height: "100vh" }}>
      <div className="absolute inset-0 z-10" style={{ height: "100vh" }}>
        <Canvas
          shadows
          camera={{ position: [0, 0, 5], fov: 45 }}
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
            minDistance={2}
            maxDistance={15}
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
      </div>
    </section>
  );
};

export default NorthKorea;
