import { useFrame, useLoader } from "@react-three/fiber";
import React, { useRef, useState } from "react";
import * as THREE from "three";
import bgSource from "../../assets/img/north_korea_flag.jpeg";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import PlayerTank from "./PlayerTank";
import EnemyTank from "./EnemyTank";

interface NorthKoreaModelProps {
  isActive?: boolean;
}

const NorthKoreaModel: React.FC<NorthKoreaModelProps> = ({
  isActive = false,
}) => {
  const playerTankRef = useRef<THREE.Group>(null);
  const enemyTankRef = useRef<THREE.Group>(null);
  const [projectiles, setProjectiles] = useState<
    Array<{
      id: number;
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      type: "shell" | "bullet";
      life: number;
      rotation: number;
      owner: "player" | "enemy";
    }>
  >([]);
  const projectileId = useRef(0);
  const [playerPosition, setPlayerPosition] = useState(
    new THREE.Vector3(0, -0.05, 0)
  );
  const [playerRotation, setPlayerRotation] = useState(0);
  const [enemyPosition, setEnemyPosition] = useState(
    new THREE.Vector3(15, -0.05, 0)
  );
  const [enemyRotation, setEnemyRotation] = useState(0);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [isRearView, setIsRearView] = useState(false);

  // Boundary limits for 100x100 flag ground
  const BOUNDARY_LIMIT = 48; // Slightly less than 50 to keep tanks fully on ground

  const clampPosition = (position: THREE.Vector3) => {
    return new THREE.Vector3(
      Math.max(-BOUNDARY_LIMIT, Math.min(BOUNDARY_LIMIT, position.x)),
      Math.max(-0.05, position.y), // Ensure tanks stay above ground plane
      Math.max(-BOUNDARY_LIMIT, Math.min(BOUNDARY_LIMIT, position.z))
    );
  };

  const handlePlayerPositionChange = (newPosition: THREE.Vector3) => {
    setPlayerPosition(clampPosition(newPosition));
  };

  const handleEnemyPositionChange = (newPosition: THREE.Vector3) => {
    setEnemyPosition(clampPosition(newPosition));
  };

  const handlePlayerProjectile = (projectile: {
    id: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    type: "shell" | "bullet";
    life: number;
    rotation: number;
    owner: "player" | "enemy";
  }) => {
    setProjectiles((prev) => [
      ...prev,
      { ...projectile, id: projectileId.current++ },
    ]);
  };

  const handleEnemyProjectile = (projectile: {
    id: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    type: "shell" | "bullet";
    life: number;
    rotation: number;
    owner: "player" | "enemy";
  }) => {
    setProjectiles((prev) => [
      ...prev,
      { ...projectile, id: projectileId.current++ },
    ]);
  };

  useFrame((state) => {
    if (playerTankRef.current && isActive) {
      const worldPos = new THREE.Vector3();
      playerTankRef.current.getWorldPosition(worldPos);

      // Always keep tank as orbit center
      if (state.controls && "enabled" in state.controls) {
        const controls = state.controls as OrbitControls;
        controls.target.copy(worldPos);
      }

      if (isPlayerMoving) {
        
        // Force camera to south-top position when moving
        const tankRotation = playerTankRef.current.rotation.y;
        const cameraDistance = 12;
        const cameraHeight = 6;

        let cameraX, cameraZ;
        if (isRearView) {
          cameraX = worldPos.x + Math.cos(tankRotation) * cameraDistance;
          cameraZ = worldPos.z - Math.sin(tankRotation) * cameraDistance;
        } else {
          cameraX = worldPos.x - Math.cos(tankRotation) * cameraDistance;
          cameraZ = worldPos.z + Math.sin(tankRotation) * cameraDistance;
        }

        state.camera.position.set(cameraX, worldPos.y + cameraHeight, cameraZ);
        state.camera.lookAt(worldPos.x, worldPos.y + 3, worldPos.z);

        if (state.controls && "enabled" in state.controls) {
          (state.controls as OrbitControls).enabled = false;
        }
      } else {
        // Enable orbit controls when not moving but keep looking at tank
        state.camera.lookAt(worldPos.x, worldPos.y + 3, worldPos.z);
        
        if (state.controls && "enabled" in state.controls) {
          (state.controls as OrbitControls).enabled = true;
        }
      }
    }

    // DEBUG: Collision system disabled
    // Tank-to-tank collision detection disabled for debugging

    // Update projectiles with cleanup
    setProjectiles((prev) => {
      const updated = prev.map((projectile) => ({
        ...projectile,
        position: projectile.position.clone().add(projectile.velocity),
        life: projectile.life - 1
      }));

      // Check collisions and cleanup
      const remaining = updated.filter((projectile) => {
        // Remove projectiles that are too far or too old
        const distanceFromCenter = projectile.position.length();
        if (distanceFromCenter > 60 || projectile.life <= 0) {
          return false;
        }

        // Tank-projectile collisions
        if (playerTankRef.current && projectile.owner === "enemy") {
          const playerPos = new THREE.Vector3();
          playerTankRef.current.getWorldPosition(playerPos);
          if (projectile.position.distanceTo(playerPos) < 2) {
            handlePlayerPositionChange(
              playerPosition.clone().sub(projectile.position.clone().sub(playerPos).normalize().multiplyScalar(0.5))
            );
            return false;
          }
        }

        if (enemyTankRef.current && projectile.owner === "player") {
          const enemyPos = new THREE.Vector3();
          enemyTankRef.current.getWorldPosition(enemyPos);
          if (projectile.position.distanceTo(enemyPos) < 2) {
            return false;
          }
        }

        return true;
      });

      return remaining;
    });
  });

  return (
    <>
      <PlayerTank
        ref={playerTankRef}
        isActive={isActive}
        position={playerPosition}
        rotation={playerRotation}
        onPositionChange={handlePlayerPositionChange}
        onRotationChange={setPlayerRotation}
        onMovingChange={setIsPlayerMoving}
        onRearViewChange={setIsRearView}
        onProjectile={handlePlayerProjectile}
      />

      <EnemyTank
        ref={enemyTankRef}
        position={enemyPosition}
        rotation={enemyRotation}
        onPositionChange={handleEnemyPositionChange}
        onRotationChange={setEnemyRotation}
        onProjectile={handleEnemyProjectile}
        playerPosition={playerPosition}
      />

      {/* Projectiles */}
      {projectiles.map((projectile) => (
        <mesh
          key={projectile.id}
          position={[
            projectile.position.x,
            projectile.position.y,
            projectile.position.z,
          ]}
          rotation={[0, projectile.rotation, Math.PI / 2]}
        >
          {projectile.type === "shell" ? (
            <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
          ) : (
            <cylinderGeometry args={[0.015, 0.015, 0.08, 6]} />
          )}
          <meshStandardMaterial
            color={
              projectile.owner === "enemy"
                ? projectile.type === "shell"
                  ? "#ff0000"
                  : "#ff4444"
                : projectile.type === "shell"
                ? "#ffaa00"
                : "#ffff00"
            }
            emissive={
              projectile.owner === "enemy"
                ? projectile.type === "shell"
                  ? "#aa0000"
                  : "#ff0000"
                : projectile.type === "shell"
                ? "#ff4400"
                : "#ffaa00"
            }
            emissiveIntensity={2}
          />
        </mesh>
      ))}

      {/* Environment - static */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          map={useLoader(THREE.TextureLoader, bgSource)}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>
    </>
  );
};

export default NorthKoreaModel;
