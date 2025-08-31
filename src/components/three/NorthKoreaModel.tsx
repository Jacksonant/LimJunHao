import { useFrame, useLoader } from "@react-three/fiber";
import React, { useRef, useState } from "react";
import * as THREE from "three";
import bgSource from "../../assets/img/north_korea_flag.jpeg";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import PlayerTank from "./PlayerTank";
import EnemyTank from "./EnemyTank";

interface NorthKoreaModelProps {
  isActive?: boolean;
  onPositionsUpdate?: (playerPos: THREE.Vector3, enemyPos: THREE.Vector3) => void;
  onHealthUpdate?: (playerHealth: number, enemyHealth: number) => void;
}

const NorthKoreaModel: React.FC<NorthKoreaModelProps> = ({
  isActive = false,
  onPositionsUpdate,
  onHealthUpdate,
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
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(1000);
  const [playerDestroyed, setPlayerDestroyed] = useState(false);
  const [enemyDestroyed, setEnemyDestroyed] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

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
    const time = state.clock.getElapsedTime();
    setAnimationTime(time);
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

        // Tank-projectile collisions with damage
        if (playerTankRef.current && projectile.owner === "enemy" && !playerDestroyed) {
          const playerPos = new THREE.Vector3();
          playerTankRef.current.getWorldPosition(playerPos);
          if (projectile.position.distanceTo(playerPos) < 2) {
            const damage = projectile.type === "shell" ? 16 : 0.002;
            setPlayerHealth(prev => {
              const newHealth = Math.max(0, prev - damage);
              if (newHealth <= 0) setPlayerDestroyed(true);
              return newHealth;
            });
            return false;
          }
        }

        if (enemyTankRef.current && projectile.owner === "player" && !enemyDestroyed) {
          const enemyPos = new THREE.Vector3();
          enemyTankRef.current.getWorldPosition(enemyPos);
          if (projectile.position.distanceTo(enemyPos) < 2) {
            const damage = projectile.type === "shell" ? 8 : 0.0008;
            setEnemyHealth(prev => {
              const newHealth = Math.max(0, prev - damage);
              if (newHealth <= 0) setEnemyDestroyed(true);
              return newHealth;
            });
            return false;
          }
        }

        return true;
      });

      return remaining;
    });
    
    // Update positions callback
    if (onPositionsUpdate) {
      onPositionsUpdate(playerPosition, enemyPosition);
    }
    
    // Update health callback
    if (onHealthUpdate) {
      onHealthUpdate(playerHealth, enemyHealth);
    }
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
        isDestroyed={playerDestroyed}
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
        isDestroyed={enemyDestroyed}
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

      {/* Destruction Effects */}
      {playerDestroyed && (
        <group position={[playerPosition.x, playerPosition.y, playerPosition.z]}>
          {/* Fire Effect */}
          <mesh position={[0, 1.2, 0]}>
            <coneGeometry args={[0.8, 2, 5]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={5} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0.4, 1.5, 0.2]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.5, 1.5, 4]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff4400" emissiveIntensity={6} transparent opacity={0.7} />
          </mesh>
          <mesh position={[-0.3, 1.3, -0.1]} rotation={[0, 0, -0.2]}>
            <coneGeometry args={[0.4, 1.2, 4]} />
            <meshStandardMaterial color="#ffaa00" emissive="#ff6600" emissiveIntensity={7} transparent opacity={0.6} />
          </mesh>
          {/* Smoke */}
          <group>
            <mesh position={[0, 3.5, 0]} scale={[1.5, 0.8, 1.2]}>
              <sphereGeometry args={[1.2, 6, 4]} />
              <meshStandardMaterial color="#444444" transparent opacity={Math.sin(animationTime * 3) > 0 ? 0.5 : 0.1} />
            </mesh>
            <mesh position={[0.8, 3.8, 0.3]} scale={[1.2, 0.6, 1]}>
              <sphereGeometry args={[1, 5, 4]} />
              <meshStandardMaterial color="#555555" transparent opacity={Math.sin(animationTime * 2.8) > 0 ? 0.4 : 0.1} />
            </mesh>
            <mesh position={[-0.6, 4.2, -0.2]} scale={[1, 0.7, 0.9]}>
              <sphereGeometry args={[0.8, 4, 3]} />
              <meshStandardMaterial color="#666666" transparent opacity={Math.sin(animationTime * 3.2) > 0 ? 0.3 : 0.1} />
            </mesh>
          </group>
          {/* Burnt Tank Hull */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[4.4, 0.6, 2.2]} />
            <meshStandardMaterial color="#1a1a1a" roughness={1} metalness={0} emissive="#330000" emissiveIntensity={0.2} />
          </mesh>
          {/* Burnt Turret */}
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.8, 1, 0.6, 6]} />
            <meshStandardMaterial color="#0d0d0d" roughness={1} metalness={0} />
          </mesh>
        </group>
      )}
      
      {enemyDestroyed && (
        <group position={[enemyPosition.x, enemyPosition.y, enemyPosition.z]}>
          {/* Fire Effect */}
          <mesh position={[0, 1.5, 0]}>
            <coneGeometry args={[1, 2.5, 5]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={5} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0.5, 1.8, 0.3]} rotation={[0, 0, 0.4]}>
            <coneGeometry args={[0.6, 2, 4]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff4400" emissiveIntensity={6} transparent opacity={0.7} />
          </mesh>
          <mesh position={[-0.4, 1.6, -0.2]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.5, 1.8, 4]} />
            <meshStandardMaterial color="#ffaa00" emissive="#ff6600" emissiveIntensity={7} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0.2, 2.2, 0.1]} rotation={[0, 0, 0.2]}>
            <coneGeometry args={[0.3, 1.2, 3]} />
            <meshStandardMaterial color="#ffdd00" emissive="#ffaa00" emissiveIntensity={8} transparent opacity={0.5} />
          </mesh>
          {/* Smoke */}
          <group>
            <mesh position={[0, 4.5, 0]} scale={[2, 1, 1.5]}>
              <sphereGeometry args={[1.5, 6, 4]} />
              <meshStandardMaterial color="#444444" transparent opacity={Math.sin(animationTime * 2.5) > 0 ? 0.6 : 0.1} />
            </mesh>
            <mesh position={[1, 5, 0.4]} scale={[1.5, 0.8, 1.2]}>
              <sphereGeometry args={[1.2, 5, 4]} />
              <meshStandardMaterial color="#555555" transparent opacity={Math.sin(animationTime * 2.3) > 0 ? 0.5 : 0.1} />
            </mesh>
            <mesh position={[-0.8, 5.2, -0.3]} scale={[1.3, 0.9, 1.1]}>
              <sphereGeometry args={[1, 4, 3]} />
              <meshStandardMaterial color="#666666" transparent opacity={Math.sin(animationTime * 2.7) > 0 ? 0.4 : 0.1} />
            </mesh>
            <mesh position={[0.3, 5.8, 0.1]} scale={[1, 0.6, 0.8]}>
              <sphereGeometry args={[0.8, 4, 3]} />
              <meshStandardMaterial color="#777777" transparent opacity={Math.sin(animationTime * 2.1) > 0 ? 0.3 : 0.1} />
            </mesh>
          </group>
          {/* Burnt Tank Hull */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[5.2, 0.8, 2.6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={1} metalness={0} emissive="#330000" emissiveIntensity={0.2} />
          </mesh>
          {/* Burnt Turret */}
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[1, 1.2, 0.8, 8]} />
            <meshStandardMaterial color="#0d0d0d" roughness={1} metalness={0} />
          </mesh>
          {/* Destroyed Gun Barrel */}
          <mesh position={[1.5, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 2, 8]} />
            <meshStandardMaterial color="#0d0d0d" roughness={1} />
          </mesh>
        </group>
      )}

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
