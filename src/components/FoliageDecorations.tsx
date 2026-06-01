import React from "react";
import { View, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PATH_WIDTH = Math.min(SCREEN_WIDTH - 40, 380);
const NODE_SIZE = 62;
const NODE_SPACING_Y = 110;

const SERPENTINE_OFFSETS = [0.5, 0.78, 0.55, 0.22, 0.15, 0.42, 0.72, 0.85, 0.5, 0.2];

export function getNodeX(index: number): number {
  const t = SERPENTINE_OFFSETS[index % SERPENTINE_OFFSETS.length];
  return t * (PATH_WIDTH - NODE_SIZE);
}

// ── Decorative Landmark Components ──────────────────────────

export function Flower({ x, y, color = "#FF6B9D", size = 1 }: { x: number; y: number; color?: string; size?: number }) {
  const s = 14 * size;
  return (
    <View style={{ position: "absolute", left: x, top: y, width: s * 2.5, height: s * 2.5, alignItems: "center", justifyContent: "center" }}>
      {/* Petals */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            width: s * 0.7,
            height: s * 0.7,
            borderRadius: s * 0.35,
            backgroundColor: color,
            opacity: 1.0,
            transform: [
              { translateX: Math.cos((angle * Math.PI) / 180) * s * 0.5 },
              { translateY: Math.sin((angle * Math.PI) / 180) * s * 0.5 },
            ],
          }}
        />
      ))}
      {/* Center */}
      <View style={{ width: s * 0.5, height: s * 0.5, borderRadius: s * 0.25, backgroundColor: "#FFD93D" }} />
    </View>
  );
}

export function GrassTuft({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const blades = [
    { rotate: "-15deg", height: 18 * scale },
    { rotate: "0deg", height: 22 * scale },
    { rotate: "12deg", height: 16 * scale },
    { rotate: "25deg", height: 14 * scale },
    { rotate: "-25deg", height: 12 * scale },
  ];
  return (
    <View style={{ position: "absolute", left: x, top: y, flexDirection: "row", alignItems: "flex-end" }}>
      {blades.map((b, i) => (
        <View
          key={i}
          style={{
            width: 3 * scale,
            height: b.height,
            backgroundColor: i % 2 === 0 ? "#4CAF50" : "#66BB6A",
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
            marginHorizontal: 1,
            transform: [{ rotate: b.rotate }],
          }}
        />
      ))}
    </View>
  );
}

export function Rock({ x, y, size = 1, dark = false }: { x: number; y: number; size?: number; dark?: boolean }) {
  const w = 28 * size;
  const h = 18 * size;
  return (
    <View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: w * 0.4,
        backgroundColor: dark ? "#78909C" : "#B0BEC5",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      {/* Highlight */}
      <View
        style={{
          position: "absolute",
          top: 3 * size,
          left: 5 * size,
          width: 8 * size,
          height: 4 * size,
          borderRadius: 4,
          backgroundColor: "rgba(255,255,255,0.35)",
        }}
      />
    </View>
  );
}

export function TreeSVG({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  const trunkW = 8 * size;
  const trunkH = 20 * size;
  const canopyW = 36 * size;
  const canopyH = 30 * size;
  return (
    <View style={{ position: "absolute", left: x, top: y, alignItems: "center", width: canopyW }}>
      {/* Canopy layers */}
      <View style={{ width: canopyW * 0.7, height: canopyH * 0.6, borderRadius: canopyW * 0.35, backgroundColor: "#388E3C", marginBottom: -8 * size }} />
      <View style={{ width: canopyW, height: canopyH * 0.8, borderRadius: canopyW * 0.5, backgroundColor: "#43A047", marginBottom: -4 * size }} />
      <View style={{ width: canopyW * 0.85, height: canopyH * 0.65, borderRadius: canopyW * 0.43, backgroundColor: "#4CAF50" }} />
      {/* Trunk */}
      <View style={{ width: trunkW, height: trunkH, backgroundColor: "#795548", borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
    </View>
  );
}

export function Mushroom({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <View style={{ position: "absolute", left: x, top: y, alignItems: "center" }}>
      {/* Cap */}
      <View style={{
        width: 20 * size, height: 12 * size,
        borderTopLeftRadius: 10 * size, borderTopRightRadius: 10 * size,
        backgroundColor: "#E53935",
      }}>
        {/* White dots */}
        <View style={{ position: "absolute", top: 3 * size, left: 4 * size, width: 4 * size, height: 4 * size, borderRadius: 2 * size, backgroundColor: "#FFF" }} />
        <View style={{ position: "absolute", top: 2 * size, left: 12 * size, width: 3 * size, height: 3 * size, borderRadius: 1.5 * size, backgroundColor: "#FFF" }} />
      </View>
      {/* Stem */}
      <View style={{ width: 6 * size, height: 8 * size, backgroundColor: "#FFECB3", borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
    </View>
  );
}

// ── Render tight clusters (patches of nature) ────────────────
export function renderCluster(cx: number, cy: number, seed: number, keyPrefix: string): React.ReactNode[] {
  const rng = (s: number) => {
    const x = Math.sin(s * 9.8 + 7.3) * 10000;
    return x - Math.floor(x);
  };

  const elements: React.ReactNode[] = [];
  const typeRng = rng(seed);

  if (typeRng < 0.3) {
    // 🌳 Forest Shrub Cluster (Focused purely on tree + grass)
    const treeSize = 1.6 + rng(seed + 1) * 0.25;
    elements.push(<TreeSVG key={`${keyPrefix}-tree-${seed}`} x={cx - 30} y={cy - 40} size={treeSize} />);

    // Ground level flanking grass (scales dynamically to remain perfectly locked near the tree stump base)
    const leftStumpY = cy - 30 + (52 * treeSize);
    const rightStumpY = cy - 30 + (50 * treeSize);
    elements.push(<GrassTuft key={`${keyPrefix}-grass-l-${seed}`} x={cx - 25} y={leftStumpY} scale={1.1} />);
    elements.push(<GrassTuft key={`${keyPrefix}-grass-r-${seed}`} x={cx + 10} y={rightStumpY} scale={1.3} />);
  } else if (typeRng < 0.55) {
    elements.push(<GrassTuft key={`${keyPrefix}-grass-edge-r-${seed}`} x={cx + 30} y={cy + 5} scale={1.4} />);

    // 🪨 Rock Garden Cluster (Rocks stacked closer together, framed snugly by grass)
    elements.push(<Rock key={`${keyPrefix}-rock1-${seed}`} x={cx - 24} y={cy + 5} size={1.6} dark={rng(seed + 2) > 0.5} />);
    elements.push(<Rock key={`${keyPrefix}-rock2-${seed}`} x={cx + 8} y={cy + 18} size={1.1} dark={rng(seed + 5) > 0.5} />);
    // Grass surrounding the stacked rock cluster snugly
    elements.push(<GrassTuft key={`${keyPrefix}-grass-edge-l-${seed}`} x={cx - 40} y={cy + 7} scale={1.5} />);
  } else if (typeRng < 0.8) {
    // 🌸 Meadow Flower Patch (Flowers and grass grouped snugly)
    const flowerColors = ["#FF6B9D", "#E040FB", "#FF7043", "#e7b719ff", "#AB47BC"];
    const fc1 = flowerColors[Math.floor(rng(seed + 1) * flowerColors.length)];
    const fc2 = flowerColors[Math.floor(rng(seed + 2) * flowerColors.length)];

    // 1. Render grass tufts FIRST (lower on screen) so they act as background layering
    elements.push(<GrassTuft key={`${keyPrefix}-grass-frame-l-${seed}`} x={cx - 0} y={cy + 17} scale={1.4} />);
    elements.push(<GrassTuft key={`${keyPrefix}-grass-frame-r-${seed}`} x={cx + 30} y={cy + 18} scale={1.4} />);

    // 2. Render flowers LATER so they layer IN FRONT of the grass tufts
    elements.push(<Flower key={`${keyPrefix}-flower1-${seed}`} x={cx - 6} y={cy} color={fc1} size={1.5} />);
    elements.push(<Flower key={`${keyPrefix}-flower2-${seed}`} x={cx + 14} y={cy + 4} color={fc2} size={1.3} />);
  } else {
    // 🌿 Lush Grass & Mushroom Patch (Snug flora bed)
    elements.push(<GrassTuft key={`${keyPrefix}-grass-lush-l-${seed}`} x={cx - 16} y={cy + 2} scale={1.8} />);
    // A single cozy mushroom nestled snug in the gap between grass patches
    elements.push(<Mushroom key={`${keyPrefix}-mush1-${seed}`} x={cx - 4} y={cy + 12} size={1.6} />);
    elements.push(<GrassTuft key={`${keyPrefix}-grass-lush-r-${seed}`} x={cx + 21} y={cy + 8} scale={1.5} />);

  }

  return elements;
}

// ── Generate decorations for a section ──────────────────────
export function generateDecorations(nodeCount: number, startGlobalIndex: number) {
  const decorations: React.ReactNode[] = [];
  const rng = (seed: number) => {
    const x = Math.sin(seed * 9.8 + 7.3) * 10000;
    return x - Math.floor(x);
  };

  const sideMargin = Math.max(0, (SCREEN_WIDTH - PATH_WIDTH) / 2);

  for (let i = 0; i < nodeCount; i++) {
    const gi = startGlobalIndex + i;
    const nodeX = getNodeX(gi);
    const nodeY = i * NODE_SPACING_Y;
    const seed = gi * 137 + 42;

    const isNodeLeft = nodeX < PATH_WIDTH * 0.5;

    // 1. Spaced-out path clusters: only generate a scenic cluster every 4th node (80% as frequent as previous 1/3)
    if (gi % 4 === 0) {
      // Pushed to the extreme left or right borders of the canvas container to clear the path completely
      const clusterX = isNodeLeft ? PATH_WIDTH - 25 : -15;
      const clusterY = nodeY + 35;
      decorations.push(...renderCluster(clusterX, clusterY, seed + 100, `path-${gi}`));
    }

    // 2. Wide screen (PC) support: Populate side margins sparingly (every 5th node, 80% as frequent as previous 1/4)
    if (sideMargin > 40 && gi % 5 === 0) {
      // Left margin scenic cluster
      const leftMaxOffset = sideMargin - 70;
      const leftCx = -40 - (leftMaxOffset > 0 ? rng(seed + 200) * leftMaxOffset : 0);
      const leftCy = nodeY + rng(seed + 201) * 60;
      decorations.push(...renderCluster(leftCx, leftCy, seed + 300, `margin-l-${gi}`));

      // Right margin scenic cluster
      const rightMaxOffset = sideMargin - 70;
      const rightCx = PATH_WIDTH + 40 + (rightMaxOffset > 0 ? rng(seed + 202) * rightMaxOffset : 0);
      const rightCy = nodeY + 20 + rng(seed + 203) * 50;
      decorations.push(...renderCluster(rightCx, rightCy, seed + 400, `margin-r-${gi}`));
    }
  }

  return decorations;
}
