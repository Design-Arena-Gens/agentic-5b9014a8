import { create } from "zustand";

export type WatchLayer =
  | "case"
  | "basePlate"
  | "gearTrain"
  | "escapement"
  | "balance"
  | "hands";

export type CameraView =
  | "isometric"
  | "top"
  | "side"
  | "escapement"
  | "gearTrain"
  | "balance";

export interface CameraTarget {
  position: [number, number, number];
  lookAt: [number, number, number];
}

const cameraPresets: Record<CameraView, CameraTarget> = {
  isometric: {
    position: [8, 6, 8],
    lookAt: [0, 0, 0],
  },
  top: {
    position: [0, 12, 0],
    lookAt: [0, 0, 0],
  },
  side: {
    position: [12, 2, 0],
    lookAt: [0, 0, 0],
  },
  escapement: {
    position: [3.2, 2, 0.6],
    lookAt: [0.75, 0.6, 0],
  },
  gearTrain: {
    position: [4.5, 3, -2.2],
    lookAt: [0, 0.4, 0],
  },
  balance: {
    position: [-3.5, 2.8, 2.2],
    lookAt: [-0.6, 1.1, 0],
  },
};

interface WatchState {
  hiddenLayers: Record<WatchLayer, boolean>;
  highlightedLayer: WatchLayer | null;
  exploded: boolean;
  rotationSpeed: number;
  cameraView: CameraView;
  cameraTarget: CameraTarget;
  layerOpacity: Record<WatchLayer, number>;
  toggleLayer: (layer: WatchLayer) => void;
  showOnlyLayer: (layer: WatchLayer) => void;
  setHighlightedLayer: (layer: WatchLayer | null) => void;
  revealAll: () => void;
  setExploded: (value: boolean) => void;
  setRotationSpeed: (value: number) => void;
  setCameraView: (view: CameraView) => void;
  setLayerOpacity: (layer: WatchLayer, opacity: number) => void;
}

const defaultLayerVisibility: Record<WatchLayer, boolean> = {
  case: false,
  basePlate: false,
  gearTrain: false,
  escapement: false,
  balance: false,
  hands: false,
};

const defaultLayerOpacity: Record<WatchLayer, number> = {
  case: 1,
  basePlate: 1,
  gearTrain: 1,
  escapement: 1,
  balance: 1,
  hands: 1,
};

export const useWatchStore = create<WatchState>((set) => ({
  hiddenLayers: { ...defaultLayerVisibility },
  highlightedLayer: null,
  exploded: false,
  rotationSpeed: 0.65,
  cameraView: "isometric",
  cameraTarget: cameraPresets.isometric,
  layerOpacity: { ...defaultLayerOpacity },
  toggleLayer: (layer) =>
    set((state) => ({
      hiddenLayers: {
        ...state.hiddenLayers,
        [layer]: !state.hiddenLayers[layer],
      },
      highlightedLayer:
        state.highlightedLayer === layer ? null : state.highlightedLayer,
    })),
  showOnlyLayer: (layer) =>
    set(() => ({
      hiddenLayers: {
        case: layer !== "case",
        basePlate: layer !== "basePlate",
        gearTrain: layer !== "gearTrain",
        escapement: layer !== "escapement",
        balance: layer !== "balance",
        hands: layer !== "hands",
      },
      highlightedLayer: layer,
    })),
  revealAll: () =>
    set(() => ({
      hiddenLayers: { ...defaultLayerVisibility },
      highlightedLayer: null,
    })),
  setHighlightedLayer: (layer) =>
    set(() => ({
      highlightedLayer: layer,
    })),
  setExploded: (value) =>
    set(() => ({
      exploded: value,
    })),
  setRotationSpeed: (value) =>
    set(() => ({
      rotationSpeed: Math.min(1.5, Math.max(0, value)),
    })),
  setCameraView: (view) =>
    set(() => ({
      cameraView: view,
      cameraTarget: cameraPresets[view],
    })),
  setLayerOpacity: (layer, opacity) =>
    set((state) => ({
      layerOpacity: {
        ...state.layerOpacity,
        [layer]: Math.min(1, Math.max(0, opacity)),
      },
    })),
}));

export const cameraViewPresets = cameraPresets;
