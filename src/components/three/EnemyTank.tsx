import { useFrame } from "@react-three/fiber";
import React, { useRef } from "react";
import * as THREE from "three";

interface EnemyTankProps {
  position: THREE.Vector3;
  rotation: number;
  onPositionChange: (position: THREE.Vector3) => void;
  onRotationChange: (rotation: number) => void;
  onProjectile: (projectile: {
    id: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    type: 'shell' | 'bullet';
    life: number;
    rotation: number;
    owner: 'player' | 'enemy';
  }) => void;
  playerPosition: THREE.Vector3;
}

const EnemyTank = React.forwardRef<THREE.Group, EnemyTankProps>(({ 
  position, 
  rotation, 
  onPositionChange, 
  onRotationChange, 
  onProjectile, 
  playerPosition 
}, ref) => {
  const tankRef = ref as React.RefObject<THREE.Group>;
  const lastShot = useRef(0);
  const projectileId = useRef(1000); // Start from 1000 to avoid conflicts

  useFrame((state) => {
    if (!tankRef.current) return;

    const enemyPos = position.clone();
    const distanceToPlayer = enemyPos.distanceTo(playerPosition);
    
    // AI behavior
    const directionToPlayer = playerPosition.clone().sub(enemyPos).normalize();
    const targetRotation = Math.atan2(-directionToPlayer.x, -directionToPlayer.z);
    
    // Rotate towards player
    let rotDiff = targetRotation - rotation;
    if (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;
    if (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;
    
    const newRotation = rotation + Math.sign(rotDiff) * Math.min(Math.abs(rotDiff), 0.02);
    onRotationChange(newRotation);
    
    // Movement AI
    if (distanceToPlayer > 8) {
      // Move towards player
      const moveSpeed = 0.08;
      const newPos = enemyPos.clone();
      newPos.x += Math.cos(newRotation) * moveSpeed;
      newPos.z -= Math.sin(newRotation) * moveSpeed;
      onPositionChange(newPos);
    } else if (distanceToPlayer < 5) {
      // Back away if too close
      const moveSpeed = 0.05;
      const newPos = enemyPos.clone();
      newPos.x -= Math.cos(newRotation) * moveSpeed;
      newPos.z += Math.sin(newRotation) * moveSpeed;
      onPositionChange(newPos);
    }
    
    // Shooting AI
    const currentTime = state.clock.getElapsedTime();
    if (currentTime - lastShot.current > 2 && distanceToPlayer < 20) {
      lastShot.current = currentTime;
      
      const gunPos = enemyPos.clone();
      gunPos.y += 0.9;
      gunPos.x += Math.cos(newRotation) * 3;
      gunPos.z -= Math.sin(newRotation) * 3;
      
      const shellVelocity = new THREE.Vector3(
        Math.cos(newRotation) * 0.8,
        0,
        -Math.sin(newRotation) * 0.8
      );
      
      onProjectile({
        id: projectileId.current++,
        position: gunPos,
        velocity: shellVelocity,
        type: 'shell',
        life: Infinity,
        rotation: newRotation,
        owner: 'enemy'
      });
    }

    // Update tank transform
    tankRef.current.position.copy(position);
    tankRef.current.rotation.y = rotation;
  });

  return (
    <group ref={tankRef} scale={[1.0, 1.0, 1.0]}>
      <mesh castShadow receiveShadow>
        {/* Advanced Enemy Hull - larger and more angular */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[6.5, 1.0, 3.2]} />
          <meshStandardMaterial color="#2a0a0a" roughness={0.7} metalness={0.4} emissive="#4a0000" emissiveIntensity={0.4} />
        </mesh>

        {/* Sloped front armor - more aggressive */}
        <mesh position={[3.0, 0.5, 0]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[1.0, 0.8, 3.2]} />
          <meshStandardMaterial color="#2a0a0a" roughness={0.7} metalness={0.4} />
        </mesh>

        {/* Advanced Turret - larger and more imposing */}
        <mesh position={[0.3, 1.0, 0]}>
          <cylinderGeometry args={[1.3, 1.5, 1.0, 8]} />
          <meshStandardMaterial color="#2a0a0a" roughness={0.7} metalness={0.4} />
        </mesh>

        {/* Main Gun - larger caliber */}
        <mesh position={[3.5, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 5.5, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Muzzle brake */}
        <mesh position={[6.2, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.08, 0.3, 8]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Secondary weapons - dual machine guns */}
        <mesh position={[1.5, 1.3, 0.4]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[1.5, 1.3, -0.4]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Commander's cupola */}
        <mesh position={[-0.5, 1.6, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.3, 12]} />
          <meshStandardMaterial color="#1a0505" roughness={0.8} metalness={0.2} />
        </mesh>

        {/* Advanced suspension - 6 road wheels per side */}
        {[2.2, 1.3, 0.4, -0.5, -1.4, -2.3].map((x, i) => (
          <React.Fragment key={i}>
            <mesh position={[x, -0.15, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.25, 16]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
            </mesh>
            <mesh position={[x, -0.15, -1.4]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.25, 16]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
            </mesh>
          </React.Fragment>
        ))}

        {/* Tracks - wider and more robust */}
        <mesh position={[0, -0.25, 1.6]}>
          <boxGeometry args={[5.5, 0.35, 0.5]} />
          <meshStandardMaterial color="#050505" roughness={1} />
        </mesh>
        <mesh position={[0, -0.25, -1.6]}>
          <boxGeometry args={[5.5, 0.35, 0.5]} />
          <meshStandardMaterial color="#050505" roughness={1} />
        </mesh>

        {/* Reactive armor blocks */}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[i * 0.7 - 2.45, 0.6, 1.65]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.5, 0.15, 0.1]} />
            <meshStandardMaterial color="#3a0a0a" roughness={0.6} metalness={0.5} />
          </mesh>
        ))}
      </mesh>
    </group>
  );
});

export default EnemyTank;