import React from "react";
import { View, Dimensions } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PATH_WIDTH = Math.min(SCREEN_WIDTH - 40, 380);
const NODE_SIZE = 62;
const NODE_SPACING_Y = 110;

const SERPENTINE_OFFSETS = [0.5, 0.78, 0.55, 0.22, 0.15, 0.42, 0.72, 0.85, 0.5, 0.2];

export function getNodeX(index: number): number {
  const len = SERPENTINE_OFFSETS.length;
  const modIndex = ((index % len) + len) % len;
  const t = SERPENTINE_OFFSETS[modIndex];
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

export function Star({ x, y, size = 1, color = "#FFF", opacity = 0.8 }: { x: number; y: number; size?: number; color?: string; opacity?: number }) {
  const s = 4 * size;
  return (
    <View style={{ position: "absolute", left: x, top: y, width: s*2, height: s*2, alignItems: "center", justifyContent: "center", opacity }}>
       <View style={{ position: "absolute", width: s*0.4, height: s*2, backgroundColor: color, borderRadius: s*0.2 }} />
       <View style={{ position: "absolute", width: s*2, height: s*0.4, backgroundColor: color, borderRadius: s*0.2 }} />
       <View style={{ width: s, height: s, backgroundColor: color, borderRadius: s*0.5, transform: [{rotate: '45deg'}] }} />
    </View>
  );
}

export function Sparkle({ x, y, size = 1, color = "#FFF", opacity = 0.8 }: { x: number; y: number; size?: number; color?: string; opacity?: number }) {
  const s = 3 * size;
  return (
    <View style={{ position: "absolute", left: x, top: y, width: s, height: s, backgroundColor: color, borderRadius: s/2, opacity }} />
  );
}

// ── Cosmic Components (Night) ─────────────────────────────────
export function Planet({ x, y, size = 1, color = "#60A5FA", ringColor = "rgba(255,255,255,0.3)" }: { x: number; y: number; size?: number; color?: string; ringColor?: string }) {
  const r = 16 * size;
  return (
    <View style={{ position: "absolute", left: x, top: y, width: r*2, height: r*2, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: r*3, height: r*0.8, borderRadius: r*1.5, borderWidth: 2*size, borderColor: ringColor, transform: [{rotate: '15deg'}] }} />
      <View style={{ width: r*2, height: r*2, borderRadius: r, backgroundColor: color }} />
      <View style={{ position: "absolute", width: r*3.2, height: r*1, borderRadius: r*1.6, borderWidth: 2.5*size, borderColor: ringColor, transform: [{rotate: '-20deg'}], opacity: 0.8 }} />
    </View>
  );
}

export function MoonBody({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  const r = 12 * size;
  return (
    <View style={{ position: "absolute", left: x, top: y, width: r*2, height: r*2, borderRadius: r, backgroundColor: "#64748B" }}>
      <View style={{ position: "absolute", top: r*0.3, left: r*0.4, width: r*0.5, height: r*0.5, borderRadius: r*0.25, backgroundColor: "rgba(0,0,0,0.2)" }} />
      <View style={{ position: "absolute", top: r*1.1, left: r*1.2, width: r*0.6, height: r*0.6, borderRadius: r*0.3, backgroundColor: "rgba(0,0,0,0.25)" }} />
      <View style={{ position: "absolute", top: r*1.3, left: r*0.3, width: r*0.4, height: r*0.4, borderRadius: r*0.2, backgroundColor: "rgba(0,0,0,0.2)" }} />
    </View>
  );
}

export function Galaxy({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  const s = 30 * size;
  return (
    <View style={{ position: "absolute", left: x, top: y, width: s, height: s, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: s, height: s*0.3, borderRadius: s*0.5, backgroundColor: "rgba(139, 92, 246, 0.4)", transform: [{rotate: '30deg'}], position: 'absolute' }} />
      <View style={{ width: s*0.8, height: s*0.2, borderRadius: s*0.4, backgroundColor: "rgba(236, 72, 153, 0.5)", transform: [{rotate: '-15deg'}], position: 'absolute' }} />
      <View style={{ width: s*0.2, height: s*0.2, borderRadius: s*0.1, backgroundColor: "#FFF", shadowColor: "#FFF", shadowOpacity: 1, shadowRadius: 10, elevation: 5 }} />
    </View>
  );
}

export function HeavenlyCloud({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  const s = 60 * size;
  return (
    <View style={{ position: "absolute", left: x, top: y, alignItems: "center" }}>
      {/* Soft blue-grey shadow so the white cloud pops on the light background */}
      <FontAwesome5 name="cloud" solid size={s} color="#FFF" style={{ textShadowColor: "#94A3B8", textShadowRadius: 10, textShadowOffset: { width: 0, height: 4 } }} />
      <FontAwesome5 name="cloud" solid size={s*0.7} color="#F8FAFC" style={{ position: "absolute", top: s*0.2, right: -s*0.2 }} />
    </View>
  );
}

// ── Render tight clusters (patches of nature) ────────────────
export function renderCluster(cx: number, cy: number, seed: number, keyPrefix: string, skin: string = "default"): React.ReactNode[] {
  const rng = (s: number) => {
    const x = Math.sin(s * 9.8 + 7.3) * 10000;
    return x - Math.floor(x);
  };

  const elements: React.ReactNode[] = [];
  const typeRng = rng(seed);

  // ── Cosmic Clusters (Night) ──
  if (skin === "obsidian") {
    if (typeRng < 0.3) {
      elements.push(<Planet key={`${keyPrefix}-planet-${seed}`} x={cx - 30} y={cy - 20} size={1.2 + rng(seed)*0.5} color={rng(seed+1) > 0.5 ? "#60A5FA" : "#A78BFA"} ringColor="rgba(255,255,255,0.2)" />);
    } else if (typeRng < 0.55) {
      elements.push(<MoonBody key={`${keyPrefix}-moon-${seed}`} x={cx - 10} y={cy} size={1 + rng(seed)*0.3} />);
    } else if (typeRng < 0.8) {
      elements.push(<Galaxy key={`${keyPrefix}-galaxy-${seed}`} x={cx - 20} y={cy - 10} size={1 + rng(seed)*0.4} />);
    } else {
      elements.push(<Planet key={`${keyPrefix}-planet2-${seed}`} x={cx - 20} y={cy} size={0.8 + rng(seed)*0.4} color="#F472B6" ringColor="rgba(255,255,255,0.3)" />);
    }
    return elements;
  }

  // ── Default Nature Clusters ──
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
export function generateDecorations(
  nodeYCoordinates: number[], 
  startGlobalIndex: number, 
  skin: string = "default",
  isPrevCollapsed: boolean = true
): React.ReactNode[] {
  const decorations: React.ReactNode[] = [];
  const rng = (seed: number) => {
    const x = Math.sin(seed * 9.8 + 7.3) * 10000;
    return x - Math.floor(x);
  };

  const sideMargin = Math.max(0, (SCREEN_WIDTH - PATH_WIDTH) / 2);

  // 0. The River of Life (Gold only) replacing the dirt path!
  if (skin === "gold" && nodeYCoordinates.length > 0) {
    // Hide the top radius of the river under the first stone by starting slightly lower
    const minY = (startGlobalIndex === 0 || isPrevCollapsed) ? nodeYCoordinates[0] + 45 : nodeYCoordinates[0] - 60;
    const maxY = nodeYCoordinates[nodeYCoordinates.length - 1] + 120;
    
    // 1D Catmull-Rom Spline for perfectly smooth continuous curves through the nodes
    const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number) => {
      const t2 = t * t;
      const t3 = t2 * t;
      return 0.5 * (
          (2 * p1) +
          (-p0 + p2) * t +
          (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
          (-p0 + 3 * p1 - 3 * p2 + p3) * t3
      );
    };

    const getSplineX = (y: number) => {
      if (nodeYCoordinates.length === 0) return 0;
      if (nodeYCoordinates.length < 2) return getNodeX(startGlobalIndex) + 31;
      
      const cy = (idx: number) => (nodeYCoordinates[idx] || 0) + 31;
      
      if (y <= cy(0)) {
         return getNodeX(startGlobalIndex) + 31;
      } 
      
      let i = 0;
      let t = 0;
      let found = false;
      for (let j = 0; j < nodeYCoordinates.length - 1; j++) {
         if (y >= cy(j) && y <= cy(j+1)) {
            i = j;
            const denom = cy(j+1) - cy(j);
            t = denom === 0 ? 0 : (y - cy(j)) / denom;
            t = Math.max(0, Math.min(1, t));
            found = true;
            break;
         }
      }
      
      if (!found && y >= cy(nodeYCoordinates.length - 1)) {
         return getNodeX(startGlobalIndex + nodeYCoordinates.length - 1) + 31;
      }
      
      const x0 = getNodeX(startGlobalIndex + i - 1); 
      const x1 = getNodeX(startGlobalIndex + i);
      const x2 = getNodeX(startGlobalIndex + i + 1);
      const x3 = getNodeX(startGlobalIndex + i + 2);
      
      let val = catmullRom(x0, x1, x2, x3, t) + 31;
      if (isNaN(val) || !isFinite(val)) {
         val = getNodeX(startGlobalIndex + i) + 31;
      }
      return val;
    };

    // The user requested heavy layering of translucent shapes to blend the blue together!
    // Using a tight step completely eliminates the "stacked coin" gaps.
    const step = 4; 
    
    // We define different widths and shades of blue with translucency.
    // The heavy overlapping of these layers creates a soft feathered edge and a solid center.
    const layers = [
      { w: 90, color: "rgba(147, 197, 253, 0.2)", offFreq: 3, offAmp: 5 },  // Blue 300
      { w: 70, color: "rgba(96, 165, 250, 0.15)", offFreq: 5, offAmp: 10 }, // Blue 400
      { w: 50, color: "rgba(59, 130, 246, 0.1)", offFreq: 7, offAmp: 15 },  // Blue 500
      { w: 30, color: "rgba(37, 99, 235, 0.1)", offFreq: 9, offAmp: 10 },   // Blue 600
    ];

    for (let lIdx = 0; lIdx < layers.length; lIdx++) {
      const layer = layers[lIdx];
      for (let y = minY; y <= maxY; y += step) {
        const baseX = getSplineX(y);
        
        // Use a global Y to ensure waves are perfectly continuous across UI sections
        const globalY = startGlobalIndex * 110 + y;
        
        // Smoothly fade in the wave amplitude at the very start of an isolated section so it is perfectly 
        // centered beneath the first stone and doesn't peek out the sides.
        let env = 1;
        // Suppress wave offset ONLY right under the first stone to prevent side-bulging.
        // It ramps up quickly so the river flows naturally to the second stone.
        if (y < nodeYCoordinates[0] + 100) {
           env = Math.max(0, (y - (nodeYCoordinates[0] + 45)) / 55);
        }
        
        const waveOffset = Math.sin(globalY / 40 * layer.offFreq) * layer.offAmp * env;
        let px = baseX + waveOffset;
        if (isNaN(px) || !isFinite(px)) px = 190; // Ultimate fallback to center
        
        decorations.push(
          <View key={`river-${startGlobalIndex}-${y}-${lIdx}`} style={{ position: "absolute", left: px - layer.w / 2, top: y - layer.w / 2, width: layer.w, height: layer.w, borderRadius: layer.w / 2, backgroundColor: layer.color }} />
        );
      }
    }
  }

  for (let i = 0; i < nodeYCoordinates.length; i++) {
    const gi = startGlobalIndex + i;
    const nodeX = getNodeX(gi);
    const nodeY = nodeYCoordinates[i];
    const seed = gi * 137 + 42;

    const isNodeLeft = nodeX < PATH_WIDTH * 0.5;

    // 1. Spaced-out path clusters: only generate a scenic cluster every 4th node (80% as frequent as previous 1/3)
    if (gi % 4 === 0) {
      // Pushed to the extreme left or right borders of the canvas container to clear the path completely
      const clusterX = isNodeLeft ? PATH_WIDTH - 25 : -15;
      const clusterY = nodeY + 35;
      decorations.push(...renderCluster(clusterX, clusterY, seed + 100, `path-${gi}`, skin));
    }

    // 2. Wide screen (PC) support: Populate side margins sparingly (every 5th node, 80% as frequent as previous 1/4)
    if (sideMargin > 40 && gi % 5 === 0) {
      // Left margin scenic cluster
      const leftMaxOffset = sideMargin - 70;
      const leftCx = -40 - (leftMaxOffset > 0 ? rng(seed + 200) * leftMaxOffset : 0);
      const leftCy = nodeY + rng(seed + 201) * 60;
      decorations.push(...renderCluster(leftCx, leftCy, seed + 300, `margin-l-${gi}`, skin));

      // Right margin scenic cluster
      const rightMaxOffset = sideMargin - 70;
      const rightCx = PATH_WIDTH + 40 + (rightMaxOffset > 0 ? rng(seed + 202) * rightMaxOffset : 0);
      const rightCy = nodeY + 20 + rng(seed + 203) * 50;
      decorations.push(...renderCluster(rightCx, rightCy, seed + 400, `margin-r-${gi}`, skin));
    }
    
    // 3. Stars for Night and Gold
    if (skin === "obsidian" || skin === "gold") {
      const isGold = skin === "gold";
      const starColor = isGold ? "#FFD700" : "#FFFFFF";
      
      const starCount = isGold ? 12 : 5; // Much denser stars for gold to feel premium
      
      for (let s = 0; s < starCount; s++) {
        // Spread the stars across the ENTIRE screen width, not just the path!
        const sx = -sideMargin + rng(seed + 500 + s) * SCREEN_WIDTH;
        const sy = nodeY - 30 + rng(seed + 600 + s) * NODE_SPACING_Y;
        const size = 0.5 + rng(seed + 700 + s) * 0.8;
        const opacity = 0.3 + rng(seed + 800 + s) * 0.5;
        
        if (isGold) {
          const typeRng = rng(seed + 900 + s);
          if (typeRng > 0.7) {
            decorations.push(<Sparkle key={`sparkle-${gi}-${s}`} x={sx} y={sy} size={size * 2} color="#FFF9C4" opacity={opacity + 0.2} />);
          } else if (typeRng > 0.4) {
            decorations.push(<Star key={`star-${gi}-${s}`} x={sx} y={sy} size={size * 1.5} color={starColor} opacity={opacity} />);
          } else {
            decorations.push(<Sparkle key={`minisparkle-${gi}-${s}`} x={sx} y={sy} size={size} color="#FFD700" opacity={opacity} />);
          }
        } else {
          decorations.push(<Star key={`star-${gi}-${s}`} x={sx} y={sy} size={size} color={starColor} opacity={opacity} />);
        }
      }

      // 4. Add heavenly clouds scattered around for Gold theme
      if (isGold && rng(seed + 1000) > 0.6) {
         const isLeft = rng(seed + 1004) > 0.5;
         const marginSpace = Math.max(10, sideMargin);
         const cloudX = isLeft 
             ? -sideMargin + rng(seed + 1001) * marginSpace
             : PATH_WIDTH + rng(seed + 1001) * marginSpace;
             
         const cloudY = nodeY - 40 + rng(seed + 1002) * NODE_SPACING_Y;
         decorations.push(<HeavenlyCloud key={`cloud-${gi}`} x={cloudX} y={cloudY} size={1 + rng(seed+1003)} />);
      }
    }
  }

  return decorations;
}
