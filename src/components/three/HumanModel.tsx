import { useFrame, useLoader } from "@react-three/fiber";
import React, { Suspense, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";

// Global fix for NaN bounding sphere computation
const originalComputeBoundingSphere =
  THREE.BufferGeometry.prototype.computeBoundingSphere;
THREE.BufferGeometry.prototype.computeBoundingSphere = function () {
  if (this.attributes.position) {
    const positions = this.attributes.position.array;
    for (let i = 0; i < positions.length; i++) {
      if (isNaN(positions[i])) {
        positions[i] = 0;
      }
    }
  }
  return originalComputeBoundingSphere.call(this);
};

interface HumanModelProps {
  growthStage: number;
  stageData: {
    age: string;
    color: string;
    accent: string;
    [key: string]: string;
  };
  isStageChanging?: boolean;
}

interface ModelConfig {
  model: string;
  type: string;
  scale: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  mtl?: string;
}

const OBJ_MODELS = {
  0: {
    // Baby
    model: "/models/baby/baby.obj",
    mtl: "/models/baby/baby.mtl",
    scale: 0.05,
    position: [0, -1.5, 0] as [number, number, number],
    rotation: [Math.PI / -2, 0, 0] as [number, number, number],
  },
  4: {
    // Adult
    model: "/models/adult/male02.obj",
    mtl: "/models/adult/male02.mtl",
    scale: 0.01,
    position: [0, -85, 0] as [number, number, number],
  },
};

const GLB_MODELS = {
  1: {
    // Toddler - Robot
    model: "/models/toddler/robot.glb",
    scale: 0.4,
    position: [0, -2, 0] as [number, number, number],
  },
  2: {
    // Child - Parrot
    model: "/models/child/parrot.glb",
    scale: 0.015,
    position: [0, 15, 0] as [number, number, number],
  },
  3: {
    // Teenager - Flamingo
    model: "/models/teenager/flamingo.glb",
    scale: 0.01,
    position: [0, 20, 0] as [number, number, number],
  },
};

const getModelPaths = (stage: number): ModelConfig => {
  const ageStage = stage;

  if (GLB_MODELS[ageStage as keyof typeof GLB_MODELS]) {
    return {
      ...GLB_MODELS[ageStage as keyof typeof GLB_MODELS],
      type: "glb",
    };
  }

  const objModel =
    OBJ_MODELS[ageStage as keyof typeof OBJ_MODELS] || OBJ_MODELS[4];
  return {
    ...objModel,
    type: "obj",
  };
};

const OBJModel: React.FC<{ modelPath: string; config: ModelConfig }> = ({
  modelPath,
  config,
}) => {
  const materials = useLoader(MTLLoader, config.mtl || "");
  const obj = useLoader(OBJLoader, modelPath, (loader) => {
    if (materials && config.mtl) {
      materials.preload();
      loader.setMaterials(materials);
    }
  });
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const breathe = Math.sin(state.clock.elapsedTime * 1.5) * 0.001;
      groupRef.current.scale.setScalar(config.scale + breathe);
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={obj}
        position={config.position}
        rotation={config.rotation || [0, 0, 0]}
        castShadow
        receiveShadow
      />
    </group>
  );
};

const GLBModel: React.FC<{ modelPath: string; config: ModelConfig }> = ({
  modelPath,
  config,
}) => {
  const { scene } = useLoader(GLTFLoader, modelPath);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const breathe = Math.sin(state.clock.elapsedTime * 1.5) * 0.001;
      groupRef.current.scale.setScalar(config.scale + breathe);
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        position={config.position}
        rotation={config.rotation || [0, 0, 0]}
        castShadow
        receiveShadow
      />
    </group>
  );
};

const DAEModel: React.FC<{ modelPath: string; config: ModelConfig }> = ({
  modelPath,
  config,
}) => {
  const { scene } = useLoader(ColladaLoader, modelPath);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const breathe = Math.sin(state.clock.elapsedTime * 1.5) * 0.001;
      groupRef.current.scale.setScalar(config.scale + breathe);
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        position={config.position}
        rotation={config.rotation || [0, 0, 0]}
        castShadow
        receiveShadow
      />
    </group>
  );
};

const OBJHumanModel: React.FC<HumanModelProps> = ({
  growthStage,
  stageData,
  isStageChanging,
}) => {
  const modelConfig = getModelPaths(growthStage);
  const lightRef = useRef<THREE.PointLight>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (isStageChanging && lightRef.current) {
      // Lightning flicker effect
      const flicker = Math.sin(state.clock.elapsedTime * 20) * 0.5 + 0.5;
      lightRef.current.intensity = 5 + flicker * 15;
      
      // Random position shifts for lightning effect
      lightRef.current.position.x = Math.sin(state.clock.elapsedTime * 15) * 2;
      lightRef.current.position.y = Math.cos(state.clock.elapsedTime * 12) * 1.5;
    }
    
    if (isStageChanging && groupRef.current) {
      // Model shake during transformation
      const shake = Math.sin(state.clock.elapsedTime * 25) * 0.02;
      groupRef.current.rotation.x = shake;
      groupRef.current.rotation.z = shake * 0.5;
    }
  });

  return (
    <>
      {isStageChanging && (
        <>
          {/* Main lightning light */}
          <pointLight
            ref={lightRef}
            position={[0, 0, 2]}
            intensity={10}
            color={stageData.accent}
            distance={15}
            castShadow
          />
          
          {/* Additional flickering lights */}
          <pointLight
            position={[2, 1, 1]}
            intensity={6}
            color="white"
            distance={8}
          />
          <pointLight
            position={[-2, -1, 1]}
            intensity={4}
            color={stageData.accent}
            distance={6}
          />
          
          {/* Rim lighting effect */}
          <directionalLight
            position={[5, 5, 5]}
            intensity={8}
            color={stageData.accent}
          />
        </>
      )}

      <group ref={groupRef}>
        {modelConfig.type === "dae" && (
          <DAEModel modelPath={modelConfig.model} config={modelConfig} />
        )}
        {modelConfig.type === "glb" && (
          <GLBModel modelPath={modelConfig.model} config={modelConfig} />
        )}
        {modelConfig.type === "obj" && (
          <OBJModel modelPath={modelConfig.model} config={modelConfig} />
        )}
      </group>
    </>
  );
};

const HumanModel: React.FC<HumanModelProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <OBJHumanModel {...props} />
    </Suspense>
  );
};

export default HumanModel;
