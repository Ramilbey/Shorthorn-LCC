/** Dev-only rig viewer: open /?rig to orbit the model on its own. */
import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, Grid } from "@react-three/drei";
import Truck, { useRigMaterials } from "./Truck.jsx";

function Rig() {
  const materials = useRigMaterials();
  const speedRef = useRef(24);
  return <Truck speedRef={speedRef} materials={materials} />;
}

export default function Inspect() {
  return (
    <div className="h-screen w-screen bg-ink">
      <Canvas camera={{ position: [15, 2.8, 8.5], fov: 38, far: 300 }} dpr={[1, 1.6]}>
        <color attach="background" args={["#0a0f0d"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 14, 8]} intensity={2} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={5} position={[0, 10, -10]} scale={[30, 8, 1]} color="#dff5ea" />
          <Lightformer form="rect" intensity={3} position={[12, 6, 10]} scale={[16, 8, 1]} color="#16c07d" />
          <Lightformer form="rect" intensity={3} position={[-14, 6, 8]} scale={[16, 8, 1]} color="#ffffff" />
        </Environment>
        <Rig />
        <Grid
          position={[-4, 0, 0]}
          args={[60, 30]}
          cellSize={1}
          cellColor="#1d3a2e"
          sectionSize={5}
          sectionColor="#0d6b48"
          fadeDistance={70}
        />
        <OrbitControls target={[3.5, 1.8, 0]} />
      </Canvas>
    </div>
  );
}
