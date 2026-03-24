"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { Color } from "three";

const sphereRadius = 0.5;

function isValidCssColor(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const color = new Color();
    color.setStyle(value);
    return true;
  } catch {
    return false;
  }
}

function parseColor(value) {
  if (!isValidCssColor(value)) return null;
  const color = new Color();
  color.setStyle(value);
  return color;
}

function toHexColor(value, fallback = "#ffffff") {
  const color = parseColor(value);
  return color ? `#${color.getHexString()}` : fallback;
}

function getHslFromColor(value) {
  const color = parseColor(value);
  if (!color) return { h: 0, s: 100, l: 50 };
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  const hue = Math.min(359, Math.max(0, Math.round(hsl.h * 360)));
  return {
    h: hue,
    s: Math.round(hsl.s * 100),
    l: Math.round(hsl.l * 100),
  };
}

function ColorControl({ label, value, onChange, disabled = false }) {
  const [hasError, setHasError] = useState(false);
  const [grayscaleHue, setGrayscaleHue] = useState(() => getHslFromColor(value).h);

  const colorPickerValue = useMemo(() => toHexColor(value), [value]);
  const parsedHsl = useMemo(() => getHslFromColor(value), [value]);
  const hsl = parsedHsl.s === 0 ? { ...parsedHsl, h: grayscaleHue } : parsedHsl;

  function applyTextColor(nextTextValue) {
    if (!isValidCssColor(nextTextValue)) {
      setHasError(true);
      return;
    }
    setHasError(false);
    onChange(nextTextValue.trim());
  }

  function updateHsl(nextHsl) {
    const nextColor = new Color().setHSL(
      nextHsl.h / 360,
      nextHsl.s / 100,
      nextHsl.l / 100
    );
    onChange(`#${nextColor.getHexString()}`);
    setHasError(false);
  }

  return (
    <div className={`rounded-md border border-purple-700/70 bg-purple-950/40 p-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <input
          type="color"
          value={colorPickerValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent disabled:cursor-not-allowed"
        />
      </div>

      <input
        key={`${label}-${value}`}
        type="text"
        defaultValue={value}
        disabled={disabled}
        onBlur={(event) => applyTextColor(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && applyTextColor(event.currentTarget.value)}
        placeholder="hex, rgb(), hsl(), color name"
        className="mt-2 w-full rounded bg-purple-950 px-2 py-1 text-xs text-purple-100 outline-none ring-1 ring-purple-700/70 focus:ring-violet-400 disabled:cursor-not-allowed"
      />
      {hasError ? (
        <p className="mt-1 text-[11px] text-amber-300">Invalid color format.</p>
      ) : null}

      <div className="mt-2 space-y-1 text-xs">
        <label className="block">
          <span>H: {hsl.h}</span>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={hsl.h}
            disabled={disabled}
            onChange={(event) => {
              const nextHue = Number(event.target.value);
              setGrayscaleHue(nextHue);
              const nextSaturation = hsl.s === 0 ? 70 : hsl.s;
              updateHsl({ ...hsl, h: nextHue, s: nextSaturation });
            }}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-fuchsia-400 disabled:cursor-not-allowed"
          />
        </label>
        <label className="block">
          <span>S: {hsl.s}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={hsl.s}
            disabled={disabled}
            onChange={(event) => updateHsl({ ...hsl, s: Number(event.target.value) })}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-emerald-400 disabled:cursor-not-allowed"
          />
        </label>
        <label className="block">
          <span>L: {hsl.l}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={hsl.l}
            disabled={disabled}
            onChange={(event) => updateHsl({ ...hsl, l: Number(event.target.value) })}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-amber-300 disabled:cursor-not-allowed"
          />
        </label>
      </div>
    </div>
  );
}

function createInitialSpheres() {
  const presetSphereColors = [
    "#f87171",
    "#fb923c",
    "#facc15",
    "#4ade80",
    "#38bdf8",
    "#a78bfa",
    "#9ca3af",
  ];

  return [
    { id: 1, color: presetSphereColors[0], shininess: 50, basePosition: [-3.6, 3.2, -2.2] },
    { id: 2, color: presetSphereColors[1], shininess: 50, basePosition: [-1.2, 3.5, -1.8] },
    { id: 3, color: presetSphereColors[2], shininess: 50, basePosition: [1.3, 3.7, -1.2] },
    { id: 4, color: presetSphereColors[3], shininess: 50, basePosition: [-2.8, 3.3, 1.1] },
    { id: 5, color: presetSphereColors[4], shininess: 50, basePosition: [0, 3.6, 1.5] },
    { id: 6, color: presetSphereColors[5], shininess: 50, basePosition: [2.5, 3.4, 2] },
    { id: 7, color: presetSphereColors[6], shininess: 50, basePosition: [4, 3.3, -0.4] },
  ];
}

function getSpreadPosition(basePosition, sphereSpacing) {
  return [basePosition[0] * sphereSpacing, basePosition[1], basePosition[2] * sphereSpacing];
}

function ExamplePresets({ onApplyExample }) {
  const exampleDescriptions = [
    "example 1: ambient and source use the same hue.",
    "example 2: ambient and source are complementary colors.",
    "example 3: ambient and source use a violet-green tertiary pairing.",
    "example 4: ambient and source use adjacent hues (red-violet).",
  ];

  return (
    <div className="absolute right-4 top-4 z-10 w-[26rem] rounded-xl border border-purple-300/20 bg-purple-950/85 p-3 shadow-lg shadow-purple-950/60 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wide text-purple-200/90">
        Example Presets
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((exampleNumber) => (
          <button
            key={exampleNumber}
            type="button"
            onClick={() => onApplyExample(exampleNumber)}
            className="rounded-lg border border-purple-500/40 bg-purple-900/50 px-3 py-2 text-xs font-medium text-purple-100 transition hover:bg-violet-500/70"
          >
            {`example ${exampleNumber}`}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-1 text-[11px] text-purple-200/85">
        {exampleDescriptions.map((description) => (
          <p key={description}>{description}</p>
        ))}
      </div>
    </div>
  );
}

function Scene({
  spheres,
  selectedSphereId,
  onSelectSphere,
  onDeselectSphere,
  ambientColor,
  sourceColor,
  sourceIntensity,
  sourcePosition,
  sourceDistance,
  sourceSize,
  sphereSpacing,
  isAoEnabled,
  isShininessEnabled,
  onContextLost,
}) {
  const sourceLightPosition = useMemo(
    () => [sourcePosition.x, sourcePosition.y, sourcePosition.z],
    [sourcePosition.x, sourcePosition.y, sourcePosition.z]
  );

  const normalizedSourceSize = Math.min(Math.max(sourceSize, 0.1), 24);

  return (
    <Canvas
      shadows={{ type: 1 }}
      dpr={1}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [5.5, 4.5, 6], fov: 50 }}
      className="h-full w-full"
      onPointerMissed={onDeselectSphere}
    >
      <WebGlContextGuard onContextLost={onContextLost} />
      <color attach="background" args={["#0f172a"]} />

      <ambientLight color={ambientColor} intensity={0.28} />
      <spotLight
        color={sourceColor}
        intensity={sourceIntensity}
        decay={2}
        distance={sourceDistance * 7}
        position={sourceLightPosition}
        angle={0.22 + normalizedSourceSize * 0.025}
        penumbra={Math.min(0.15 + normalizedSourceSize * 0.08, 1)}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.00025}
      />

      <gridHelper args={[30, 30, "#374151", "#1f2937"]} />

      <Physics gravity={[0, -9.81, 0]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[15, 0.25, 15]} position={[0, -0.25, 0]} />
          <mesh receiveShadow position={[0, -0.25, 0]}>
            <boxGeometry args={[30, 0.5, 30]} />
            <meshStandardMaterial color="#d1d5db" roughness={0.75} metalness={0.05} />
          </mesh>
        </RigidBody>

        {spheres.map((sphere) => {
          const isSelected = sphere.id === selectedSphereId;
          const resolvedBasePosition = sphere.basePosition ?? sphere.position ?? [0, 3, 0];
          const spreadPosition = getSpreadPosition(resolvedBasePosition, sphereSpacing);
          return (
            <RigidBody
              key={sphere.id}
              colliders="ball"
              position={spreadPosition}
              restitution={0.45}
              friction={0.8}
            >
              <mesh castShadow receiveShadow onClick={() => onSelectSphere(sphere.id)}>
                <sphereGeometry args={[sphereRadius, 32, 32]} />
                <meshPhongMaterial
                  color={sphere.color}
                  specular={isShininessEnabled ? "#ffffff" : "#000000"}
                  shininess={isShininessEnabled ? (sphere.shininess ?? 50) : 0}
                  emissive={isSelected ? sphere.color : "#000000"}
                  emissiveIntensity={isSelected ? 0.22 : 0}
                />
              </mesh>
            </RigidBody>
          );
        })}
      </Physics>
      {isAoEnabled ? (
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.55}
          scale={25}
          blur={2.6}
          far={12}
          resolution={512}
          color="#170f2c"
        />
      ) : null}

      <OrbitControls makeDefault minDistance={3} maxDistance={18} maxPolarAngle={1.48} />
    </Canvas>
  );
}

function WebGlContextGuard({ onContextLost }) {
  const { gl } = useThree();

  useEffect(() => {
    function handleContextLost(event) {
      event.preventDefault();
      onContextLost();
    }

    gl.domElement.addEventListener("webglcontextlost", handleContextLost, false);

    return () => {
      gl.domElement.removeEventListener("webglcontextlost", handleContextLost, false);
    };
  }, [gl, onContextLost]);

  return null;
}

function ControlMenu({
  ambientColor,
  sourceColor,
  sourceIntensity,
  sourcePosition,
  sourceDistance,
  sourceSize,
  sphereSpacing,
  selectedSphereId,
  selectedSphereColor,
  selectedSphereShininess,
  onAmbientColorChange,
  onSourceColorChange,
  onSourceIntensityChange,
  onSourcePositionChange,
  onSourceDistanceChange,
  onSourceSizeChange,
  onSphereSpacingChange,
  onSphereColorChange,
  onSphereShininessChange,
  onAddSphere,
  isAoEnabled,
  onAoEnabledChange,
  isShininessEnabled,
  onShininessEnabledChange,
  didDisableAoFromContextLoss,
}) {
  return (
    <div className="absolute left-4 top-4 z-10 max-h-[calc(100vh-2rem)] w-80 overflow-y-auto rounded-xl border border-purple-300/20 bg-purple-950/90 p-4 text-purple-100 shadow-lg shadow-purple-950/60 backdrop-blur">
      <h1 className="text-lg font-semibold">Lighting + Shadow Study</h1>
      <p className="mt-1 text-sm text-purple-200/80">
        Explore how sphere color and light shape affect shadows and transition zones.
      </p>

      <div className="mt-4 space-y-3">
        <ColorControl
          label="Ambient color"
          value={ambientColor}
          onChange={onAmbientColorChange}
        />
        <ColorControl
          label="Source color"
          value={sourceColor}
          onChange={onSourceColorChange}
        />
        <label className="block text-sm">
          <span>Source intensity: {sourceIntensity.toFixed(1)}</span>
          <input
            type="range"
            min={0}
            max={200}
            step={0.1}
            value={sourceIntensity}
            onChange={(event) => onSourceIntensityChange(Number(event.target.value))}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-violet-400"
          />
        </label>
        <label className="block text-sm">
          <span>Source X: {sourcePosition.x.toFixed(1)}</span>
          <input
            type="range"
            min={-20}
            max={20}
            step={0.1}
            value={sourcePosition.x}
            onChange={(event) => onSourcePositionChange("x", Number(event.target.value))}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-violet-400"
          />
        </label>
        <label className="block text-sm">
          <span>Source Y: {sourcePosition.y.toFixed(1)}</span>
          <input
            type="range"
            min={1}
            max={20}
            step={0.1}
            value={sourcePosition.y}
            onChange={(event) => onSourcePositionChange("y", Number(event.target.value))}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-violet-400"
          />
        </label>
        <label className="block text-sm">
          <span>Source Z: {sourcePosition.z.toFixed(1)}</span>
          <input
            type="range"
            min={-20}
            max={20}
            step={0.1}
            value={sourcePosition.z}
            onChange={(event) => onSourcePositionChange("z", Number(event.target.value))}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-violet-400"
          />
        </label>

        <label className="block text-sm">
          <span>Source distance: {sourceDistance.toFixed(1)}</span>
          <input
            type="range"
            min={2}
            max={12}
            step={0.1}
            value={sourceDistance}
            onChange={(event) => onSourceDistanceChange(Number(event.target.value))}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-violet-400"
          />
        </label>

        <label className="block text-sm">
          <span>Source size (softness): {sourceSize.toFixed(1)}</span>
          <input
            type="range"
            min={0.1}
            max={40}
            step={0.1}
            value={sourceSize}
            onChange={(event) => onSourceSizeChange(Number(event.target.value))}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-violet-400"
          />
        </label>
        <label className="block text-sm">
          <span>Sphere spacing: {sphereSpacing.toFixed(2)}x</span>
          <input
            type="range"
            min={0.6}
            max={2.8}
            step={0.1}
            value={sphereSpacing}
            onChange={(event) => onSphereSpacingChange(Number(event.target.value))}
            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-violet-400"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-md border border-purple-700/70 p-2 text-sm">
          <span>Ambient Occlusion</span>
          <input
            type="checkbox"
            checked={isAoEnabled}
            onChange={(event) => onAoEnabledChange(event.target.checked)}
            className="h-4 w-4 accent-violet-400"
          />
        </label>
        {didDisableAoFromContextLoss ? (
          <p className="text-xs text-amber-300">
            AO was turned off after WebGL context loss to keep rendering stable.
          </p>
        ) : null}
        <label className="flex items-center justify-between gap-3 rounded-md border border-purple-700/70 p-2 text-sm">
          <span>Shininess (global)</span>
          <input
            type="checkbox"
            checked={isShininessEnabled}
            onChange={(event) => onShininessEnabledChange(event.target.checked)}
            className="h-4 w-4 accent-violet-400"
          />
        </label>

        <div className="rounded-lg border border-purple-700/70 bg-purple-900/40 p-3 text-sm">
          <p className="font-medium">
            Selected sphere: {selectedSphereId ? `#${selectedSphereId}` : "None"}
          </p>
          <div className="mt-2">
            <ColorControl
              label="Local color"
              value={selectedSphereColor}
              disabled={!selectedSphereId}
              onChange={onSphereColorChange}
            />
            <label className="mt-3 block text-xs">
              <span>Shininess: {Math.round(selectedSphereShininess)}</span>
              <input
                type="range"
                min={0}
                max={120}
                step={1}
                value={selectedSphereShininess}
                disabled={!selectedSphereId || !isShininessEnabled}
                onChange={(event) => onSphereShininessChange(Number(event.target.value))}
                className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-800 accent-violet-400 disabled:cursor-not-allowed"
              />
            </label>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAddSphere}
        className="mt-4 w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
      >
        Add sphere (asks for color)
      </button>
    </div>
  );
}

function AddSphereModal({
  isOpen,
  draftColor,
  hasInvalidColorInput,
  onDraftColorChange,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) return null;

  const previewColor = isValidCssColor(draftColor) ? draftColor : "#ffffff";

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-purple-300/20 bg-purple-950/95 p-5 text-purple-100 shadow-xl shadow-purple-950/60">
        <h2 className="text-lg font-semibold">Create New Sphere</h2>
        <p className="mt-1 text-sm text-purple-200/80">
          Choose the local color for the new sphere.
        </p>

        <div className="mt-4 rounded-lg border border-purple-700/70 bg-purple-900/40 p-3">
          <label className="block text-sm">
            <span>Color picker</span>
            <input
              type="color"
              value={toHexColor(draftColor, "#facc15")}
              onChange={(event) => onDraftColorChange(event.target.value)}
              className="mt-2 h-10 w-16 cursor-pointer rounded border-0 bg-transparent"
            />
          </label>

          <label className="mt-3 block text-sm">
            <span>CSS color value</span>
            <input
              type="text"
              value={draftColor}
              onChange={(event) => onDraftColorChange(event.target.value)}
              placeholder="#facc15, rgb(...), hsl(...), etc."
              className="mt-2 w-full rounded bg-purple-950 px-3 py-2 text-sm text-purple-100 outline-none ring-1 ring-purple-700/70 focus:ring-violet-400"
            />
          </label>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span>Preview</span>
            <span
              className="h-7 w-7 rounded-full border border-white/20"
              style={{ backgroundColor: previewColor }}
            />
            <code className="text-xs text-purple-200">{draftColor}</code>
          </div>
          {hasInvalidColorInput ? (
            <p className="mt-2 text-xs text-amber-300">
              Invalid color format. Use valid CSS color like <code>#ff0000</code> or{" "}
              <code>hsl(210 100% 50%)</code>.
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-purple-500/40 bg-purple-900/40 px-3 py-2 text-sm font-medium text-purple-100 transition hover:bg-purple-800/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
          >
            Create sphere
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [ambientColor, setAmbientColor] = useState("#ffffff");
  const [sourceColor, setSourceColor] = useState("#fff8dd");
  const [sourceIntensity, setSourceIntensity] = useState(40);
  const [sourcePosition, setSourcePosition] = useState({ x: 6, y: 6.6, z: 4.2 });
  const [sourceDistance, setSourceDistance] = useState(6);
  const [sourceSize, setSourceSize] = useState(6);
  const [sphereSpacing, setSphereSpacing] = useState(1);
  const [spheres, setSpheres] = useState(createInitialSpheres);
  const [selectedSphereId, setSelectedSphereId] = useState(1);
  const [hasInvalidColorInput, setHasInvalidColorInput] = useState(false);
  const [isAddSphereModalOpen, setIsAddSphereModalOpen] = useState(false);
  const [draftSphereColor, setDraftSphereColor] = useState("#facc15");
  const [isAoEnabled, setIsAoEnabled] = useState(false);
  const [isShininessEnabled, setIsShininessEnabled] = useState(true);
  const [didDisableAoFromContextLoss, setDidDisableAoFromContextLoss] = useState(false);

  const selectedSphere = spheres.find((sphere) => sphere.id === selectedSphereId);

  function createSphereWithColor(validColor) {
    const nextId = spheres.length ? Math.max(...spheres.map((sphere) => sphere.id)) + 1 : 1;
    const spread = 1.25 + (nextId % 4) * 0.4;

    setSpheres((currentSpheres) => [
      ...currentSpheres,
      {
        id: nextId,
        color: validColor,
        shininess: 50,
        basePosition: [
          Math.sin(nextId) * spread,
          4 + (nextId % 3) * 0.4,
          Math.cos(nextId) * spread,
        ],
      },
    ]);
    setSelectedSphereId(nextId);
  }

  function handleAddSphere() {
    setDraftSphereColor("#facc15");
    setHasInvalidColorInput(false);
    setIsAddSphereModalOpen(true);
  }

  function handleConfirmAddSphere() {
    const trimmedColor = draftSphereColor.trim();
    if (!isValidCssColor(trimmedColor)) {
      setHasInvalidColorInput(true);
      return;
    }

    createSphereWithColor(trimmedColor);
    setHasInvalidColorInput(false);
    setIsAddSphereModalOpen(false);
  }

  function handleSelectedSphereColorChange(nextColor) {
    if (!selectedSphereId) return;
    setSpheres((currentSpheres) =>
      currentSpheres.map((sphere) =>
        sphere.id === selectedSphereId ? { ...sphere, color: nextColor } : sphere
      )
    );
  }

  function handleSelectedSphereShininessChange(nextShininess) {
    if (!selectedSphereId) return;
    setSpheres((currentSpheres) =>
      currentSpheres.map((sphere) =>
        sphere.id === selectedSphereId ? { ...sphere, shininess: nextShininess } : sphere
      )
    );
  }

  function applyExample(exampleNumber) {
    const lightExamples = {
      1: { ambientColor: "#d946ef", sourceColor: "#d946ef" },
      2: { ambientColor: "#f97316", sourceColor: "#2563eb" },
      3: { ambientColor: "#7c3aed", sourceColor: "#22c55e" },
      4: { ambientColor: "#ef4444", sourceColor: "#8b5cf6" },
    };

    const nextExample = lightExamples[exampleNumber];
    if (!nextExample) return;

    setAmbientColor(nextExample.ambientColor);
    setSourceColor(nextExample.sourceColor);
    setIsAoEnabled(false);
    setSpheres(createInitialSpheres());
    setSelectedSphereId(null);
  }

  function handleSourcePositionChange(axis, value) {
    setSourcePosition((currentPosition) => ({ ...currentPosition, [axis]: value }));
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#120f1e]">
      <ExamplePresets onApplyExample={applyExample} />
      <ControlMenu
        ambientColor={ambientColor}
        sourceColor={sourceColor}
        sourceIntensity={sourceIntensity}
        sourcePosition={sourcePosition}
        sourceDistance={sourceDistance}
        sourceSize={sourceSize}
        sphereSpacing={sphereSpacing}
        selectedSphereId={selectedSphereId}
        selectedSphereColor={selectedSphere?.color ?? "#ffffff"}
        selectedSphereShininess={selectedSphere?.shininess ?? 50}
        onAmbientColorChange={setAmbientColor}
        onSourceColorChange={setSourceColor}
        onSourceIntensityChange={setSourceIntensity}
        onSourcePositionChange={handleSourcePositionChange}
        onSourceDistanceChange={setSourceDistance}
        onSourceSizeChange={setSourceSize}
        onSphereSpacingChange={setSphereSpacing}
        onSphereColorChange={handleSelectedSphereColorChange}
        onSphereShininessChange={handleSelectedSphereShininessChange}
        onAddSphere={handleAddSphere}
        isAoEnabled={isAoEnabled}
        onAoEnabledChange={setIsAoEnabled}
        isShininessEnabled={isShininessEnabled}
        onShininessEnabledChange={setIsShininessEnabled}
        didDisableAoFromContextLoss={didDisableAoFromContextLoss}
      />

      <Suspense
        fallback={
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-purple-100/90">
            Loading scene...
          </div>
        }
      >
        <Scene
          spheres={spheres}
          selectedSphereId={selectedSphereId}
          onSelectSphere={setSelectedSphereId}
          onDeselectSphere={() => setSelectedSphereId(null)}
          ambientColor={ambientColor}
          sourceColor={sourceColor}
          sourceIntensity={sourceIntensity}
          sourcePosition={sourcePosition}
          sourceDistance={sourceDistance}
          sourceSize={sourceSize}
          sphereSpacing={sphereSpacing}
          isAoEnabled={isAoEnabled}
          isShininessEnabled={isShininessEnabled}
          onContextLost={() => {
            setIsAoEnabled(false);
            setDidDisableAoFromContextLoss(true);
          }}
        />
      </Suspense>
      <AddSphereModal
        isOpen={isAddSphereModalOpen}
        draftColor={draftSphereColor}
        hasInvalidColorInput={hasInvalidColorInput}
        onDraftColorChange={setDraftSphereColor}
        onCancel={() => {
          setIsAddSphereModalOpen(false);
          setHasInvalidColorInput(false);
        }}
        onConfirm={handleConfirmAddSphere}
      />
    </main>
  );
}
