import { useFrame, useLoader } from "@react-three/fiber";
import { gsap } from "gsap";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import machineGunSound from "../../assets/audio/machine-gun-firing.mp3";
import shellFiringSound from "../../assets/audio/shell-firing.mp3";
import tankMovingSound from "../../assets/audio/tank-moving.mp3";
import bgSource from "../../assets/img/north_korea_flag.jpeg";

const HeroModel: React.FC = () => {
  // Create a T-34 tank using primitives
  const tankRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false });
  const [isFiring, setIsFiring] = useState(false);
  const [showSmoke, setShowSmoke] = useState(false);
  const [showShell, setShowShell] = useState(false);
  const [isMachineGunFiring, setIsMachineGunFiring] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [cannonCooldown, setCannonCooldown] = useState(false);
  const gunRef = useRef<THREE.Group>(null);
  const turretRef = useRef<THREE.Group>(null);
  const cannonAudioRef = useRef<HTMLAudioElement | null>(null);
  const machineGunAudioRef = useRef<HTMLAudioElement | null>(null);
  const engineAudioRef = useRef<HTMLAudioElement | null>(null);
  const machineGunInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create audio elements
    cannonAudioRef.current = new Audio(shellFiringSound);
    machineGunAudioRef.current = new Audio(machineGunSound);
    engineAudioRef.current = new Audio(tankMovingSound);

    return () => {
      // Cleanup audio elements
      if (cannonAudioRef.current) cannonAudioRef.current = null;
      if (machineGunAudioRef.current) machineGunAudioRef.current = null;
      if (engineAudioRef.current) engineAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowleft",
          "arrowdown",
          "arrowright",
        ].includes(key)
      ) {
        setKeys((prev) => ({
          ...prev,
          w: key === "w" || key === "arrowup" || prev.w,
          a: key === "a" || key === "arrowleft" || prev.a,
          s: key === "s" || key === "arrowdown" || prev.s,
          d: key === "d" || key === "arrowright" || prev.d,
        }));
      }

      if (key === "enter" && !isFiring && !cannonCooldown) {
        setIsFiring(true);
        setShowSmoke(true);
        setShowShell(true);
        setCannonCooldown(true);

        // Play cannon firing sound (only first bomb)
        if (cannonAudioRef.current) {
          cannonAudioRef.current.currentTime = 0;
          cannonAudioRef.current.play();
          
          // Stop after first bomb sound (adjust timing as needed)
          setTimeout(() => {
            if (cannonAudioRef.current) {
              cannonAudioRef.current.pause();
            }
          }, 1000);
        }

        setTimeout(() => setIsFiring(false), 300);
        setTimeout(() => setShowSmoke(false), 1000);
        setTimeout(() => setShowShell(false), 500);
        setTimeout(() => setCannonCooldown(false), 1500);
      }

      if (key === " " && !isMachineGunFiring) {
        setIsMachineGunFiring(true);

        // Play machine gun sound
        if (machineGunAudioRef.current && machineGunAudioRef.current.paused) {
          machineGunAudioRef.current.loop = true;
          machineGunAudioRef.current.play();
        }

        machineGunInterval.current = setInterval(() => {
          // Machine gun rapid fire effect
        }, 100);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
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
        }));
      }

      if (key === " ") {
        setIsMachineGunFiring(false);

        // Stop machine gun sound
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
  }, [cannonCooldown, isFiring, isMachineGunFiring]);

  useFrame((state) => {
    if (tankRef.current) {
      const speed = 0.05;

      // Tank movement
      const moving = keys.w || keys.s || keys.a || keys.d;
      setIsMoving(moving);

      // Engine sound control
      if (moving && engineAudioRef.current) {
        if (engineAudioRef.current.paused) {
          engineAudioRef.current.loop = true;
          engineAudioRef.current.play();
        }
      } else if (!moving && engineAudioRef.current) {
        engineAudioRef.current.pause();
        engineAudioRef.current.currentTime = 0;
      }

      if (keys.w) {
        tankRef.current.position.x +=
          speed * Math.cos(tankRef.current.rotation.y);
        tankRef.current.position.z -=
          speed * Math.sin(tankRef.current.rotation.y);
      }
      if (keys.s) {
        tankRef.current.position.x -=
          speed * Math.cos(tankRef.current.rotation.y);
        tankRef.current.position.z +=
          speed * Math.sin(tankRef.current.rotation.y);
      }
      if (keys.a) {
        tankRef.current.rotation.y += 0.03;
      }
      if (keys.d) {
        tankRef.current.rotation.y -= 0.03;
      }

      // Gun recoil animation
      if (gunRef.current && isFiring) {
        gunRef.current.position.x = -0.1;
      } else if (gunRef.current) {
        gunRef.current.position.x = 0;
      }

      // Turret recoil animation
      if (turretRef.current && isFiring) {
        turretRef.current.position.x = -0.05;
      } else if (turretRef.current) {
        turretRef.current.position.x = 0;
      }

      // Animate material
      if (materialRef.current) {
        const time = state.clock.getElapsedTime();
        materialRef.current.emissiveIntensity = 0.5 + Math.sin(time) * 0.2;
      }
    }
  });

  // Mouse interaction effect
  const handlePointerOver = () => {
    if (materialRef.current) {
      gsap.to(materialRef.current, {
        emissiveIntensity: 1,
        duration: 0.5,
      });
    }
  };

  const handlePointerOut = () => {
    if (materialRef.current) {
      gsap.to(materialRef.current, {
        emissiveIntensity: 0.5,
        duration: 0.5,
      });
    }
  };

  return (
    <>
      {/* T-34 Tank - movable */}
      <group ref={tankRef} scale={[0.8, 0.8, 0.8]} position={[0, 0.1, 0]}>
        <mesh
          castShadow
          receiveShadow
          position={[0, 0, 0]}
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

          {/* North Korea emblem on hull */}
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
                  {/* Shell casings */}
                  <mesh position={[0.2, 1.0, 0.2]}>
                    <cylinderGeometry args={[0.01, 0.01, 0.03, 6]} />
                    <meshStandardMaterial color="#ffaa00" />
                  </mesh>
                </>
              )}
            </group>

            {/* Soldier on turret */}
            {/* Head */}
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

            {/* Left arm */}
            <mesh position={[0.15, 0.9, 0]}>
              <boxGeometry args={[0.08, 0.35, 0.08]} />
              <meshStandardMaterial color="#4a5d3a" roughness={0.8} />
            </mesh>
            {/* Right arm */}
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

          {/* Diesel exhaust smoke */}
          {isMoving && (
            <>
              <mesh position={[-2.7, 0.5, 0.8]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshStandardMaterial
                  color="#444444"
                  transparent
                  opacity={0.6}
                />
              </mesh>
              <mesh position={[-2.9, 0.7, 0.8]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshStandardMaterial
                  color="#555555"
                  transparent
                  opacity={0.4}
                />
              </mesh>
              <mesh position={[-3.1, 0.9, 0.8]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial
                  color="#666666"
                  transparent
                  opacity={0.2}
                />
              </mesh>
            </>
          )}

          {/* Tool boxes */}
          <mesh position={[1.0, 0.7, 1.5]}>
            <boxGeometry args={[0.8, 0.2, 0.3]} />
            <meshStandardMaterial color="#3a4a2a" roughness={0.9} />
          </mesh>

          {/* T-34 Christie suspension - road wheels */}
          <mesh position={[1.8, -0.2, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[0.9, -0.2, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[0, -0.2, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[-0.9, -0.2, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[-1.8, -0.2, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>

          {/* Right side road wheels */}
          <mesh position={[1.8, -0.2, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[0.9, -0.2, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[0, -0.2, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[-0.9, -0.2, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[-1.8, -0.2, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial
              color="#2a2a2a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>

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
            <mesh key={i} position={[i * 0.3 - 2.1, -0.25, 1.4]}>
              <boxGeometry args={[0.05, 0.1, 0.4]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>
          ))}
          {Array.from({ length: 15 }, (_, i) => (
            <mesh key={i} position={[i * 0.3 - 2.1, -0.25, -1.4]}>
              <boxGeometry args={[0.05, 0.1, 0.4]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>
          ))}
        </mesh>
      </group>

      {/* Environment - static */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          map={useLoader(THREE.TextureLoader, bgSource)}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>
    </>
  );
};

export default HeroModel;
