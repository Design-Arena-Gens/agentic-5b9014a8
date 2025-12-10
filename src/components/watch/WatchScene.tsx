"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, ThreeElements, useFrame, useThree } from "@react-three/fiber";
import {
  Html,
  Line,
  OrbitControls as DreiOrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Group, Vector2, Vector3 } from "three";
import { CameraView, WatchLayer, useWatchStore } from "@/state/useWatchStore";

type GearMaterial = "brass" | "steel" | "ruby";

interface GearProps extends Omit<ThreeElements["mesh"], "args"> {
  teeth: number;
  module: number;
  thickness: number;
  holeRadius?: number;
  color: GearMaterial;
  rotationFactor?: number;
  layer: WatchLayer;
  position?: [number, number, number];
}

interface LayerMeta {
  title: string;
  description: string;
  color: string;
}

const layerMeta: Record<WatchLayer, LayerMeta> = {
  case: {
    title: "Case & Crystal",
    description:
      "Protective architecture defining the exterior envelope and sapphire crystal.",
    color: "#d6e2f0",
  },
  basePlate: {
    title: "Main Plate & Bridges",
    description:
      "Structural brass base plate, pillars, and bridges supporting the train.",
    color: "#7f8ea3",
  },
  gearTrain: {
    title: "Gear Train",
    description:
      "Mainspring barrel drives the center, third, and fourth wheels to transmit power.",
    color: "#f7d27b",
  },
  escapement: {
    title: "Escapement",
    description:
      "Swiss lever escapement with escape wheel and pallets regulating impulse.",
    color: "#ff9171",
  },
  balance: {
    title: "Balance Assembly",
    description:
      "Balance wheel, hairspring, and shock protection oscillating at 4 Hz.",
    color: "#a2f2ff",
  },
  hands: {
    title: "Time Display",
    description:
      "Hand stack for hours, minutes, and seconds mounted above the motion works.",
    color: "#e0f5d0",
  },
};

const layerOrder: WatchLayer[] = [
  "case",
  "basePlate",
  "gearTrain",
  "escapement",
  "balance",
  "hands",
];

const baseLayerHeights: Record<WatchLayer, number> = {
  case: -0.6,
  basePlate: -0.1,
  gearTrain: 0.45,
  escapement: 1.05,
  balance: 1.7,
  hands: 2.35,
};

const materialPalette: Record<
  GearMaterial,
  THREE.MeshPhysicalMaterialParameters
> =
  {
    brass: {
      color: new THREE.Color("#f3c86b"),
      metalness: 0.9,
      roughness: 0.25,
    },
    steel: {
      color: new THREE.Color("#d8d8dd"),
      metalness: 1,
      roughness: 0.18,
    },
    ruby: {
      color: new THREE.Color("#d14b64"),
      metalness: 0,
      roughness: 0.1,
      transmission: 0.8,
      opacity: 0.8,
      transparent: true,
      emissive: new THREE.Color("#821a2e"),
      emissiveIntensity: 0.4,
    },
  };

const materialCache = new Map<
  string,
  THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial
>();

function getMaterial(
  paletteKey: GearMaterial,
  overrides?: Partial<THREE.MeshPhysicalMaterialParameters>
) {
  const key = `${paletteKey}-${JSON.stringify(overrides ?? {})}`;
  if (!materialCache.has(key)) {
    const params = {
      ...materialPalette[paletteKey],
      ...overrides,
    };
    materialCache.set(
      key,
      new THREE.MeshPhysicalMaterial({
        clearcoat: 0.6,
        clearcoatRoughness: 0.1,
        ...params,
      })
    );
  }
  return materialCache.get(key)!;
}

function createGearGeometry(
  teeth: number,
  module: number,
  thickness: number,
  holeRadius: number = module * teeth * 0.12
): THREE.BufferGeometry {
  const toothAngle = (Math.PI * 2) / teeth;
  const baseRadius = (module * teeth) / 2;
  const addendum = module * 0.95;
  const dedendum = module * 1.25;
  const addendumRadius = baseRadius + addendum;
  const dedendumRadius = Math.max(baseRadius - dedendum, holeRadius * 1.2);

  const shape = new THREE.Shape();
  const firstAngle = -toothAngle / 2;
  const firstPoint = new Vector2(
    Math.cos(firstAngle) * dedendumRadius,
    Math.sin(firstAngle) * dedendumRadius
  );
  shape.moveTo(firstPoint.x, firstPoint.y);

  for (let i = 0; i < teeth; i += 1) {
    const angle = i * toothAngle;
    const flankA = angle - toothAngle * 0.35;
    const tipA = angle - toothAngle * 0.12;
    const tipB = angle + toothAngle * 0.12;
    const flankB = angle + toothAngle * 0.35;

    shape.lineTo(
      Math.cos(flankA) * dedendumRadius,
      Math.sin(flankA) * dedendumRadius
    );
    shape.lineTo(
      Math.cos(tipA) * addendumRadius,
      Math.sin(tipA) * addendumRadius
    );
    shape.lineTo(
      Math.cos(tipB) * addendumRadius,
      Math.sin(tipB) * addendumRadius
    );
    shape.lineTo(
      Math.cos(flankB) * dedendumRadius,
      Math.sin(flankB) * dedendumRadius
    );
  }

  if (holeRadius > 0) {
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
  }

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: thickness,
    steps: 1,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.translate(0, 0, -thickness / 2);
  geometry.rotateX(Math.PI / 2);
  geometry.center();

  return geometry;
}

const layerIndices = layerOrder.reduce<Record<WatchLayer, number>>(
  (acc, layer, index) => {
    acc[layer] = index;
    return acc;
  },
  {} as Record<WatchLayer, number>
);

const rotationDirections: Record<WatchLayer, 1 | -1> = {
  case: 1,
  basePlate: 1,
  gearTrain: 1,
  escapement: -1,
  balance: 1,
  hands: 1,
};

const useLayerAttributes = (layer: WatchLayer) => {
  const hidden = useWatchStore((state) => state.hiddenLayers[layer]);
  const highlighted = useWatchStore((state) => state.highlightedLayer === layer);
  const opacity = useWatchStore((state) => state.layerOpacity[layer]);
  const exploded = useWatchStore((state) => state.exploded);
  const index = layerIndices[layer];
  const baseHeight = baseLayerHeights[layer];
  const y = baseHeight + (exploded ? index * 0.8 : 0);
  const factor = highlighted ? 1.2 : 1;
  return { hidden, highlighted, opacity, y, factor };
};

const Gear = ({
  teeth,
  module,
  thickness,
  holeRadius,
  color,
  rotationFactor = 1,
  layer,
  position = [0, 0, 0],
  ...props
}: GearProps) => {
  const { hidden, highlighted, opacity, factor } = useLayerAttributes(layer);
  const rotationSpeed = useWatchStore((state) => state.rotationSpeed);
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      getMaterial(color, {
        opacity,
        transparent: opacity < 1,
        emissive:
          highlighted && color !== "ruby"
            ? new THREE.Color(layerMeta[layer].color)
            : undefined,
        emissiveIntensity: highlighted ? 0.35 : 0,
      }),
    [color, opacity, highlighted, layer]
  );

  const geometry = useMemo(
    () => createGearGeometry(teeth, module, thickness, holeRadius),
    [teeth, module, thickness, holeRadius]
  );

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry]
  );

  useFrame((_, delta) => {
    if (!meshRef.current || hidden) return;
    const direction = rotationDirections[layer];
    meshRef.current.rotation.y +=
      delta * rotationSpeed * rotationFactor * direction * factor;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      visible={!hidden}
      position={position}
      {...props}
    >
      <primitive object={material} attach="material" />
    </mesh>
  );
};

const BalanceSpring = ({
  turns = 6,
  radius = 0.7,
  layer,
}: {
  turns?: number;
  radius?: number;
  layer: WatchLayer;
}) => {
  const { hidden, highlighted, opacity, y } = useLayerAttributes(layer);
  const points = useMemo(() => {
    const pts: Vector3[] = [];
    const steps = 480;
    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1);
      const angle = turns * Math.PI * 2 * t;
      const r = radius * (1 - t * 0.85);
      pts.push(new Vector3(Math.cos(angle) * r, 0.001, Math.sin(angle) * r));
    }
    return pts;
  }, [turns, radius]);

  return (
    <Line
      visible={!hidden}
      points={points}
      color={highlighted ? layerMeta[layer].color : "#c0f0ff"}
      lineWidth={1.5}
      transparent={opacity < 1}
      opacity={opacity}
      position={[0, y + 0.02, 0]}
      toneMapped={false}
    />
  );
};

const BalanceWheel = () => {
  const { hidden, highlighted, opacity, y, factor } =
    useLayerAttributes("balance");
  const rotationSpeed = useWatchStore((state) => state.rotationSpeed);
  const groupRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!groupRef.current || hidden) return;
    groupRef.current.rotation.y += delta * rotationSpeed * 1.5 * factor;
    groupRef.current.rotation.z = Math.sin(Date.now() * 0.005) * 0.2;
  });

  return (
    <group visible={!hidden} ref={groupRef} position={[0, y, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.07, 32, 128]} />
        <meshPhysicalMaterial
          {...materialPalette.brass}
          opacity={opacity}
          transparent={opacity < 1}
          emissiveIntensity={highlighted ? 0.4 : 0}
          emissive={highlighted ? new THREE.Color("#ffd180") : undefined}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.7, 32]} />
        <meshPhysicalMaterial
          {...materialPalette.steel}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.035, 16, 64]} />
        <meshPhysicalMaterial
          color="#d14b64"
          emissive="#5c1425"
          emissiveIntensity={0.6}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <BalanceSpring layer="balance" />
    </group>
  );
};

const JewelSetting = ({
  position,
  layer,
}: {
  position: [number, number, number];
  layer: WatchLayer;
}) => {
  const { hidden, opacity } = useLayerAttributes(layer);
  if (hidden) return null;
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.08, 0.08, 0.18, 32]} />
      <meshPhysicalMaterial
        {...materialPalette.steel}
        opacity={opacity}
        transparent={opacity < 1}
      />
    </mesh>
  );
};

const PalletFork = () => {
  const { hidden, highlighted, opacity, y } = useLayerAttributes("escapement");

  if (hidden) return null;
  return (
    <group position={[0.35, y + 0.14, 0]}>
      <mesh>
        <boxGeometry args={[0.28, 0.02, 0.03]} />
        <meshPhysicalMaterial
          {...materialPalette.steel}
          opacity={opacity}
          transparent={opacity < 1}
          emissiveIntensity={highlighted ? 0.3 : 0}
          emissive={highlighted ? new THREE.Color(layerMeta.escapement.color) : undefined}
        />
      </mesh>
      <mesh position={[0.14, 0.01, 0.05]}>
        <boxGeometry args={[0.06, 0.01, 0.02]} />
        <meshPhysicalMaterial
          {...materialPalette.ruby}
          opacity={opacity}
          transparent
        />
      </mesh>
      <mesh position={[0.14, 0.01, -0.05]}>
        <boxGeometry args={[0.06, 0.01, 0.02]} />
        <meshPhysicalMaterial
          {...materialPalette.ruby}
          opacity={opacity}
          transparent
        />
      </mesh>
    </group>
  );
};

const Escapement = () => {
  const { hidden, opacity, highlighted, y } =
    useLayerAttributes("escapement");
  if (hidden) return null;

  return (
    <group position={[0.65, y, 0]}>
      <Gear
        layer="escapement"
        teeth={15}
        module={0.42}
        thickness={0.28}
        color="steel"
        rotationFactor={6}
        position={[0, 0, 0]}
      />
      <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 24]} />
        <meshPhysicalMaterial
          {...materialPalette.steel}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <JewelSetting layer="escapement" position={[0, 0.24, 0]} />
      <PalletFork />
      <Html position={[0.1, 0.5, 0]}>
        <div className="rounded-md bg-slate-900/80 px-3 py-2 text-xs text-slate-100 backdrop-blur">
          Swiss lever escapement
        </div>
      </Html>
      <mesh position={[0, 0.32, 0]}>
        <torusGeometry args={[0.14, 0.015, 18, 48]} />
        <meshPhysicalMaterial
          color={highlighted ? layerMeta.escapement.color : "#9ca3af"}
          metalness={0.25}
          roughness={0.3}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
    </group>
  );
};

const TrainBridge = ({
  layer,
  width,
  length,
  thickness,
  position,
}: {
  layer: WatchLayer;
  width: number;
  length: number;
  thickness: number;
  position: [number, number, number];
}) => {
  const { hidden, opacity, highlighted } = useLayerAttributes(layer);
  if (hidden) return null;

  return (
    <mesh position={position}>
      <boxGeometry args={[width, thickness, length]} />
      <meshPhysicalMaterial
        {...materialPalette.brass}
        opacity={opacity}
        transparent={opacity < 1}
        emissiveIntensity={highlighted ? 0.25 : 0}
        emissive={highlighted ? new THREE.Color(layerMeta[layer].color) : undefined}
      />
    </mesh>
  );
};

const GearTrain = () => {
  const { hidden, opacity, highlighted, y } =
    useLayerAttributes("gearTrain");
  if (hidden) return null;

  return (
    <group position={[0, y, 0]}>
      <Gear
        layer="gearTrain"
        teeth={72}
        module={0.45}
        thickness={0.55}
        color="brass"
        rotationFactor={0.2}
      />
      <Gear
        layer="gearTrain"
        teeth={64}
        module={0.3}
        thickness={0.45}
        position={[0, 0.55, 0]}
        rotationFactor={0.5}
        color="brass"
      />
      <Gear
        layer="gearTrain"
        teeth={56}
        module={0.26}
        thickness={0.4}
        position={[0.8, 0.45, -0.6]}
        rotationFactor={1.2}
        color="brass"
      />
      <Gear
        layer="gearTrain"
        teeth={48}
        module={0.22}
        thickness={0.35}
        position={[1.35, 0.4, 0.3]}
        rotationFactor={2.5}
        color="brass"
      />
      <Gear
        layer="gearTrain"
        teeth={36}
        module={0.18}
        thickness={0.3}
        position={[0.65, 0.35, 0.65]}
        rotationFactor={4.4}
        color="steel"
      />
      <TrainBridge
        layer="gearTrain"
        width={2.6}
        length={1.6}
        thickness={0.14}
        position={[0.5, 0.72, 0.1]}
      />
      <JewelSetting layer="gearTrain" position={[0, 0.7, 0]} />
      <JewelSetting layer="gearTrain" position={[0.8, 0.68, -0.6]} />
      <JewelSetting layer="gearTrain" position={[1.35, 0.66, 0.3]} />
      <JewelSetting layer="gearTrain" position={[0.65, 0.64, 0.65]} />
      <Html position={[0, 1.2, -0.2]}>
        <div className="rounded-md bg-slate-900/80 px-3 py-2 text-xs text-slate-100 backdrop-blur">
          Barrel → center → third → fourth wheel with jeweled pivots
        </div>
      </Html>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 0.12, 64]} />
        <meshPhysicalMaterial
          color={highlighted ? layerMeta.gearTrain.color : "#efddae"}
          metalness={0.6}
          roughness={0.35}
          opacity={opacity * 0.8}
          transparent={true}
        />
      </mesh>
    </group>
  );
};

const MainPlate = () => {
  const { hidden, highlighted, opacity, y } =
    useLayerAttributes("basePlate");
  if (hidden) return null;
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <cylinderGeometry args={[2.4, 2.4, 0.45, 128]} />
        <meshPhysicalMaterial
          color={highlighted ? layerMeta.basePlate.color : "#d5d9e2"}
          metalness={0.25}
          roughness={0.7}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.1, 64]} />
        <meshPhysicalMaterial
          {...materialPalette.steel}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[2.15, 2.25, 0.12, 64]} />
        <meshPhysicalMaterial
          {...materialPalette.brass}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <Html position={[1.4, 0.6, 0]}>
        <div className="rounded-md bg-slate-900/80 px-3 py-2 text-xs text-slate-100 backdrop-blur">
          Côtes de Genève finishing on bridges
        </div>
      </Html>
    </group>
  );
};

const WatchCase = () => {
  const { hidden, highlighted, opacity, y } = useLayerAttributes("case");
  if (hidden) return null;
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <cylinderGeometry args={[2.8, 2.8, 0.4, 128]} />
        <meshPhysicalMaterial
          color={highlighted ? layerMeta.case.color : "#9aa4b6"}
          metalness={0.9}
          roughness={0.2}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[2.7, 2.4, 0.16, 128]} />
        <meshPhysicalMaterial
          color="#97a1bf"
          metalness={0.85}
          roughness={0.15}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[2.45, 2.4, 0.05, 128]} />
        <meshPhysicalMaterial
          color="#d7ebff"
          transparent
          opacity={opacity * 0.45}
          transmission={0.92}
          roughness={0.05}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>
      <mesh position={[2.6, 0.52, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.6, 32]} />
        <meshPhysicalMaterial
          {...materialPalette.steel}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
    </group>
  );
};

const Hand = ({
  length,
  thickness,
  color,
  elevation,
  rotationFactor,
}: {
  length: number;
  thickness: number;
  color: string;
  elevation: number;
  rotationFactor: number;
}) => {
  const { hidden, opacity } = useLayerAttributes("hands");
  const rotationSpeed = useWatchStore((state) => state.rotationSpeed);
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!meshRef.current || hidden) return;
    meshRef.current.rotation.y += delta * rotationSpeed * rotationFactor;
  });

  return (
    <mesh
      ref={meshRef}
      visible={!hidden}
      position={[0, elevation, 0]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <boxGeometry args={[thickness, length, 0.04]} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.8}
        roughness={0.25}
        opacity={opacity}
        transparent={opacity < 1}
      />
    </mesh>
  );
};

const WatchHands = () => {
  const { hidden, highlighted, opacity, y } = useLayerAttributes("hands");
  if (hidden) return null;
  return (
    <group position={[0, y, 0]}>
      <Hand
        length={2.1}
        thickness={0.1}
        color="#f5f5f5"
        elevation={0.06}
        rotationFactor={0.2}
      />
      <Hand
        length={1.7}
        thickness={0.15}
        color="#d9e6ff"
        elevation={0.12}
        rotationFactor={0.0166}
      />
      <Hand
        length={2.4}
        thickness={0.05}
        color="#ff8b5b"
        elevation={0.2}
        rotationFactor={6}
      />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.28, 32]} />
        <meshPhysicalMaterial
          color={highlighted ? layerMeta.hands.color : "#d4d9ec"}
          metalness={0.8}
          roughness={0.2}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
    </group>
  );
};

const LightingRig = () => (
  <>
    <ambientLight intensity={0.35} />
    <directionalLight
      position={[6, 8, 4]}
      intensity={1.2}
      castShadow
      shadow-mapSize={[1024, 1024]}
    />
    <pointLight position={[-6, 4, -2]} intensity={0.7} />
    <spotLight
      position={[0, 12, 6]}
      intensity={0.85}
      angle={0.45}
      penumbra={0.6}
      castShadow
    />
  </>
);

const CameraRig = () => {
  const { camera } = useThree();
  const target = useWatchStore((state) => state.cameraTarget);
  const currentPosition = useRef(new Vector3(...target.position));
  const currentTarget = useRef(new Vector3(...target.lookAt));
  const desiredPosition = useRef(new Vector3(...target.position));
  const desiredTarget = useRef(new Vector3(...target.lookAt));

  const [tx, ty, tz] = target.position;
  const [lx, ly, lz] = target.lookAt;

  useEffect(() => {
    desiredPosition.current.set(tx, ty, tz);
    desiredTarget.current.set(lx, ly, lz);
  }, [tx, ty, tz, lx, ly, lz]);

  useFrame((state, delta) => {
    const easing = 1 - Math.pow(0.001, delta);
    const controls = state.controls as OrbitControlsImpl | undefined;
    currentPosition.current.lerp(desiredPosition.current, easing);
    currentTarget.current.lerp(desiredTarget.current, easing);
    camera.position.copy(currentPosition.current);
    if (controls) {
      controls.target.lerp(currentTarget.current, easing);
      controls.update();
    }
    camera.lookAt(currentTarget.current);
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={40} />
      <DreiOrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={18}
        maxPolarAngle={Math.PI * 0.92}
      />
    </>
  );
};

const LayerLabel = ({ layer }: { layer: WatchLayer }) => {
  const { hidden, highlighted, y } = useLayerAttributes(layer);
  if (hidden) return null;
  return (
    <Html center position={[0, y + 0.35, -2.4]}>
      <div
        className={`rounded-full border border-white/30 bg-slate-900/70 px-4 py-1 text-xs font-medium text-slate-100 shadow-lg backdrop-blur ${
          highlighted ? "border-white/70 text-white" : ""
        }`}
      >
        {layerMeta[layer].title}
      </div>
    </Html>
  );
};

const GroundGrid = () => (
  <gridHelper args={[20, 40, "#5b6b7b", "#314155"]} position={[0, -0.95, 0]} />
);

export const WatchScene = () => {
  const highlightedLayer = useWatchStore((state) => state.highlightedLayer);

  return (
    <div className="h-full w-full rounded-3xl border border-slate-700/40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl">
      <Canvas
        shadows
        resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
      >
        <color attach="background" args={["#05090f"]} />
        <CameraRig />
        <LightingRig />
        <Suspense fallback={null}>
          <group>
            <WatchCase />
            <MainPlate />
            <GearTrain />
            <Escapement />
            <BalanceWheel />
            <WatchHands />
            {layerOrder.map((layer) => (
              <LayerLabel key={layer} layer={layer} />
            ))}
            <GroundGrid />
          </group>
        </Suspense>
      </Canvas>
      {highlightedLayer && (
        <div className="pointer-events-none absolute bottom-6 left-6 max-w-sm rounded-2xl border border-slate-700/40 bg-slate-900/80 p-4 text-slate-100 shadow-xl backdrop-blur">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            {layerMeta[highlightedLayer].title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            {layerMeta[highlightedLayer].description}
          </p>
        </div>
      )}
    </div>
  );
};

export const cameraViews: { id: CameraView; title: string }[] = [
  { id: "isometric", title: "Isometric" },
  { id: "top", title: "Top Down" },
  { id: "side", title: "Profile" },
  { id: "gearTrain", title: "Train Focus" },
  { id: "escapement", title: "Escapement" },
  { id: "balance", title: "Balance Assembly" },
];

export const layerList = layerOrder.map((layer) => ({
  id: layer,
  title: layerMeta[layer].title,
  description: layerMeta[layer].description,
  color: layerMeta[layer].color,
}));
