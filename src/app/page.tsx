"use client";

import {
  WatchScene,
  cameraViews,
  layerList,
} from "@/components/watch/WatchScene";
import { useWatchStore, WatchLayer } from "@/state/useWatchStore";

type TelemetryDatum = {
  label: string;
  value: string;
  detail: string;
};

const telemetry: TelemetryDatum[] = [
  {
    label: "Beat Frequency",
    value: "28,800 vph",
    detail: "4 Hz Swiss lever escapement with 0.35 ms lift angle",
  },
  {
    label: "Power Reserve",
    value: "54 h",
    detail: "Twin mainspring barrels, optimized torque curve",
  },
  {
    label: "Gear Train Ratio",
    value: "1 : 1728",
    detail: "Barrel → center → third → fourth → escape wheel",
  },
  {
    label: "Regulation",
    value: "±2 s/day",
    detail: "Free-sprung balance with micro-adjusting inertia screws",
  },
];

const LayerCard = ({
  layerId,
}: {
  layerId: WatchLayer;
}) => {
  const toggleLayer = useWatchStore((state) => state.toggleLayer);
  const showOnlyLayer = useWatchStore((state) => state.showOnlyLayer);
  const setHighlightedLayer = useWatchStore((state) => state.setHighlightedLayer);
  const highlightedLayer = useWatchStore((state) => state.highlightedLayer);
  const hidden = useWatchStore((state) => state.hiddenLayers[layerId]);
  const opacity = useWatchStore((state) => state.layerOpacity[layerId]);
  const setLayerOpacity = useWatchStore((state) => state.setLayerOpacity);
  const { title, description, color } = layerList.find(
    (l) => l.id === layerId
  )!;

  return (
    <article
      onMouseEnter={() => setHighlightedLayer(layerId)}
      onMouseLeave={() => {
        if (highlightedLayer === layerId) {
          setHighlightedLayer(null);
        }
      }}
      className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-lg transition duration-300 hover:border-slate-600/70 hover:bg-slate-900/90"
      style={{ boxShadow: hidden ? undefined : `0 0 40px ${color}12` }}
    >
      <span
        className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/40 to-transparent"
        aria-hidden
      />
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            {description}
          </p>
        </div>
        <span
          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            hidden
              ? "bg-slate-800 text-slate-400"
              : "bg-slate-200/10 text-slate-200"
          }`}
        >
          {hidden ? "Hidden" : "Visible"}
        </span>
      </header>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => toggleLayer(layerId)}
          className="rounded-full border border-slate-700/60 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/70"
        >
          {hidden ? "Reveal Layer" : "Hide Layer"}
        </button>
        <button
          type="button"
          onClick={() => showOnlyLayer(layerId)}
          className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-400/20"
        >
          Isolate
        </button>
      </div>
      <div className="mt-6">
        <label className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          <span>Transparency</span>
          <span>{Math.round(opacity * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.15}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(event) =>
            setLayerOpacity(layerId, Number(event.target.value))
          }
          className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
        />
      </div>
    </article>
  );
};

export default function Home() {
  const setCameraView = useWatchStore((state) => state.setCameraView);
  const cameraView = useWatchStore((state) => state.cameraView);
  const highlightedLayer = useWatchStore((state) => state.highlightedLayer);
  const setHighlightedLayer = useWatchStore((state) => state.setHighlightedLayer);
  const exploded = useWatchStore((state) => state.exploded);
  const setExploded = useWatchStore((state) => state.setExploded);
  const rotationSpeed = useWatchStore((state) => state.rotationSpeed);
  const setRotationSpeed = useWatchStore((state) => state.setRotationSpeed);
  const revealAll = useWatchStore((state) => state.revealAll);

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(14,116,144,0.18),_transparent_55%)]" />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-5 py-10 lg:flex-row lg:px-12 lg:py-12">
        <aside className="order-2 flex w-full flex-col gap-6 rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-2xl backdrop-blur lg:order-1 lg:max-w-md">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
              Precision Mechanique
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              Mechanical Chronometer Calibre
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Explore the layered architecture of a high-frequency watch
              movement. Toggle structural layers, inspect the gear train, and
              dial-in regulation from the control stack.
            </p>
          </header>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                System Views
              </h2>
              <button
                type="button"
                onClick={() => {
                  revealAll();
                  setHighlightedLayer(null);
                }}
                className="rounded-full border border-slate-700/60 bg-slate-800/70 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-200 transition hover:border-slate-500 hover:bg-slate-700/80"
              >
                Reset Layers
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {cameraViews.map((view) => (
                <button
                  type="button"
                  key={view.id}
                  onClick={() => setCameraView(view.id)}
                  className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold tracking-wide transition ${
                    cameraView === view.id
                      ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100 shadow-lg shadow-cyan-500/10"
                      : "border-slate-800/70 bg-slate-900/60 text-slate-300 hover:border-slate-700/70 hover:bg-slate-800/60"
                  }`}
                >
                  {view.title}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Layer Controls
            </h2>
            <div className="grid gap-3">
              {layerList.map((layer) => (
                <LayerCard key={layer.id} layerId={layer.id} />
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Rotation Speed
              </h3>
              <span className="text-sm font-semibold text-cyan-200">
                {rotationSpeed.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.01}
              value={rotationSpeed}
              onChange={(event) => setRotationSpeed(Number(event.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-400"
            />
            <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-slate-500">
              <span>Slow</span>
              <span>Chronometric</span>
              <span>Fast</span>
            </div>
          </section>

          <section className="grid gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Layer Lift
              </h3>
              <span className={`text-sm font-semibold ${exploded ? "text-cyan-200" : "text-slate-400"}`}>
                {exploded ? "Exploded" : "Stacked"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExploded(!exploded)}
              className={`relative flex h-12 items-center justify-center rounded-2xl border transition ${
                exploded
                  ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100 shadow-lg shadow-cyan-500/15"
                  : "border-slate-800/70 bg-slate-900/60 text-slate-200 hover:border-slate-700/70 hover:bg-slate-800/60"
              }`}
            >
              {exploded ? "Collapse Assembly" : "Explode Assembly"}
            </button>
            <p className="text-xs leading-relaxed text-slate-400">
              Activate exploded view to view the vertical separation of main
              plate, train bridges, escapement, and display mechanics.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Engineering Telemetry
            </h2>
            <ul className="mt-3 grid gap-3">
              {telemetry.map((item) => (
                <li
                  key={item.label}
                  className="rounded-xl border border-slate-800/70 bg-slate-900/50 p-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold text-slate-100">
                    {item.value}
                  </p>
                  <p className="text-xs text-slate-400">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <section className="order-1 relative flex flex-1 items-stretch overflow-hidden lg:order-2">
          <div className="pointer-events-none absolute inset-0 rounded-[36px] border border-cyan-300/5 opacity-60 blur-3xl" />
          <div className="relative h-[720px] w-full overflow-hidden rounded-[36px] border border-slate-800/70 bg-slate-950/40 shadow-[0_30px_120px_-30px_rgba(12,74,110,0.65)] backdrop-blur">
            <WatchScene />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950 via-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-transparent" />
            <div className="absolute right-8 top-8 inline-flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300">
              <span className="size-2 rounded-full bg-cyan-400" />
              {highlightedLayer
                ? `Inspecting ${layerList.find((l) => l.id === highlightedLayer)?.title ?? ""}`
                : "Free Navigation"}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
