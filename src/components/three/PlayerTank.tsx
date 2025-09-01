import { useFrame, useLoader } from "@react-three/fiber";
import { gsap } from "gsap";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import machineGunSound from "../../assets/audio/machine-gun-firing.mp3";
import shellFiringSound from "../../assets/audio/shell-firing.mp3";
import tankMovingSound from "../../assets/audio/tank-moving.mp3";
import bgSource from "../../assets/img/north_korea_flag.jpeg";

interface PlayerTankProps {
  isActive: boolean;
  position: THREE.Vector3;
  rotation: number;
  onPositionChange: (position: THREE.Vector3) => void;
  onRotationChange: (rotation: number) => void;
  onMovingChange: (moving: boolean) => void;
  onRearViewChange: (rearView: boolean) => void;
  isDestroyed?: boolean;
  gameOver?: boolean;
  onProjectile: (projectile: {
    id: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    type: "shell" | "bullet";
    life: number;
    rotation: number;
    owner: "player" | "enemy";
  }) => void;
  // Sound callback for skid effect
  onSkid?: () => void;
}

const PlayerTank = React.forwardRef<THREE.Group, PlayerTankProps>(
  (
    {
      isActive,
      position,
      rotation,
      onPositionChange,
      onRotationChange,
      onMovingChange,
      onRearViewChange,
      isDestroyed = false,
      gameOver = false,
      onProjectile,
      onSkid,
    },
    ref
  ) => {
    const tankRef = ref as React.RefObject<THREE.Group>;
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const gunRef = useRef<THREE.Group>(null);
    const turretRef = useRef<THREE.Group>(null);
    const [keys, setKeys] = useState({
      w: false,
      a: false,
      s: false,
      d: false,
      b: false,
    });
    const [isFiring, setIsFiring] = useState(false);
    const [showSmoke, setShowSmoke] = useState(false);
    const [showShell, setShowShell] = useState(false);
    const [isMachineGunFiring, setIsMachineGunFiring] = useState(false);
    const [cannonCooldown, setCannonCooldown] = useState(false);
    const projectileId = useRef(0);

    const cannonAudioRef = useRef<HTMLAudioElement | null>(null);
    const machineGunAudioRef = useRef<HTMLAudioElement | null>(null);
    const engineAudioRef = useRef<HTMLAudioElement | null>(null);
    const machineGunInterval = useRef<number | null>(null);

    useEffect(() => {
      cannonAudioRef.current = new Audio(shellFiringSound);
      cannonAudioRef.current.volume = 1.0;
      machineGunAudioRef.current = new Audio(machineGunSound);
      machineGunAudioRef.current.volume = 1.0;
      engineAudioRef.current = new Audio(tankMovingSound);
      engineAudioRef.current.volume = 1.0;
    }, []);

    // Stop all sounds when game over or destroyed
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
        if (machineGunInterval.current) {
          clearInterval(machineGunInterval.current);
          machineGunInterval.current = null;
        }
        setIsMachineGunFiring(false);
      }
    }, [gameOver, isDestroyed, isActive]);

    useEffect(() => {
      if (!isActive) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        if (
          [
            "w",
            "a",
            "s",
            "d",
            "b",
            "arrowup",
            "arrowleft",
            "arrowdown",
            "arrowright",
          ].includes(key)
        ) {
          event.preventDefault();
          setKeys((prev) => ({
            ...prev,
            w: key === "w" || key === "arrowup" || prev.w,
            a: key === "a" || key === "arrowleft" || prev.a,
            s: key === "s" || key === "arrowdown" || prev.s,
            d: key === "d" || key === "arrowright" || prev.d,
            b: key === "b" || prev.b,
          }));
        }

        if (
          key === "enter" &&
          !isFiring &&
          !cannonCooldown &&
          !gameOver &&
          tankRef.current
        ) {
          event.preventDefault();
          setIsFiring(true);
          setShowSmoke(true);
          setShowShell(true);
          setCannonCooldown(true);

          const tankRotation = tankRef.current.rotation.y;
          const gunPos = new THREE.Vector3();
          tankRef.current.getWorldPosition(gunPos);
          gunPos.y += 0.9;
          gunPos.x += Math.cos(tankRotation) * 3;
          gunPos.z -= Math.sin(tankRotation) * 3;

          const shellVelocity = new THREE.Vector3(
            Math.cos(tankRotation) * 0.8,
            0,
            -Math.sin(tankRotation) * 0.8
          );

          onProjectile({
            id: projectileId.current++,
            position: gunPos.clone(),
            velocity: shellVelocity,
            type: "shell",
            life: 300,
            rotation: tankRotation,
            owner: "player",
          });

          if (cannonAudioRef.current) {
            cannonAudioRef.current.currentTime = 0;
            cannonAudioRef.current.play();
          }

          setTimeout(() => setIsFiring(false), 300);
          setTimeout(() => setShowSmoke(false), 1000);
          setTimeout(() => setShowShell(false), 500);
          setTimeout(() => setCannonCooldown(false), 1500);
        }

        if (key === " ") {
          event.preventDefault();
          if (!isMachineGunFiring && !gameOver) {
            setIsMachineGunFiring(true);
            if (machineGunAudioRef.current && !gameOver) {
              machineGunAudioRef.current.loop = true;
              machineGunAudioRef.current.play();
            }

            machineGunInterval.current = setInterval(() => {
              if (tankRef.current) {
                const tankRotation = tankRef.current.rotation.y;
                const gunPos = new THREE.Vector3();
                tankRef.current.getWorldPosition(gunPos);
                gunPos.y += 1.15;
                gunPos.x += Math.cos(tankRotation) * 1.8;
                gunPos.z -= Math.sin(tankRotation) * 1.8;

                const spread = (Math.random() - 0.5) * 0.1;
                const bulletVelocity = new THREE.Vector3(
                  Math.cos(tankRotation + spread) * 0.6,
                  0,
                  -Math.sin(tankRotation + spread) * 0.6
                );

                onProjectile({
                  id: projectileId.current++,
                  position: gunPos.clone(),
                  velocity: bulletVelocity,
                  type: "bullet",
                  life: 200,
                  rotation: tankRotation + spread,
                  owner: "player",
                });
              }
            }, 25);
          }
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        if (!isActive) return;
        const key = event.key.toLowerCase();
        if (
          [
            "w",
            "a",
            "s",
            "d",
            "b",
            "arrowup",
            "arrowleft",
            "arrowdown",
            "arrowright",
          ].includes(key)
        ) {
          setKeys((prev) => ({
            ...prev,
            w: key !== "w" && key !== "arrowup" && prev.w,
            a: key !== "a" && key !== "arrowleft" && prev.a,
            s: key !== "s" && key !== "arrowdown" && prev.s,
            d: key !== "d" && key !== "arrowright" && prev.d,
            b: key !== "b" && prev.b,
          }));
        }

        if (key === " ") {
          event.preventDefault();
          setIsMachineGunFiring(false);
          if (machineGunAudioRef.current) {
            machineGunAudioRef.current.pause();
            machineGunAudioRef.current.currentTime = 0;
          }
          if (machineGunInterval.current) {
            clearInterval(machineGunInterval.current);
            machineGunInterval.current = null;
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [cannonCooldown, isFiring, isMachineGunFiring, isActive, onProjectile]);

    useFrame((state) => {
      // Animate material
      if (materialRef.current) {
        const time = state.clock.getElapsedTime();
        materialRef.current.emissiveIntensity = 0.5 + Math.sin(time) * 0.2;
      }
      if (tankRef.current && isActive && !isDestroyed) {
        const speed = 0.25;
        const moving = keys.w || keys.s || keys.a || keys.d;

        onMovingChange(moving);
        onRearViewChange(keys.b);

        // Engine sound (only if game is not over)
        if (moving && engineAudioRef.current && !gameOver && !isDestroyed) {
          if (engineAudioRef.current.paused) {
            engineAudioRef.current.loop = true;
            engineAudioRef.current.play();
          }
        } else if (engineAudioRef.current) {
          engineAudioRef.current.pause();
          engineAudioRef.current.currentTime = 0;
        }

        // Movement
        const newPosition = position.clone();
        let newRotation = rotation;

        if (keys.w) {
          newPosition.x += speed * Math.cos(newRotation);
          newPosition.z -= speed * Math.sin(newRotation);
        }
        if (keys.s) {
          newPosition.x -= speed * Math.cos(newRotation);
          newPosition.z += speed * Math.sin(newRotation);
        }
        if (keys.a) newRotation += 0.03;
        if (keys.d) newRotation -= 0.03;

        if (!isDestroyed) {
          if (keys.w || keys.s) onPositionChange(newPosition);
          if (keys.a || keys.d) {
            onRotationChange(newRotation);
            if (onSkid) onSkid();
          }
        }

        // Update tank transform
        tankRef.current.position.copy(position);
        tankRef.current.rotation.y = rotation;

        // Recoil animations
        if (gunRef.current) gunRef.current.position.x = isFiring ? -0.1 : 0;
        if (turretRef.current)
          turretRef.current.position.x = isFiring ? -0.05 : 0;
      }
    });

    const handlePointerOver = () => {
      if (materialRef.current) {
        gsap.to(materialRef.current, { emissiveIntensity: 1, duration: 0.5 });
      }
    };

    const handlePointerOut = () => {
      if (materialRef.current) {
        gsap.to(materialRef.current, { emissiveIntensity: 0.5, duration: 0.5 });
      }
    };

    return (
      <group ref={tankRef} scale={[0.8, 0.8, 0.8]}>
        <mesh
          castShadow
          receiveShadow
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          {/* T-34 Hull - main body */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[5.5, 0.8, 2.8]} />
            <meshStandardMaterial
              ref={materialRef}
              color="#4a5d3a"
              roughness={0.8}
              metalness={0.2}
              emissive="#2a3520"
              emissiveIntensity={0.5}
            />
          </mesh>

          {/* Sloped front armor */}
          <mesh position={[2.5, 0.4, 0]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[0.8, 0.6, 2.8]} />
            <meshStandardMaterial
              color="#4a5d3a"
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>

          {/* Side armor plates */}
          <mesh position={[0, 0.1, 1.5]}>
            <boxGeometry args={[5.0, 0.3, 0.1]} />
            <meshStandardMaterial color="#3a4a2a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.1, -1.5]}>
            <boxGeometry args={[5.0, 0.3, 0.1]} />
            <meshStandardMaterial color="#3a4a2a" roughness={0.9} />
          </mesh>

          {/* North Korea emblem on hull */}
          <mesh position={[0.1, 0.4, 1.41]}>
            <boxGeometry args={[0.8, 0.4, 0.0]} />
            <meshStandardMaterial
              map={useLoader(THREE.TextureLoader, bgSource)}
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0.1, 0.4, -1.41]}>
            <boxGeometry args={[0.8, 0.4, 0.0]} />
            <meshStandardMaterial
              map={useLoader(THREE.TextureLoader, bgSource)}
              roughness={0.8}
            />
          </mesh>

          {/* T-34 Turret - distinctive rounded shape */}
          <group ref={turretRef} position={[0, 0.2, 0]}>
            <mesh position={[0.2, 0.8, 0]}>
              <cylinderGeometry args={[1.0, 1.2, 0.8, 6]} />
              <meshStandardMaterial
                color="#4a5d3a"
                roughness={0.8}
                metalness={0.2}
              />
            </mesh>

            {/* Turret mantlet */}
            <mesh position={[1.0, 0.9, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
              <meshStandardMaterial
                color="#3a4a2a"
                roughness={0.9}
                metalness={0.1}
              />
            </mesh>

            {/* T-34 76mm Gun */}
            <group ref={gunRef}>
              <mesh position={[2.8, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.06, 0.06, 4.5, 16]} />
                <meshStandardMaterial
                  color="#2a2a2a"
                  roughness={0.3}
                  metalness={0.8}
                />
              </mesh>

              {/* Muzzle flash */}
              {isFiring && (
                <>
                  <mesh position={[5, 0.9, 0]}>
                    <sphereGeometry args={[0.4, 8, 8]} />
                    <meshStandardMaterial
                      color="#ffff00"
                      emissive="#ff4400"
                      emissiveIntensity={3}
                    />
                  </mesh>
                  <mesh position={[5.2, 0.9, 0]}>
                    <coneGeometry args={[0.2, 0.8, 8]} />
                    <meshStandardMaterial
                      color="#ffaa00"
                      emissive="#ff6600"
                      emissiveIntensity={2}
                    />
                  </mesh>
                </>
              )}

              {/* Smoke effect */}
              {showSmoke && (
                <mesh position={[5.5, 0.9, 0]}>
                  <sphereGeometry args={[0.6, 8, 8]} />
                  <meshStandardMaterial
                    color="#666666"
                    transparent
                    opacity={0.5}
                  />
                </mesh>
              )}

              {/* Shell ejection */}
              {showShell && (
                <mesh position={[-0.5, 1.2, 0.3]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
                  <meshStandardMaterial color="#ffaa00" />
                </mesh>
              )}

              {/* Machine gun muzzle flash */}
              {isMachineGunFiring && (
                <>
                  <mesh position={[1.7, 1.15, 0]}>
                    <sphereGeometry args={[0.08, 6, 6]} />
                    <meshStandardMaterial
                      color="#ffff00"
                      emissive="#ff8800"
                      emissiveIntensity={3}
                    />
                  </mesh>
                  <mesh position={[1.8, 1.15, 0]}>
                    <coneGeometry args={[0.04, 0.2, 6]} />
                    <meshStandardMaterial
                      color="#ffaa00"
                      emissive="#ff4400"
                      emissiveIntensity={2}
                    />
                  </mesh>
                  <mesh position={[0.2, 1.0, 0.2]}>
                    <cylinderGeometry args={[0.01, 0.01, 0.03, 6]} />
                    <meshStandardMaterial color="#ffaa00" />
                  </mesh>
                </>
              )}
            </group>

            {/* Soldier on turret - Head */}
            <mesh position={[0.3, 1.25, 0]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#d4a574" roughness={0.8} />
            </mesh>
            {/* Neck */}
            <mesh position={[0.3, 1.1, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
              <meshStandardMaterial color="#d4a574" roughness={0.8} />
            </mesh>
            {/* Eyes */}
            <mesh position={[0.25, 1.27, 0.08]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh position={[0.35, 1.27, 0.08]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            {/* Torso */}
            <mesh position={[0.3, 0.9, 0]}>
              <boxGeometry args={[0.25, 0.5, 0.18]} />
              <meshStandardMaterial color="#4a5d3a" roughness={0.8} />
            </mesh>
            {/* Chest gear */}
            <mesh position={[0.32, 0.95, 0]}>
              <boxGeometry args={[0.27, 0.3, 0.05]} />
              <meshStandardMaterial color="#3a4a2a" roughness={0.9} />
            </mesh>
            {/* Arms */}
            <mesh position={[0.15, 0.9, 0]}>
              <boxGeometry args={[0.08, 0.35, 0.08]} />
              <meshStandardMaterial color="#4a5d3a" roughness={0.8} />
            </mesh>
            <mesh position={[0.45, 0.9, 0]}>
              <boxGeometry args={[0.08, 0.35, 0.08]} />
              <meshStandardMaterial color="#4a5d3a" roughness={0.8} />
            </mesh>
            {/* Hands */}
            <mesh position={[0.15, 0.7, 0]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#d4a574" roughness={0.8} />
            </mesh>
            <mesh position={[0.45, 0.7, 0]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#d4a574" roughness={0.8} />
            </mesh>
            {/* Military helmet */}
            <mesh position={[0.3, 1.35, 0]}>
              <sphereGeometry args={[0.13, 16, 8]} />
              <meshStandardMaterial
                color="#2a3520"
                roughness={0.9}
                metalness={0.1}
              />
            </mesh>
            {/* Helmet strap */}
            <mesh position={[0.3, 1.25, 0]}>
              <torusGeometry args={[0.11, 0.01, 8, 16]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>
            {/* Machine gun mount */}
            <mesh position={[0.3, 1.1, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
              <meshStandardMaterial
                color="#1a1a1a"
                roughness={0.3}
                metalness={0.8}
              />
            </mesh>
            {/* Machine gun barrel */}
            <mesh position={[1.0, 1.15, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 1.4, 12]} />
              <meshStandardMaterial
                color="#0a0a0a"
                roughness={0.2}
                metalness={0.9}
              />
            </mesh>
            {/* Machine gun body */}
            <mesh position={[0.35, 1.15, 0]}>
              <boxGeometry args={[0.15, 0.08, 0.06]} />
              <meshStandardMaterial
                color="#1a1a1a"
                roughness={0.3}
                metalness={0.8}
              />
            </mesh>
            {/* Ammo belt */}
            <mesh position={[0.25, 1.2, 0]}>
              <boxGeometry args={[0.08, 0.03, 0.03]} />
              <meshStandardMaterial color="#ffaa00" roughness={0.8} />
            </mesh>
          </group>

          {/* Driver's hatch */}
          <mesh position={[1.8, 0.6, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
            <meshStandardMaterial color="#3a4a2a" roughness={0.9} />
          </mesh>

          {/* External fuel tanks */}
          <mesh position={[-2.2, 0.4, 1.2]}>
            <cylinderGeometry args={[0.2, 0.2, 1.0, 12]} />
            <meshStandardMaterial color="#2a3520" roughness={0.8} />
          </mesh>
          <mesh position={[-2.2, 0.4, -1.2]}>
            <cylinderGeometry args={[0.2, 0.2, 1.0, 12]} />
            <meshStandardMaterial color="#2a3520" roughness={0.8} />
          </mesh>

          {/* Exhaust pipe */}
          <mesh position={[-2.5, 0.3, 0.8]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
            <meshStandardMaterial
              color="#1a1a1a"
              roughness={0.3}
              metalness={0.8}
            />
          </mesh>

          {/* Tool boxes */}
          <mesh position={[1.0, 0.7, 1.5]}>
            <boxGeometry args={[0.8, 0.2, 0.3]} />
            <meshStandardMaterial color="#3a4a2a" roughness={0.9} />
          </mesh>

          {/* T-34 Christie suspension - road wheels */}
          {[1.8, 0.9, 0, -0.9, -1.8].map((x, i) => (
            <React.Fragment key={i}>
              <mesh position={[x, -0.2, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
                <meshStandardMaterial
                  color="#2a2a2a"
                  roughness={0.8}
                  metalness={0.1}
                />
              </mesh>
              <mesh position={[x, -0.2, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
                <meshStandardMaterial
                  color="#2a2a2a"
                  roughness={0.8}
                  metalness={0.1}
                />
              </mesh>
            </React.Fragment>
          ))}

          {/* T-34 Tracks with treads */}
          <mesh position={[0, -0.3, 1.4]}>
            <boxGeometry args={[4.5, 0.3, 0.4]} />
            <meshStandardMaterial color="#0a0a0a" roughness={1} />
          </mesh>
          <mesh position={[0, -0.3, -1.4]}>
            <boxGeometry args={[4.5, 0.3, 0.4]} />
            <meshStandardMaterial color="#0a0a0a" roughness={1} />
          </mesh>

          {/* Track treads detail */}
          {Array.from({ length: 15 }, (_, i) => (
            <React.Fragment key={i}>
              <mesh position={[i * 0.3 - 2.1, -0.25, 1.4]}>
                <boxGeometry args={[0.05, 0.1, 0.4]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
              <mesh position={[i * 0.3 - 2.1, -0.25, -1.4]}>
                <boxGeometry args={[0.05, 0.1, 0.4]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
            </React.Fragment>
          ))}
        </mesh>
      </group>
    );
  }
);

export default PlayerTank;
