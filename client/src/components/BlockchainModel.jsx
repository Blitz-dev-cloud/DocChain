import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

// Single block component
const Block = ({ position, text, color, pulse = false, size = 1 }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [pulseScale, setPulseScale] = useState(1);

  // Pulse animation
  useEffect(() => {
    if (pulse) {
      const interval = setInterval(() => {
        setPulseScale((prev) => (prev === 1 ? 1.1 : 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [pulse]);

  // Slight floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      if (hovered) {
        meshRef.current.rotation.y += 0.01;
      }
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={hovered ? [1.1, 1.1, 1.1] : [pulseScale, pulseScale, pulseScale]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1.2 * size, 0.6 * size, 0.2 * size]} />
        <meshStandardMaterial
          color={hovered ? "#ffffff" : color}
          wireframe={true}
          emissive={color}
          emissiveIntensity={hovered ? 2 : 0.5}
        />
      </mesh>
      <Text
        position={[0, 0, 0.15]}
        color="white"
        fontSize={0.1 * size}
        maxWidth={1}
        textAlign="center"
      >
        {text}
      </Text>

      {/* Hash display as smaller text */}
      <Text
        position={[0, -0.2 * size, 0.15]}
        color="#33CCFF"
        fontSize={0.05 * size}
        maxWidth={1}
        textAlign="center"
      >
        {`Hash: ${text.length}f4b`}
      </Text>
    </group>
  );
};

// Connection line between blocks
const Connection = ({ start, end, color }) => {
  const points = [];
  points.push(new THREE.Vector3(...start));

  // Create curved line with control point
  const control = new THREE.Vector3(
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2 + 0.3
  );

  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const point = new THREE.Vector3();

    // Quadratic bezier curve
    point.x =
      (1 - t) * (1 - t) * start[0] +
      2 * (1 - t) * t * control.x +
      t * t * end[0];
    point.y =
      (1 - t) * (1 - t) * start[1] +
      2 * (1 - t) * t * control.y +
      t * t * end[1];
    point.z =
      (1 - t) * (1 - t) * start[2] +
      2 * (1 - t) * t * control.z +
      t * t * end[2];

    points.push(point);
  }

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({ color: color });

  return <primitive object={new THREE.Line(lineGeometry, lineMaterial)} />;
};

// Complete blockchain model
const BlockchainModel = () => {
  const [activeBlock, setActiveBlock] = useState(0);

  // Simulate blockchain activity
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBlock((prev) => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const blockData = [
    { text: "Genesis", color: "#00FFAA" },
    { text: "Medical Data", color: "#33CCFF" },
    { text: "Records", color: "#0077FF" },
    { text: "Doctor Notes", color: "#8844EE" },
    { text: "Prescriptions", color: "#FF44CC" },
  ];

  const positions = [
    [-4, 0, 0],
    [-2, 0, 0],
    [0, 0, 0],
    [2, 0, 0],
    [4, 0, 0],
  ];

  return (
    <group>
      {/* Main blockchain */}
      {blockData.map((block, i) => (
        <Block
          key={i}
          position={positions[i]}
          text={block.text}
          color={block.color}
          pulse={i === activeBlock}
        />
      ))}

      {/* Connections between blocks */}
      {positions.slice(0, -1).map((pos, i) => (
        <Connection
          key={i}
          start={[pos[0] + 0.6, pos[1], pos[2]]}
          end={[
            positions[i + 1][0] - 0.6,
            positions[i + 1][1],
            positions[i + 1][2],
          ]}
          color={blockData[i].color}
        />
      ))}

      {/* Add floating mini-blocks to represent new transactions */}
      <Block
        position={[0, 2, -1]}
        text="New Data"
        color="#FF44CC"
        pulse={true}
        size={0.6}
      />

      <Block
        position={[3, 1.5, -1]}
        text="Pending"
        color="#33CCFF"
        pulse={true}
        size={0.6}
      />

      <Block
        position={[-3, 1.8, -0.8]}
        text="Verified"
        color="#00FFAA"
        pulse={true}
        size={0.6}
      />
    </group>
  );
};

export default BlockchainModel;
