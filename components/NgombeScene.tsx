'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

function NgombeSphere({ position, color, speed = 1, distort = 0.3 }: {
  position: [number, number, number];
  color: string;
  speed?: number;
  distort?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 * speed;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshDistortMaterial
          color={color}
          roughness={0.2}
          metalness={0.8}
          distort={distort}
          speed={speed * 2}
        />
      </mesh>
    </Float>
  );
}

function NgombeTorus({ position, color }: {
  position: [number, number, number];
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position}>
        <torusGeometry args={[0.8, 0.3, 16, 32]} />
        <MeshWobbleMaterial
          color={color}
          roughness={0.3}
          metalness={0.7}
          factor={0.4}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

function Particles() {
  const count = 200;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#d4a843"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export default function NgombeScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#d4a843" />
        <directionalLight position={[-5, -5, -5]} intensity={0.5} color="#c45a2c" />
        <pointLight position={[0, 0, 3]} intensity={0.8} color="#2a5a1e" />

        <NgombeSphere position={[-2.5, 1, 0]} color="#c45a2c" speed={0.8} distort={0.4} />
        <NgombeSphere position={[2.5, -0.5, -1]} color="#d4a843" speed={1.2} distort={0.3} />
        <NgombeSphere position={[0, 2, -2]} color="#2a5a1e" speed={0.6} distort={0.5} />

        <NgombeTorus position={[-1.5, -1.5, 1]} color="#c45a2c" />
        <NgombeTorus position={[2, 1.5, -1]} color="#d4a843" />

        <Particles />
      </Canvas>
    </div>
  );
}
