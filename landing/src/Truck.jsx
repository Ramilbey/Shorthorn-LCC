/**
 * Shorthorn Cargo — the rig, built as real geometry.
 *
 * Bodywork is extruded from side profiles with heavy bevels rather than
 * assembled from boxes, which is what keeps the silhouette curved. Tyres are
 * lathe-turned so the sidewall bulges, rims are extruded shapes with real
 * spoke cut-outs, and every wheel is on its own spinning group.
 *
 * Facing +X, length along X, width along Z, ground at y = 0. 1 unit = 1 metre.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Dimensions                                                         */
/* ------------------------------------------------------------------ */

export const RIG = {
  tireR: 0.53,
  tireW: 0.34,
  track: 1.16,
  cabWidth: 2.5,
  hoodWidth: 2.34,
  trailer: { length: 16.15, height: 2.9, width: 2.6, floor: 1.16, nose: 0.95 },
};

const AXLES = [
  { x: 6.0, dual: false, steer: true },
  { x: 1.95, dual: true },
  { x: 0.55, dual: true },
  { x: -12.4, dual: true },
  { x: -13.85, dual: true },
];

/* ------------------------------------------------------------------ */
/*  Materials                                                          */
/* ------------------------------------------------------------------ */

export function useRigMaterials() {
  const materials = useMemo(() => {
    return {
      paint: new THREE.MeshPhysicalMaterial({
        color: "#073d29",
        metalness: 0.6,
        roughness: 0.21,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 2.1,
      }),
      paintDark: new THREE.MeshPhysicalMaterial({
        color: "#04251a",
        metalness: 0.6,
        roughness: 0.26,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.8,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: "#eef4f2",
        metalness: 1,
        roughness: 0.06,
        envMapIntensity: 2.6,
      }),
      alloy: new THREE.MeshStandardMaterial({
        color: "#c9d3d0",
        metalness: 1,
        roughness: 0.19,
        envMapIntensity: 2.1,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#060f12",
        metalness: 0.6,
        roughness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 3.4,
      }),
      rubber: new THREE.MeshStandardMaterial({
        color: "#0a0c0d",
        metalness: 0.05,
        roughness: 0.88,
      }),
      frame: new THREE.MeshStandardMaterial({
        color: "#0d1412",
        metalness: 0.85,
        roughness: 0.42,
        envMapIntensity: 1.2,
      }),
      panel: new THREE.MeshPhysicalMaterial({
        color: "#e9eeeb",
        metalness: 0.45,
        roughness: 0.34,
        clearcoat: 0.5,
        envMapIntensity: 1.5,
      }),
      lamp: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: new THREE.Color("#fff4dd"),
        emissiveIntensity: 6,
        roughness: 0.2,
      }),
      tail: new THREE.MeshStandardMaterial({
        color: "#5c0d0d",
        emissive: new THREE.Color("#ff2d2d"),
        emissiveIntensity: 4,
        roughness: 0.3,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: "#0d5c3f",
        emissive: new THREE.Color("#16c07d"),
        emissiveIntensity: 3.4,
        roughness: 0.35,
      }),
    };
  }, []);

  useEffect(
    () => () => Object.values(materials).forEach((m) => m.dispose()),
    [materials],
  );
  return materials;
}

/* ------------------------------------------------------------------ */
/*  Textures drawn to canvas — keeps the build asset-free              */
/* ------------------------------------------------------------------ */

function useCanvasTexture(draw, { width, height, repeat }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext("2d"), width, height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
    }
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

const drawTread = (ctx, w, h) => {
  ctx.fillStyle = "#0a0c0d";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#171b1c";
  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * w;
    ctx.fillRect(x, 0, w / 40, h);
  }
  // shoulder blocks
  ctx.fillStyle = "#101314";
  for (let i = 0; i < 36; i++) {
    const x = (i / 36) * w;
    ctx.fillRect(x, h * 0.06, w / 90, h * 0.12);
    ctx.fillRect(x, h * 0.82, w / 90, h * 0.12);
  }
};

const drawGrille = (ctx, w, h) => {
  ctx.fillStyle = "#12181a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#9aa8a4";
  ctx.lineWidth = 3;
  for (let y = 4; y < h; y += 11) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#5d6a67";
  ctx.lineWidth = 2;
  for (let x = 4; x < w; x += 9) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
};

/** Trailer livery: brand block, wordmark and authority numbers. */
const drawLivery = (ctx, w, h) => {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // vertical rib shading, so the panel does not read as flat vinyl
  ctx.fillStyle = "rgba(15,30,25,0.055)";
  for (let x = 0; x < w; x += 26) ctx.fillRect(x, 0, 7, h);

  ctx.fillStyle = "#003926";
  ctx.fillRect(0, h * 0.72, w, h * 0.055);

  // monogram tile
  const tile = h * 0.42;
  const tx = w * 0.075;
  const ty = h * 0.2;
  ctx.fillStyle = "#003926";
  ctx.fillRect(tx, ty, tile, tile);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${tile * 0.66}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", tx + tile / 2, ty + tile / 2 + tile * 0.02);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#003926";
  const stack = '700 SIZEpx "Arial Black", Impact, sans-serif';
  let size = h * 0.3;
  const x0 = tx + tile + w * 0.03;
  const fit = () => {
    ctx.font = stack.replace("SIZE", size);
    return ctx.measureText("SHORTHORN CARGO").width;
  };
  if (fit() > w - x0 - w * 0.04) {
    size = Math.floor(size * ((w - x0 - w * 0.04) / fit()));
    fit();
  }
  ctx.fillText("SHORTHORN CARGO", x0, ty + tile * 0.62);

  ctx.font = `500 ${h * 0.1}px "Courier New", monospace`;
  ctx.fillStyle = "#0d5c3f";
  ctx.fillText("USDOT 3856749  ·  MC 1407566", x0 + 4, ty + tile * 1.02);
};

/* ------------------------------------------------------------------ */
/*  Geometry builders                                                  */
/* ------------------------------------------------------------------ */

const EXTRUDE = {
  curveSegments: 18,
  bevelEnabled: true,
  bevelSegments: 4,
  steps: 1,
};

function extrude(build, depth, bevel = 0.06) {
  const shape = new THREE.Shape();
  build(shape);
  const geo = new THREE.ExtrudeGeometry(shape, {
    ...EXTRUDE,
    depth: depth - bevel * 2,
    bevelThickness: bevel,
    bevelSize: bevel,
  });
  geo.translate(0, 0, -depth / 2 + bevel);
  return geo;
}

/** Sleeper + cab shell: flat back, curved roof fairing, raked screen pillar. */
function cabShape(s) {
  s.moveTo(0.15, 0.98);
  s.lineTo(0.15, 3.3);
  s.quadraticCurveTo(0.18, 3.62, 0.62, 3.66);
  s.lineTo(2.45, 3.68);
  s.quadraticCurveTo(3.5, 3.68, 4.0, 3.42);
  s.lineTo(4.62, 3.16);
  s.quadraticCurveTo(4.86, 3.06, 4.9, 2.86);
  s.lineTo(5.02, 2.1);
  s.quadraticCurveTo(5.06, 1.72, 4.86, 1.5);
  s.lineTo(4.4, 1.06);
  s.quadraticCurveTo(4.2, 0.9, 3.85, 0.9);
  s.lineTo(0.55, 0.9);
  s.quadraticCurveTo(0.2, 0.9, 0.15, 0.98);
}

/** Aero hood: rounded nose dropping away from the windscreen. */
function hoodShape(s) {
  s.moveTo(4.95, 1.12);
  s.lineTo(4.95, 2.62);
  s.quadraticCurveTo(5.4, 2.66, 5.9, 2.55);
  s.quadraticCurveTo(6.6, 2.42, 6.95, 2.12);
  s.quadraticCurveTo(7.16, 1.94, 7.18, 1.66);
  s.lineTo(7.18, 1.3);
  s.quadraticCurveTo(7.16, 1.14, 6.95, 1.12);
  s.lineTo(4.95, 1.12);
}

/** Roof fairing that carries over the trailer nose. */
function fairingShape(s) {
  s.moveTo(0.2, 3.5);
  s.lineTo(0.2, 4.02);
  s.quadraticCurveTo(1.4, 4.12, 2.6, 3.98);
  s.quadraticCurveTo(3.6, 3.86, 4.05, 3.5);
  s.lineTo(3.4, 3.44);
  s.quadraticCurveTo(2.2, 3.6, 0.2, 3.5);
}

/** Wheel arch over the steer axle. */
function fenderShape(s, r) {
  s.absarc(0, 0, r + 0.16, Math.PI * 0.04, Math.PI * 0.96, false);
  s.absarc(0, 0, r + 0.02, Math.PI * 0.96, Math.PI * 0.04, true);
}

/** Alloy rim face with five cut-outs. */
function rimShape(s, outer) {
  s.absarc(0, 0, outer, 0, Math.PI * 2, false);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const hole = new THREE.Path();
    hole.absarc(
      Math.cos(a) * outer * 0.55,
      Math.sin(a) * outer * 0.55,
      outer * 0.26,
      0,
      Math.PI * 2,
      true,
    );
    s.holes.push(hole);
  }
}

/* ------------------------------------------------------------------ */
/*  Wheels                                                             */
/* ------------------------------------------------------------------ */

function useWheelGeometry() {
  return useMemo(() => {
    const R = RIG.tireR;
    const halfW = RIG.tireW / 2;
    // Lathe profile: rim seat → sidewall bulge → crown → back down.
    const profile = [
      new THREE.Vector2(R * 0.58, -halfW),
      new THREE.Vector2(R * 0.78, -halfW - 0.01),
      new THREE.Vector2(R * 0.93, -halfW + 0.02),
      new THREE.Vector2(R * 0.995, -halfW * 0.55),
      new THREE.Vector2(R, 0),
      new THREE.Vector2(R * 0.995, halfW * 0.55),
      new THREE.Vector2(R * 0.93, halfW - 0.02),
      new THREE.Vector2(R * 0.78, halfW + 0.01),
      new THREE.Vector2(R * 0.58, halfW),
    ];
    const tire = new THREE.LatheGeometry(profile, 42);
    tire.rotateX(Math.PI / 2);

    // Extrudes along +Z, which is already the axle axis — no rotation needed.
    const rim = new THREE.ExtrudeGeometry(
      (() => {
        const s = new THREE.Shape();
        rimShape(s, R * 0.6);
        return s;
      })(),
      {
        curveSegments: 20,
        depth: 0.05,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.012,
        bevelThickness: 0.012,
      },
    );

    return { tire, rim };
  }, []);
}

/** One hub assembly. The axle runs along Z, so every part turns about Z. */
function Wheel({ dual, side, materials, geo, tireMat }) {
  const offsets = dual ? [-0.185, 0.185] : [0];
  const face = side * (dual ? 0.37 : 0.185);
  return (
    <group>
      {offsets.map((o) => (
        <mesh key={o} geometry={geo.tire} position={[0, 0, o]} material={tireMat} />
      ))}
      {/* alloy face, hub and lug ring — outboard side only */}
      <mesh geometry={geo.rim} position={[0, 0, face]} material={materials.alloy} />
      <mesh
        position={[0, 0, face - side * 0.015]}
        rotation={[Math.PI / 2, 0, 0]}
        material={materials.alloy}
      >
        <cylinderGeometry args={[RIG.tireR * 0.6, RIG.tireR * 0.6, 0.03, 32]} />
      </mesh>
      <mesh
        position={[0, 0, face + side * 0.05]}
        rotation={[Math.PI / 2, 0, 0]}
        material={materials.chrome}
      >
        <cylinderGeometry args={[RIG.tireR * 0.17, RIG.tireR * 0.14, 0.07, 20]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(a) * RIG.tireR * 0.3,
              Math.sin(a) * RIG.tireR * 0.3,
              face + side * 0.03,
            ]}
            rotation={[Math.PI / 2, 0, 0]}
            material={materials.chrome}
          >
            <cylinderGeometry args={[0.03, 0.03, 0.035, 8]} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  The rig                                                            */
/* ------------------------------------------------------------------ */

export default function Truck({ speedRef, reduced = false, materials }) {
  const mats = materials;
  const geo = useWheelGeometry();
  const tread = useCanvasTexture(drawTread, { width: 1024, height: 128, repeat: [1, 1] });
  const grille = useCanvasTexture(drawGrille, { width: 256, height: 256 });
  const livery = useCanvasTexture(drawLivery, { width: 2048, height: 512 });

  const wheels = useRef([]);
  const steer = useRef([]);
  const tractor = useRef();
  const trailer = useRef();

  const T = RIG.trailer;
  const trailerMidX = T.nose - T.length / 2;
  const trailerMidY = T.floor + T.height / 2;
  const halfW = T.width / 2;

  const bodyGeo = useMemo(
    () => ({
      cab: extrude(cabShape, RIG.cabWidth, 0.09),
      hood: extrude(hoodShape, RIG.hoodWidth, 0.14),
      fairing: extrude(fairingShape, RIG.cabWidth - 0.14, 0.07),
      fender: extrude((s) => fenderShape(s, RIG.tireR), 0.42, 0.03),
    }),
    [],
  );

  useEffect(
    () => () => Object.values(bodyGeo).forEach((g) => g.dispose()),
    [bodyGeo],
  );

  // One tyre material shared by all twenty casings.
  const tireMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tread,
        color: "#14181a",
        metalness: 0.04,
        roughness: 0.88,
      }),
    [tread],
  );
  useEffect(() => () => tireMat.dispose(), [tireMat]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    const v = speedRef.current;

    // ω = v / r — the wheels are geared to the road, not to the clock.
    const omega = (v / RIG.tireR) * d;
    for (const w of wheels.current) if (w) w.rotation.z -= omega;

    // steer axle wanders the way a rig tracks a lane
    const angle = reduced ? 0 : Math.sin(t * 0.34) * 0.035;
    for (const s of steer.current) if (s) s.rotation.y = angle;

    if (!reduced) {
      const load = Math.min(v / 26, 1);
      if (tractor.current) {
        tractor.current.position.y =
          (Math.sin(t * 3.4) * 0.017 + Math.sin(t * 8.2) * 0.006) * load;
        tractor.current.rotation.z = Math.sin(t * 2.1) * 0.0022 * load;
      }
      if (trailer.current) {
        // trailer lags the tractor — that phase offset is what sells the mass
        trailer.current.position.y =
          (Math.sin(t * 3.4 - 0.9) * 0.012 + Math.sin(t * 6.1 - 0.5) * 0.005) * load;
        trailer.current.rotation.z = Math.sin(t * 2.1 - 0.7) * 0.0016 * load;
      }
    }
  });

  return (
    <group>
      {/* ================= trailer ================= */}
      <group ref={trailer}>
        <mesh position={[trailerMidX, trailerMidY, 0]} material={mats.panel}>
          <boxGeometry args={[T.length, T.height, T.width]} />
        </mesh>

        {/* livery down both flanks */}
        {[1, -1].map((side) => (
          <mesh
            key={side}
            position={[trailerMidX + 0.4, trailerMidY + 0.25, side * (halfW + 0.008)]}
            rotation={[0, side === 1 ? 0 : Math.PI, 0]}
          >
            <planeGeometry args={[T.length - 1.2, 1.85]} />
            <meshPhysicalMaterial
              map={livery}
              metalness={0.25}
              roughness={0.42}
              clearcoat={0.4}
              envMapIntensity={1.2}
            />
          </mesh>
        ))}

        {/* roof cap, belly rail, rear frame, ICC bumper */}
        <mesh position={[trailerMidX, T.floor + T.height + 0.02, 0]} material={mats.chrome}>
          <boxGeometry args={[T.length, 0.07, T.width + 0.05]} />
        </mesh>
        <mesh position={[trailerMidX, T.floor - 0.04, 0]} material={mats.frame}>
          <boxGeometry args={[T.length, 0.2, T.width + 0.02]} />
        </mesh>
        <mesh
          position={[trailerMidX - T.length / 2 - 0.04, trailerMidY, 0]}
          material={mats.frame}
        >
          <boxGeometry args={[0.1, T.height, T.width]} />
        </mesh>
        <mesh
          position={[trailerMidX - T.length / 2 + 0.15, 0.55, 0]}
          material={mats.frame}
        >
          <boxGeometry args={[0.5, 0.12, 2.3]} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh
            key={side}
            position={[trailerMidX - T.length / 2 - 0.1, 1.0, side * 0.86]}
            material={mats.tail}
          >
            <boxGeometry args={[0.06, 0.24, 0.46]} />
          </mesh>
        ))}

        {/* aero side skirts */}
        {[1, -1].map((side) => (
          <mesh
            key={side}
            position={[trailerMidX - 2.4, 0.66, side * (halfW - 0.07)]}
            material={mats.panel}
          >
            <boxGeometry args={[7.4, 0.9, 0.05]} />
          </mesh>
        ))}

        {/* landing gear */}
        {[1, -1].map((side) => (
          <group key={side}>
            <mesh position={[-3.1, 0.6, side * 0.72]} material={mats.frame}>
              <boxGeometry args={[0.16, 1.1, 0.16]} />
            </mesh>
            <mesh position={[-3.1, 0.06, side * 0.72]} material={mats.frame}>
              <boxGeometry args={[0.42, 0.12, 0.3]} />
            </mesh>
          </group>
        ))}

        {/* mudflaps */}
        {[1, -1].map((side) => (
          <mesh key={side} position={[-14.75, 0.3, side * 1.14]} material={mats.rubber}>
            <boxGeometry args={[0.03, 0.58, 0.6]} />
          </mesh>
        ))}

        {/* green marker strip along the belly */}
        {[1, -1].map((side) => (
          <mesh
            key={side}
            position={[trailerMidX - 1, T.floor + 0.06, side * (halfW + 0.02)]}
            material={mats.accent}
          >
            <boxGeometry args={[T.length - 3, 0.05, 0.03]} />
          </mesh>
        ))}
      </group>

      {/* ================= tractor ================= */}
      <group ref={tractor}>
        <mesh geometry={bodyGeo.cab} material={mats.paint} />
        <mesh geometry={bodyGeo.hood} material={mats.paint} />
        <mesh geometry={bodyGeo.fairing} material={mats.paint} position={[0, 0, 0]} />

        {/* chassis rails + fifth wheel */}
        {[1, -1].map((side) => (
          <mesh key={side} position={[3.2, 0.86, side * 0.5]} material={mats.frame}>
            <boxGeometry args={[7.4, 0.2, 0.12]} />
          </mesh>
        ))}
        <mesh position={[1.15, 1.0, 0]} material={mats.frame}>
          <boxGeometry args={[1.5, 0.14, 1.4]} />
        </mesh>
        <mesh position={[0.9, 1.09, 0]} rotation={[0, 0, 0]} material={mats.chrome}>
          <cylinderGeometry args={[0.3, 0.3, 0.06, 24]} />
        </mesh>

        {/* windscreen + side glass + sleeper port */}
        <mesh
          position={[4.79, 2.42, 0]}
          rotation={[0, 0, -0.42]}
          material={mats.glass}
        >
          <boxGeometry args={[0.07, 1.42, 2.24]} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh
            key={side}
            position={[4.05, 2.42, side * 1.245]}
            material={mats.glass}
          >
            <boxGeometry args={[1.25, 0.92, 0.05]} />
          </mesh>
        ))}
        {[1, -1].map((side) => (
          <mesh key={side} position={[1.35, 2.85, side * 1.245]} material={mats.glass}>
            <boxGeometry args={[0.62, 0.5, 0.05]} />
          </mesh>
        ))}

        {/* grille, bumper, headlamps */}
        <mesh position={[7.16, 1.78, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.5, 0.78]} />
          <meshStandardMaterial map={grille} metalness={0.9} roughness={0.35} />
        </mesh>
        <mesh position={[7.19, 1.78, 0]} material={mats.chrome}>
          <boxGeometry args={[0.06, 0.86, 1.62]} />
        </mesh>
        <mesh position={[7.24, 1.05, 0]} material={mats.chrome}>
          <boxGeometry args={[0.22, 0.46, 2.36]} />
        </mesh>
        {[1, -1].map((side) => (
          <group key={side}>
            <mesh position={[7.06, 1.5, side * 0.88]} material={mats.lamp}>
              <boxGeometry args={[0.07, 0.22, 0.46]} />
            </mesh>
            <pointLight
              position={[7.9, 1.5, side * 0.88]}
              color="#ffe9c4"
              intensity={4}
              distance={14}
              decay={2}
            />
          </group>
        ))}

        {/* roof marker lamps */}
        {[-0.72, -0.36, 0, 0.36, 0.72].map((z) => (
          <mesh key={z} position={[3.9, 3.52, z]} material={mats.lamp}>
            <boxGeometry args={[0.13, 0.06, 0.14]} />
          </mesh>
        ))}

        {/* exhaust stacks, tanks, mirrors, steps */}
        {[1, -1].map((side) => (
          <mesh
            key={side}
            position={[3.05, 2.35, side * 1.32]}
            material={mats.chrome}
          >
            <cylinderGeometry args={[0.1, 0.1, 3.3, 18]} />
          </mesh>
        ))}
        {[1, -1].map((side) => (
          <mesh
            key={side}
            position={[3.6, 0.8, side * 1.3]}
            rotation={[0, 0, Math.PI / 2]}
            material={mats.chrome}
          >
            <cylinderGeometry args={[0.38, 0.38, 1.7, 28]} />
          </mesh>
        ))}
        {[1, -1].map((side) => (
          <group key={side}>
            <mesh position={[4.86, 2.72, side * 1.44]} material={mats.frame}>
              <boxGeometry args={[0.05, 0.05, 0.36]} />
            </mesh>
            <mesh position={[4.86, 2.5, side * 1.66]} material={mats.paintDark}>
              <boxGeometry args={[0.07, 0.68, 0.2]} />
            </mesh>
          </group>
        ))}
        {[1, -1].map((side) => (
          <mesh key={side} position={[4.6, 0.55, side * 1.2]} material={mats.frame}>
            <boxGeometry args={[0.62, 0.05, 0.4]} />
          </mesh>
        ))}

        {/* chassis fairing + green light bar */}
        {[1, -1].map((side) => (
          <mesh key={side} position={[2.2, 0.72, side * 1.14]} material={mats.paint}>
            <boxGeometry args={[2.6, 0.72, 0.1]} />
          </mesh>
        ))}
        {[1, -1].map((side) => (
          <mesh key={side} position={[4.35, 0.52, side * 1.18]} material={mats.accent}>
            <boxGeometry args={[1.1, 0.04, 0.03]} />
          </mesh>
        ))}

        {/* steer-axle fenders — the arch profile already extrudes across the tyre */}
        {[1, -1].map((side) => (
          <mesh
            key={side}
            geometry={bodyGeo.fender}
            material={mats.paint}
            position={[AXLES[0].x, RIG.tireR, side * RIG.track]}
          />
        ))}
      </group>

      {/* ================= wheels ================= */}
      {AXLES.map((axle, ai) => (
        <group key={axle.x}>
          {[1, -1].map((side, si) => {
            // Steering turns about Y, rolling about Z — so the steer knuckle has
            // to be the parent of the spinning hub, never the other way round.
            const hub = (
              <group
                ref={(el) => {
                  wheels.current[ai * 2 + si] = el;
                }}
              >
                <Wheel
                  dual={axle.dual}
                  side={side}
                  materials={mats}
                  geo={geo}
                  tireMat={tireMat}
                />
              </group>
            );
            return (
              <group
                key={side}
                position={[axle.x, RIG.tireR, side * RIG.track]}
                ref={
                  axle.steer
                    ? (el) => {
                        steer.current[si] = el;
                      }
                    : undefined
                }
              >
                {hub}
              </group>
            );
          })}
          <mesh
            position={[axle.x, RIG.tireR, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={mats.frame}
          >
            <cylinderGeometry args={[0.1, 0.1, RIG.track * 2, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
