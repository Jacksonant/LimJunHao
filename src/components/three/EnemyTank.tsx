import { useFrame } from "@react-three/fiber";
import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import machineGunSound from "../../assets/audio/machine-gun-firing.mp3";
import shellFiringSound from "../../assets/audio/shell-firing.mp3";
import tankMovingSound from "../../assets/audio/tank-moving.mp3";

interface EnemyTankProps {
  position: THREE.Vector3;
  rotation: number;
  onPositionChange: (position: THREE.Vector3) => void;
  onRotationChange: (rotation: number) => void;
  onProjectile: (projectile: {
    id: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    type: "shell" | "bullet";
    life: number;
    rotation: number;
    owner: "player" | "enemy";
  }) => void;
  playerPosition: THREE.Vector3;
  isDestroyed?: boolean;
  gameOver?: boolean;
  isActive?: boolean;
  canShoot?: boolean;
  allowMovement?: boolean;
  onExplosion?: () => void;
  onSkid?: () => void;
}

const EnemyTank = React.forwardRef<THREE.Group, EnemyTankProps>(
  (
    {
      position,
      rotation,
      onPositionChange,
      onRotationChange,
      onProjectile,
      playerPosition,
      isDestroyed = false,
      gameOver = false,
      isActive = true,
      canShoot = true,
      allowMovement = true,
      onExplosion,
      onSkid,
    },
    ref
  ) => {
    const tankRef = ref as React.RefObject<THREE.Group>;
    const lastShot = useRef(0);
    const lastMGShot = useRef(0);
    const projectileId = useRef(1000);
    const [isFiring, setIsFiring] = useState(false);
    const [isMGFiring, setIsMGFiring] = useState(false);
    const [isMoving, setIsMoving] = useState(false);

    const cannonAudioRef = useRef<HTMLAudioElement | null>(null);
    const machineGunAudioRef = useRef<HTMLAudioElement | null>(null);
    const engineAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
      cannonAudioRef.current = new Audio(shellFiringSound);
      cannonAudioRef.current.volume = 1.0;
      machineGunAudioRef.current = new Audio(machineGunSound);
      machineGunAudioRef.current.volume = 1.0;
      engineAudioRef.current = new Audio(tankMovingSound);
      engineAudioRef.current.volume = 1.0;
    }, []);

    // Stop all sounds when game over, destroyed, or not active
    useEffect(() => {
      if (gameOver || isDestroyed || !isActive) {
        if (machineGunAudioRef.current) {
          machineGunAudioRef.current.pause();
          machineGunAudioRef.current.currentTime = 0;
        }
        if (engineAudioRef.current) {
          engineAudioRef.current.pause();
          engineAudioRef.current.currentTime = 0;
        }
        setIsMoving(false);
        setIsMGFiring(false);
      }
    }, [gameOver, isDestroyed, isActive]);

    useFrame((state) => {
      if (!tankRef.current || isDestroyed || !isActive) return;

      const enemyPos = position.clone();
      const distanceToPlayer = enemyPos.distanceTo(playerPosition);

      // 1. FACE PLAYER WITH TANK'S ACTUAL FRONT (WEST VIEW)
      const directionToPlayer = playerPosition
        .clone()
        .sub(enemyPos)
        .normalize();
      // Adjust for tank's actual front direction (add π/2 to align with west view)
      const targetRotation =
        Math.atan2(-directionToPlayer.x, -directionToPlayer.z) + Math.PI / 2;

      let rotDiff = targetRotation - rotation;
      if (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;
      if (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;

      // Fast rotation to face player with actual front
      const newRotation =
        rotation + Math.sign(rotDiff) * Math.min(Math.abs(rotDiff), 0.08);
      if (Math.abs(rotDiff) > 0.01 && onSkid) onSkid();
      onRotationChange(newRotation);

      // 2. MOVEMENT: Move when facing player (only if movement allowed)
      const facingPlayer = Math.abs(rotDiff) < 0.1;

      if (facingPlayer && allowMovement) {
        const BOUNDARY = 45;
        const nearBoundary =
          Math.abs(enemyPos.x) > BOUNDARY || Math.abs(enemyPos.z) > BOUNDARY;
        const moveSpeed = 0.08;

        let shouldMove = false;
        let moveDirection = 1;

        if (nearBoundary) {
          shouldMove = true;
          moveDirection = -1; // Reverse from boundary
        } else if (distanceToPlayer > 8) {
          shouldMove = true;
          moveDirection = 1; // Advance toward player
        } else if (distanceToPlayer < 4) {
          shouldMove = true;
          moveDirection = -1; // Retreat from player
        }

        if (shouldMove) {
          const newPos = enemyPos.clone();
          newPos.x += Math.cos(newRotation) * moveSpeed * moveDirection;
          newPos.z -= Math.sin(newRotation) * moveSpeed * moveDirection;
          onPositionChange(newPos);

          // Movement sound
          if (!isMoving) {
            setIsMoving(true);
            if (engineAudioRef.current && !gameOver) {
              engineAudioRef.current.loop = true;
              engineAudioRef.current.play();
            }
          }
        } else {
          if (isMoving) {
            setIsMoving(false);
            if (engineAudioRef.current) {
              engineAudioRef.current.pause();
              engineAudioRef.current.currentTime = 0;
            }
          }
        }
      }

      // 3. LINE OF SIGHT CHECK
      const hasLineOfSight = facingPlayer && distanceToPlayer <= 25;

      // 4. SHOOTING: Main gun and continuous machine guns (only with line of sight)
      const currentTime = state.clock.getElapsedTime();
      const aimAccuracy = Math.abs(rotDiff) < 0.2;

      // Main gun - slower interval
      const mainGunInterval = 2.0;
      if (
        currentTime - lastShot.current > mainGunInterval &&
        aimAccuracy &&
        hasLineOfSight &&
        !gameOver &&
        canShoot
      ) {
        lastShot.current = currentTime;

        const gunPos = enemyPos.clone();
        gunPos.y += 1.1;
        gunPos.x += Math.cos(newRotation) * 3.5;
        gunPos.z -= Math.sin(newRotation) * 3.5;

        const shellVelocity = new THREE.Vector3(
          Math.cos(newRotation) * 0.8,
          0,
          -Math.sin(newRotation) * 0.8
        );

        onProjectile({
          id: projectileId.current++,
          position: gunPos,
          velocity: shellVelocity,
          type: "shell",
          life: 300,
          rotation: newRotation,
          owner: "enemy",
        });

        // Main gun firing effect and sound
        setIsFiring(true);
        if (onExplosion) onExplosion();
        setTimeout(() => setIsFiring(false), 300);
      }

      // Machine guns - continuous rapid fire when facing player and has line of sight
      const mgInterval = 0.05; // Very fast
      const shouldFireMG = aimAccuracy && hasLineOfSight && !gameOver && canShoot;
      
      if (shouldFireMG && currentTime - lastMGShot.current > mgInterval) {
        lastMGShot.current = currentTime;

        // Machine gun positions
        const mgPos1 = enemyPos.clone();
        mgPos1.y += 1.3;
        mgPos1.x += Math.cos(newRotation) * 1.5;
        mgPos1.z -= Math.sin(newRotation) * 1.5;
        mgPos1.x += Math.cos(newRotation + Math.PI / 2) * 0.4;
        mgPos1.z -= Math.sin(newRotation + Math.PI / 2) * 0.4;

        const mgPos2 = enemyPos.clone();
        mgPos2.y += 1.3;
        mgPos2.x += Math.cos(newRotation) * 1.5;
        mgPos2.z -= Math.sin(newRotation) * 1.5;
        mgPos2.x += Math.cos(newRotation - Math.PI / 2) * 0.4;
        mgPos2.z -= Math.sin(newRotation - Math.PI / 2) * 0.4;

        const mgPosFront = enemyPos.clone();
        mgPosFront.y += 0.8;
        mgPosFront.x += Math.cos(newRotation) * 2.5;
        mgPosFront.z -= Math.sin(newRotation) * 2.5;

        const mgVelocity = new THREE.Vector3(
          Math.cos(newRotation) * 0.6,
          0,
          -Math.sin(newRotation) * 0.6
        );

        // Fire all machine guns continuously
        onProjectile({
          id: projectileId.current++,
          position: mgPos1,
          velocity: mgVelocity.clone(),
          type: "bullet",
          life: 200,
          rotation: newRotation,
          owner: "enemy",
        });

        onProjectile({
          id: projectileId.current++,
          position: mgPos2,
          velocity: mgVelocity.clone(),
          type: "bullet",
          life: 200,
          rotation: newRotation,
          owner: "enemy",
        });

        onProjectile({
          id: projectileId.current++,
          position: mgPosFront,
          velocity: mgVelocity.clone(),
          type: "bullet",
          life: 200,
          rotation: newRotation,
          owner: "enemy",
        });
      }
      
      // Machine gun sound management
      if (shouldFireMG && !isMGFiring) {
        setIsMGFiring(true);
        if (machineGunAudioRef.current) {
          machineGunAudioRef.current.loop = true;
          machineGunAudioRef.current.currentTime = 0;
          machineGunAudioRef.current.play().catch(() => {});
        }
      } else if (!shouldFireMG && isMGFiring) {
        setIsMGFiring(false);
        if (machineGunAudioRef.current) {
          machineGunAudioRef.current.pause();
          machineGunAudioRef.current.currentTime = 0;
        }
      }

      // Update tank transform
      tankRef.current.position.copy(position);
      tankRef.current.rotation.y = rotation;
    });

    return (
      <group ref={tankRef} scale={[1.0, 1.0, 1.0]}>
        <mesh castShadow receiveShadow>
          {/* Advanced Enemy Hull */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[6.5, 1.0, 3.2]} />
            <meshStandardMaterial
              color="#2a0a0a"
              roughness={0.7}
              metalness={0.4}
              emissive="#4a0000"
              emissiveIntensity={0.4}
            />
          </mesh>

          {/* Sloped front armor */}
          <mesh position={[3.0, 0.5, 0]} rotation={[0, 0, -0.4]}>
            <boxGeometry args={[1.0, 0.8, 3.2]} />
            <meshStandardMaterial
              color="#2a0a0a"
              roughness={0.7}
              metalness={0.4}
            />
          </mesh>

          {/* Advanced Turret */}
          <mesh position={[0.3, 1.0, 0]}>
            <cylinderGeometry args={[1.3, 1.5, 1.0, 8]} />
            <meshStandardMaterial
              color="#2a0a0a"
              roughness={0.7}
              metalness={0.4}
            />
          </mesh>

          {/* Main Gun */}
          <mesh position={[3.5, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 5.5, 16]} />
            <meshStandardMaterial
              color="#0a0a0a"
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>

          {/* Main gun muzzle flash */}
          {isFiring && (
            <>
              <mesh position={[6.5, 1.1, 0]}>
                <sphereGeometry args={[0.5, 8, 8]} />
                <meshStandardMaterial
                  color="#ff0000"
                  emissive="#ff4400"
                  emissiveIntensity={4}
                />
              </mesh>
              <mesh position={[7.0, 1.1, 0]}>
                <coneGeometry args={[0.3, 1.0, 8]} />
                <meshStandardMaterial
                  color="#ff4400"
                  emissive="#ff6600"
                  emissiveIntensity={3}
                />
              </mesh>
            </>
          )}

          {/* Muzzle brake */}
          <mesh position={[6.2, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.08, 0.3, 8]} />
            <meshStandardMaterial
              color="#0a0a0a"
              roughness={0.3}
              metalness={0.8}
            />
          </mesh>

          {/* Secondary weapons */}
          <mesh position={[1.5, 1.3, 0.4]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
            <meshStandardMaterial
              color="#0a0a0a"
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>
          <mesh position={[1.5, 1.3, -0.4]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
            <meshStandardMaterial
              color="#0a0a0a"
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>

          {/* Machine gun muzzle flashes */}
          {isMGFiring && (
            <>
              <mesh position={[2.2, 1.3, 0.4]}>
                <sphereGeometry args={[0.1, 6, 6]} />
                <meshStandardMaterial
                  color="#ff0000"
                  emissive="#ff8800"
                  emissiveIntensity={4}
                />
              </mesh>
              <mesh position={[2.2, 1.3, -0.4]}>
                <sphereGeometry args={[0.1, 6, 6]} />
                <meshStandardMaterial
                  color="#ff0000"
                  emissive="#ff8800"
                  emissiveIntensity={4}
                />
              </mesh>
              <mesh position={[2.5, 0.8, 0]}>
                <sphereGeometry args={[0.08, 6, 6]} />
                <meshStandardMaterial
                  color="#ff0000"
                  emissive="#ff8800"
                  emissiveIntensity={4}
                />
              </mesh>
            </>
          )}

          {/* Commander's cupola */}
          <mesh position={[-0.5, 1.6, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 12]} />
            <meshStandardMaterial
              color="#1a0505"
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>

          {/* Road wheels */}
          {[2.2, 1.3, 0.4, -0.5, -1.4, -2.3].map((x, i) => (
            <React.Fragment key={i}>
              <mesh position={[x, -0.15, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.25, 16]} />
                <meshStandardMaterial
                  color="#1a1a1a"
                  roughness={0.8}
                  metalness={0.2}
                />
              </mesh>
              <mesh position={[x, -0.15, -1.4]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.25, 16]} />
                <meshStandardMaterial
                  color="#1a1a1a"
                  roughness={0.8}
                  metalness={0.2}
                />
              </mesh>
            </React.Fragment>
          ))}

          {/* Tracks */}
          <mesh position={[0, -0.25, 1.6]}>
            <boxGeometry args={[5.5, 0.35, 0.5]} />
            <meshStandardMaterial color="#050505" roughness={1} />
          </mesh>
          <mesh position={[0, -0.25, -1.6]}>
            <boxGeometry args={[5.5, 0.35, 0.5]} />
            <meshStandardMaterial color="#050505" roughness={1} />
          </mesh>

          {/* Reactive armor */}
          {Array.from({ length: 8 }, (_, i) => (
            <mesh
              key={i}
              position={[i * 0.7 - 2.45, 0.6, 1.65]}
              rotation={[0.2, 0, 0]}
            >
              <boxGeometry args={[0.5, 0.15, 0.1]} />
              <meshStandardMaterial
                color="#3a0a0a"
                roughness={0.6}
                metalness={0.5}
              />
            </mesh>
          ))}
        </mesh>
      </group>
    );
  }
);

export default EnemyTank;
