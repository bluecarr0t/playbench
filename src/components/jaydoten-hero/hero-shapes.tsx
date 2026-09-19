"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { ShapeGraphic, generateSculpturePiece, pieceRivetShift, type Piece, type ShapeBite } from "./shape-graphics";

type MotionMode = "play" | "stop";

type ArmSide = "tip" | "opp";

type Arm = {
  id: string;
  y: number;
  yaw: number;
  lengthRem: number;
  oppositeLengthRem: number;
  tipBendDeg: number;
  oppBendDeg: number;
  speed: number;
  pieceId: string | null;
  oppositePieceId: string | null;
};

type DragSession = {
  pieceId: string;
  fromArmId: string | null;
  x: number;
  y: number;
  startX: number;
  startY: number;
};

const PIECES: Piece[] = [
  { id: "p-amoeba", kind: "amoeba", fill: "#E8782C", width: 15 },
  { id: "p-scoop", kind: "scoop", fill: "#8A62C4", width: 14 },
  { id: "p-chevron", kind: "chevron", fill: "#2F8F46", width: 13 },
  { id: "p-triangle", kind: "triangle", fill: "#D32F27", width: 8 },
  { id: "p-bar", kind: "bar", fill: "#D32F27", width: 12 },
  { id: "p-notch", kind: "notch", fill: "#2F8F46", width: 12 },
  { id: "p-wrap", kind: "wrap", fill: "#E8782C", width: 11 },
  { id: "p-disc", kind: "disc", fill: "#8A62C4", width: 10 },
  { id: "p-disc-2", kind: "disc", fill: "#2F8F46", width: 4.2 },
  { id: "p-diamond", kind: "diamond", fill: "#D32F27", width: 9 },
  { id: "p-petal", kind: "petal", fill: "#8A62C4", width: 12 },
  { id: "p-fan", kind: "fan", fill: "#E8782C", width: 11 },
  { id: "p-boomerang", kind: "boomerang", fill: "#2F8F46", width: 11 },
  { id: "p-arch", kind: "arch", fill: "#2F6BC4", width: 10 },
  {
    id: "p-kidney",
    kind: "custom",
    fill: "#E8782C",
    width: 9,
    path: "M22 86 18 52 52 20 102 16 148 40 172 78 150 114 96 124 48 108Z",
    viewBox: "0 0 190 140",
  },
  {
    id: "p-shard",
    kind: "custom",
    fill: "#8A62C4",
    width: 8,
    path: "M20 104 28 46 62 14 108 22 154 48 172 86 148 128 86 136 24 120Z",
    viewBox: "0 0 190 150",
  },
  { id: "p-petal-2", kind: "petal", fill: "#D32F27", width: 10 },
  {
    id: "p-comma",
    kind: "custom",
    fill: "#2F6BC4",
    width: 10,
    path: "M42 24 118 12 168 52 172 104 132 146 64 140 24 96 28 52Z M96 80A18 18 0 1 0 96 79.9Z",
    viewBox: "0 0 190 160",
    fillRule: "evenodd",
  },
];

const INITIAL_ARMS: Arm[] = [
  {
    id: "arm-1",
    y: 10,
    yaw: 0,
    lengthRem: 11.2,
    oppositeLengthRem: 4.2,
    tipBendDeg: 52,
    oppBendDeg: -36,
    speed: 0.38,
    pieceId: "p-wrap",
    oppositePieceId: "p-triangle",
  },
  {
    id: "arm-2",
    y: 29,
    yaw: 90,
    lengthRem: 5.4,
    oppositeLengthRem: 10.1,
    tipBendDeg: -48,
    oppBendDeg: 46,
    speed: 0.92,
    pieceId: "p-amoeba",
    oppositePieceId: "p-disc",
  },
  {
    id: "arm-3",
    y: 48,
    yaw: 180,
    lengthRem: 9.6,
    oppositeLengthRem: 3.1,
    tipBendDeg: 40,
    oppBendDeg: -58,
    speed: 1.55,
    pieceId: "p-chevron",
    oppositePieceId: "p-disc-2",
  },
  {
    id: "arm-4",
    y: 82,
    yaw: 270,
    lengthRem: 6.2,
    oppositeLengthRem: 8.8,
    tipBendDeg: 44,
    oppBendDeg: 56,
    speed: 2.25,
    pieceId: "p-diamond",
    oppositePieceId: "p-fan",
  },
];

type Crumb = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  fill: string;
  born: number;
};

const MAX_BITES = 8;
const MAX_GENERATED_SHAPES = 5;
const CRUMB_LIFE_MS = 520;
const CRUMBLE_ENABLED = false;
const DESKTOP_MIN_PX = 1024;
const PIECE_VW_FLOOR_PX = DESKTOP_MIN_PX / 100;
const BASKET_PIECE_SCALE = 0.78;

function pieceWidthCss(widthVw: number): string {
  return `max(${widthVw}vw, ${widthVw * PIECE_VW_FLOOR_PX}px)`;
}

function basketPieceName(piece: Piece): string {
  if (piece.id.startsWith("p-gen-")) {
    return "generated shape";
  }
  if (piece.kind === "custom") {
    return "shape";
  }
  return piece.kind;
}

let crumbSeq = 0;

const ARM_SPEED = Object.fromEntries(
  INITIAL_ARMS.map((arm) => [arm.id, arm.speed]),
) as Record<string, number>;

const pieceById = new Map(PIECES.map((piece) => [piece.id, piece]));

function registerPiece(piece: Piece) {
  pieceById.set(piece.id, piece);
}

function pieceOrThrow(id: string): Piece {
  const piece = pieceById.get(id);
  if (!piece) {
    throw new Error(`Unknown sculpture piece: ${id}`);
  }
  return piece;
}

function hitMountId(x: number, y: number): string | null {
  const stack = document.elementsFromPoint(x, y);
  for (const node of stack) {
    const host = node.closest<HTMLElement>("[data-mount-id]");
    if (host?.dataset.mountId) {
      return host.dataset.mountId;
    }
  }
  return null;
}

function sideMountId(armId: string, side: ArmSide): string {
  switch (side) {
    case "tip":
      return armId;
    case "opp":
      return `${armId}-opp`;
    default: {
      const _exhaustive: never = side;
      return _exhaustive;
    }
  }
}

function parseMount(mountId: string): { armId: string; side: ArmSide } {
  if (mountId.endsWith("-opp")) {
    return { armId: mountId.slice(0, -4), side: "opp" };
  }
  return { armId: mountId, side: "tip" };
}

function pieceOnSide(arm: Arm, side: ArmSide): string | null {
  switch (side) {
    case "tip":
      return arm.pieceId;
    case "opp":
      return arm.oppositePieceId;
    default: {
      const _exhaustive: never = side;
      return _exhaustive;
    }
  }
}

function withPieceOnSide(arm: Arm, side: ArmSide, pieceId: string | null): Arm {
  switch (side) {
    case "tip":
      return { ...arm, pieceId };
    case "opp":
      return { ...arm, oppositePieceId: pieceId };
    default: {
      const _exhaustive: never = side;
      return _exhaustive;
    }
  }
}

function withoutPiece(arm: Arm, pieceId: string): Arm {
  return {
    ...arm,
    pieceId: arm.pieceId === pieceId ? null : arm.pieceId,
    oppositePieceId: arm.oppositePieceId === pieceId ? null : arm.oppositePieceId,
  };
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function shortestYaw(a: number, b: number): number {
  const delta = Math.abs(((a - b) % 360) + 360) % 360;
  return Math.min(delta, 360 - delta);
}

function pairCanNest(a: Piece, b: Piece): boolean {
  const wrap = a.kind === "wrap" ? a : b.kind === "wrap" ? b : null;
  const disc = a.kind === "disc" ? a : b.kind === "disc" ? b : null;
  if (!wrap || !disc) {
    return false;
  }
  return disc.width <= 5;
}

function pieceRadiusPx(piece: Piece): number {
  return (piece.width / 200) * Math.max(window.innerWidth, DESKTOP_MIN_PX);
}

function armRowIndex(armId: string): number {
  return INITIAL_ARMS.findIndex((arm) => arm.id === armId);
}

function appendBite(
  current: Record<string, ShapeBite[]>,
  pieceId: string,
  bite: ShapeBite,
): Record<string, ShapeBite[]> {
  const next = { ...current };
  const list = [...(next[pieceId] ?? []), bite];
  next[pieceId] = list.length > MAX_BITES ? list.slice(list.length - MAX_BITES) : list;
  return next;
}

function intersectRects(
  a: DOMRect,
  b: DOMRect,
): { x: number; y: number; w: number; h: number } | null {
  const x = Math.max(a.left, b.left);
  const y = Math.max(a.top, b.top);
  const w = Math.min(a.right, b.right) - x;
  const h = Math.min(a.bottom, b.bottom) - y;
  if (w < 8 || h < 8) {
    return null;
  }
  return { x, y, w, h };
}

type Vec2 = { x: number; y: number };

type PieceQuad = {
  tl: Vec2;
  tr: Vec2;
  br: Vec2;
  bl: Vec2;
};

function cornerPoint(el: HTMLElement, name: string): Vec2 | null {
  const node = el.querySelector(`[data-piece-corner="${name}"]`);
  if (!(node instanceof HTMLElement)) {
    return null;
  }
  const rect = node.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function readPieceQuad(el: HTMLElement): PieceQuad | null {
  const tl = cornerPoint(el, "tl");
  const tr = cornerPoint(el, "tr");
  const br = cornerPoint(el, "br");
  const bl = cornerPoint(el, "bl");
  if (!tl || !tr || !br || !bl) {
    return null;
  }
  return { tl, tr, br, bl };
}

function sub2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function cross2(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function barycentric(
  point: Vec2,
  a: Vec2,
  b: Vec2,
  c: Vec2,
): { u: number; v: number; w: number } | null {
  const den = cross2(sub2(b, a), sub2(c, a));
  if (Math.abs(den) < 1e-6) {
    return null;
  }
  const v = cross2(sub2(point, a), sub2(c, a)) / den;
  const w = cross2(sub2(b, a), sub2(point, a)) / den;
  return { u: 1 - v - w, v, w };
}

function quadUv(quad: PieceQuad, point: Vec2): Vec2 | null {
  const top = barycentric(point, quad.tl, quad.tr, quad.bl);
  if (top && top.u >= -0.05 && top.v >= -0.05 && top.w >= -0.05) {
    return { x: top.v, y: top.w };
  }
  const bottom = barycentric(point, quad.tr, quad.br, quad.bl);
  if (bottom && bottom.u >= -0.05 && bottom.v >= -0.05 && bottom.w >= -0.05) {
    return { x: bottom.u + bottom.v, y: bottom.v + bottom.w };
  }
  return null;
}

function uvInFill(el: HTMLElement, uv: Vec2): boolean {
  if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) {
    return false;
  }
  const svg = el.querySelector("svg");
  if (!svg) {
    return false;
  }
  const shape = svg.querySelector("path, circle");
  if (!(shape instanceof SVGGeometryElement) || typeof shape.isPointInFill !== "function") {
    return true;
  }
  const viewBox = svg.viewBox.baseVal;
  const svgPoint = svg.createSVGPoint();
  svgPoint.x = uv.x * viewBox.width;
  svgPoint.y = uv.y * viewBox.height;
  return shape.isPointInFill(svgPoint);
}

function findFillOverlap(
  firstEl: HTMLElement,
  secondEl: HTMLElement,
  overlap: { x: number; y: number; w: number; h: number },
): { x: number; y: number; firstUv: Vec2; secondUv: Vec2 } | null {
  const firstQuad = readPieceQuad(firstEl);
  const secondQuad = readPieceQuad(secondEl);
  if (!firstQuad || !secondQuad) {
    return null;
  }

  const cols = 8;
  const rows = 8;
  let hits = 0;
  let sumX = 0;
  let sumY = 0;
  let sumU1 = 0;
  let sumV1 = 0;
  let sumU2 = 0;
  let sumV2 = 0;

  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const point = {
        x: overlap.x + ((col + 0.5) / cols) * overlap.w,
        y: overlap.y + ((row + 0.5) / rows) * overlap.h,
      };
      const firstUv = quadUv(firstQuad, point);
      const secondUv = quadUv(secondQuad, point);
      if (!firstUv || !secondUv) continue;
      if (!uvInFill(firstEl, firstUv) || !uvInFill(secondEl, secondUv)) continue;
      hits += 1;
      sumX += point.x;
      sumY += point.y;
      sumU1 += firstUv.x;
      sumV1 += firstUv.y;
      sumU2 += secondUv.x;
      sumV2 += secondUv.y;
    }
  }

  if (hits === 0) {
    return null;
  }
  return {
    x: sumX / hits,
    y: sumY / hits,
    firstUv: { x: sumU1 / hits, y: sumV1 / hits },
    secondUv: { x: sumU2 / hits, y: sumV2 / hits },
  };
}

function biteFromUv(uv: Vec2): ShapeBite | null {
  if (uv.x < 0.04 || uv.x > 0.96 || uv.y < 0.04 || uv.y > 0.96) {
    return null;
  }
  return { x: uv.x, y: uv.y, r: 0.07 };
}

function spawnCrumbs(
  x: number,
  y: number,
  fills: [string, string],
  now: number,
): Crumb[] {
  const crumbs: Crumb[] = [];
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.45;
    const speed = 90 + Math.random() * 170;
    crumbs.push({
      id: (crumbSeq += 1),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      size: 3 + Math.random() * 5,
      fill: fills[i % 2],
      born: now,
    });
  }
  return crumbs;
}

export function HeroShapes() {
  const armatureRef = useRef<HTMLDivElement>(null);
  const basketRef = useRef<HTMLDivElement>(null);
  const armAngleRef = useRef<Record<string, number>>(
    Object.fromEntries(INITIAL_ARMS.map((arm) => [arm.id, arm.yaw])),
  );
  const modeRef = useRef<MotionMode>("play");
  const dirRef = useRef(1);
  const draggingRef = useRef(false);
  const dragRef = useRef<DragSession | null>(null);
  const dragMovedRef = useRef(false);
  const overlapPairsRef = useRef(new Set<string>());
  const collisionsPrimedRef = useRef(false);
  const armsRef = useRef(INITIAL_ARMS);
  const bitesRef = useRef<Record<string, ShapeBite[]>>({});
  const crumbsRef = useRef<Crumb[]>([]);
  const extraPiecesRef = useRef<Piece[]>([]);

  const [mode, setMode] = useState<MotionMode>("play");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [arms, setArms] = useState(INITIAL_ARMS);
  const [hoverArmId, setHoverArmId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragSession | null>(null);
  const [bitesByPiece, setBitesByPiece] = useState<Record<string, ShapeBite[]>>(
    {},
  );
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [extraPieces, setExtraPieces] = useState<Piece[]>([]);

  useEffect(() => {
    armsRef.current = arms;
    const mounted = new Set<string>();
    for (const arm of arms) {
      if (arm.pieceId) mounted.add(arm.pieceId);
      if (arm.oppositePieceId) mounted.add(arm.oppositePieceId);
    }
    setBitesByPiece((current) => {
      let changed = false;
      const next = { ...current };
      for (const id of Object.keys(next)) {
        if (!mounted.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      if (!changed) return current;
      bitesRef.current = next;
      return next;
    });
  }, [arms]);

  const dockedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const arm of arms) {
      if (arm.pieceId && arm.pieceId !== drag?.pieceId) {
        ids.add(arm.pieceId);
      }
      if (arm.oppositePieceId && arm.oppositePieceId !== drag?.pieceId) {
        ids.add(arm.oppositePieceId);
      }
    }
    return ids;
  }, [arms, drag?.pieceId]);

  const basketPieces = useMemo(
    () =>
      [...PIECES, ...extraPieces].filter((piece) => !dockedIds.has(piece.id)),
    [dockedIds, extraPieces],
  );

  const applyArmSpins = useCallback(() => {
    const root = armatureRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-arm-spin]");
    for (const node of nodes) {
      const id = node.dataset.armSpin;
      if (!id) continue;
      const angle = armAngleRef.current[id];
      if (angle === undefined) continue;
      node.style.transform = `rotateY(${angle}deg)`;
    }
  }, []);

  const resolveCollisions = useCallback((canBite: boolean) => {
    if (!CRUMBLE_ENABLED) {
      return;
    }
    const root = armatureRef.current;
    if (!root) return;

    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const stageHeight = root.getBoundingClientRect().height;
    const occupied: {
      key: string;
      armId: string;
      y: number;
      lengthRem: number;
      yawAdd: number;
      piece: Piece;
    }[] = [];

    for (const arm of armsRef.current) {
      if (arm.pieceId) {
        const piece = pieceById.get(arm.pieceId);
        if (piece) {
          occupied.push({
            key: sideMountId(arm.id, "tip"),
            armId: arm.id,
            y: arm.y,
            lengthRem: arm.lengthRem,
            yawAdd: 0,
            piece,
          });
        }
      }
      if (arm.oppositePieceId) {
        const piece = pieceById.get(arm.oppositePieceId);
        if (piece) {
          occupied.push({
            key: sideMountId(arm.id, "opp"),
            armId: arm.id,
            y: arm.y,
            lengthRem: arm.oppositeLengthRem,
            yawAdd: 180,
            piece,
          });
        }
      }
    }

    const nowPairs = new Set<string>();
    const fresh: {
      first: (typeof occupied)[number];
      second: (typeof occupied)[number];
      key: string;
    }[] = [];

    for (let i = 0; i < occupied.length; i += 1) {
      const first = occupied[i];
      if (!first) continue;
      const firstY = (first.y / 100) * stageHeight;
      const firstRadius = pieceRadiusPx(first.piece);

      for (let j = i + 1; j < occupied.length; j += 1) {
        const second = occupied[j];
        if (!second) continue;
        if (pairCanNest(first.piece, second.piece)) continue;
        if (Math.abs(armRowIndex(first.armId) - armRowIndex(second.armId)) !== 1) {
          continue;
        }
        const secondY = (second.y / 100) * stageHeight;
        const secondRadius = pieceRadiusPx(second.piece);
        const verticalGap = Math.abs(firstY - secondY);
        if (verticalGap > firstRadius + secondRadius) continue;

        const firstAngle =
          (armAngleRef.current[first.armId] ?? 0) + first.yawAdd;
        const secondAngle =
          (armAngleRef.current[second.armId] ?? 0) + second.yawAdd;
        const reach =
          ((first.lengthRem + second.lengthRem) / 2) * rem +
          (firstRadius + secondRadius) * 0.25;
        const hitAngle = Math.min(
          28,
          Math.max(10, (Math.atan2(firstRadius + secondRadius, reach) * 180) / Math.PI),
        );
        if (shortestYaw(firstAngle, secondAngle) > hitAngle) continue;

        const key = pairKey(first.key, second.key);
        nowPairs.add(key);
        if (!overlapPairsRef.current.has(key)) {
          fresh.push({ first, second, key });
        }
      }
    }

    if (!collisionsPrimedRef.current) {
      collisionsPrimedRef.current = true;
      overlapPairsRef.current = nowPairs;
      return;
    }
    if (!canBite || fresh.length === 0) {
      overlapPairsRef.current = nowPairs;
      return;
    }

    let nextBites = bitesRef.current;
    const now = performance.now();
    const bornCrumbs: Crumb[] = [];
    const confirmed = new Set<string>();

    for (const { first, second, key } of fresh) {
      const firstEl = root.querySelector<HTMLElement>(
        `[data-piece-hit="${first.key}"]`,
      );
      const secondEl = root.querySelector<HTMLElement>(
        `[data-piece-hit="${second.key}"]`,
      );
      if (!firstEl || !secondEl) continue;

      const firstRect = firstEl.getBoundingClientRect();
      const secondRect = secondEl.getBoundingClientRect();
      const overlap = intersectRects(firstRect, secondRect);
      if (!overlap) continue;

      const contact = findFillOverlap(firstEl, secondEl, overlap);
      if (!contact) continue;

      const firstBite = biteFromUv(contact.firstUv);
      const secondBite = biteFromUv(contact.secondUv);
      if (!firstBite || !secondBite) continue;

      nextBites = appendBite(nextBites, first.piece.id, firstBite);
      nextBites = appendBite(nextBites, second.piece.id, secondBite);
      bornCrumbs.push(
        ...spawnCrumbs(contact.x, contact.y, [first.piece.fill, second.piece.fill], now),
      );
      confirmed.add(key);
    }

    const nextOverlap = new Set<string>();
    for (const key of nowPairs) {
      if (overlapPairsRef.current.has(key) || confirmed.has(key)) {
        nextOverlap.add(key);
      }
    }
    overlapPairsRef.current = nextOverlap;

    if (confirmed.size === 0) return;

    bitesRef.current = nextBites;
    setBitesByPiece(nextBites);
    if (bornCrumbs.length > 0) {
      crumbsRef.current = [...crumbsRef.current, ...bornCrumbs];
      setCrumbs(crumbsRef.current);
    }
  }, []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    dirRef.current = direction;
  }, [direction]);

  useLayoutEffect(() => {
    applyArmSpins();
  });

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!draggingRef.current) {
        const currentMode = modeRef.current;
        const dir = dirRef.current;
        let step = 0;

        switch (currentMode) {
          case "play":
            step = dir * 10 * dt;
            break;
          case "stop":
            step = 0;
            break;
          default: {
            const _exhaustive: never = currentMode;
            void _exhaustive;
            break;
          }
        }

        if (step !== 0) {
          for (const [id, speed] of Object.entries(ARM_SPEED)) {
            armAngleRef.current[id] = (armAngleRef.current[id] ?? 0) + step * speed;
          }
        }

        applyArmSpins();
        if (CRUMBLE_ENABLED) {
          try {
            resolveCollisions(step !== 0);
          } catch {
            // Keep the spin loop alive even if a bite lookup fails this frame.
          }
        }
      }

      if (crumbsRef.current.length > 0) {
        const nextCrumbs: Crumb[] = [];
        for (const crumb of crumbsRef.current) {
          if (now - crumb.born > CRUMB_LIFE_MS) continue;
          nextCrumbs.push({
            ...crumb,
            x: crumb.x + crumb.vx * dt,
            y: crumb.y + crumb.vy * dt,
            vy: crumb.vy + 1500 * dt,
          });
        }
        crumbsRef.current = nextCrumbs;
        setCrumbs(nextCrumbs);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [applyArmSpins, resolveCollisions]);

  const setPlay = () => {
    setMode("play");
  };

  const setStop = () => {
    setMode("stop");
  };

  const setReverse = () => {
    const nextDir = direction === 1 ? -1 : 1;
    setDirection(nextDir);
    if (mode === "stop") {
      setMode("play");
    }
  };

  const resetSculpture = () => {
    draggingRef.current = false;
    dragRef.current = null;
    dragMovedRef.current = false;
    setDrag(null);
    setHoverArmId(null);

    const nextArms = INITIAL_ARMS.map((arm) => ({ ...arm }));
    armsRef.current = nextArms;
    setArms(nextArms);

    bitesRef.current = {};
    setBitesByPiece({});
    crumbsRef.current = [];
    setCrumbs([]);

    armAngleRef.current = Object.fromEntries(
      INITIAL_ARMS.map((arm) => [arm.id, arm.yaw]),
    );
    applyArmSpins();

    overlapPairsRef.current = new Set();
    collisionsPrimedRef.current = false;

    dirRef.current = 1;
    setDirection(1);
    modeRef.current = "play";
    setMode("play");
  };

  const generateShape = () => {
    const piece = generateSculpturePiece();
    const current = extraPiecesRef.current;
    const oldest =
      current.length >= MAX_GENERATED_SHAPES ? current[0] : null;
    const nextExtras = oldest
      ? [...current.filter((entry) => entry.id !== oldest.id), piece]
      : [...current, piece];

    if (oldest) {
      pieceById.delete(oldest.id);
      setArms((arms) => {
        const nextArms = arms.map((arm) => withoutPiece(arm, oldest.id));
        armsRef.current = nextArms;
        return nextArms;
      });
      if (dragRef.current?.pieceId === oldest.id) {
        draggingRef.current = false;
        dragRef.current = null;
        setDrag(null);
      }
    }

    registerPiece(piece);
    extraPiecesRef.current = nextExtras;
    setExtraPieces(nextExtras);
    requestAnimationFrame(() => {
      const tray = basketRef.current;
      if (!tray) return;
      tray.scrollTo({ left: tray.scrollWidth, behavior: "smooth" });
    });
  };

  const startDrag = (
    event: { preventDefault: () => void; clientX: number; clientY: number },
    pieceId: string,
    fromArmId: string | null,
  ) => {
    event.preventDefault();
    draggingRef.current = true;
    const session: DragSession = {
      pieceId,
      fromArmId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
    };
    dragRef.current = session;
    dragMovedRef.current = false;
    setDrag(session);
    setHoverArmId(null);
  };

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent | MouseEvent) => {
      if (!dragRef.current) return;
      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      if (Math.hypot(dx, dy) > 6) {
        dragMovedRef.current = true;
      }
      const next: DragSession = {
        ...dragRef.current,
        x: event.clientX,
        y: event.clientY,
      };
      dragRef.current = next;
      setDrag(next);
      setHoverArmId(hitMountId(event.clientX, event.clientY));
    };

    const onUp = (event: globalThis.PointerEvent | MouseEvent) => {
      const session = dragRef.current;
      if (!session) return;

      const moved = dragMovedRef.current;
      draggingRef.current = false;
      dragRef.current = null;
      dragMovedRef.current = false;
      setHoverArmId(null);
      setDrag(null);
      if (!moved) return;

      const mountId = hitMountId(event.clientX, event.clientY);
      const basketBox = basketRef.current?.getBoundingClientRect();
      const overBasket = Boolean(
        basketBox &&
          event.clientX >= basketBox.left &&
          event.clientX <= basketBox.right &&
          event.clientY >= basketBox.top &&
          event.clientY <= basketBox.bottom,
      );

      setArms((current) => {
        if (mountId) {
          const target = parseMount(mountId);
          const targetArm = current.find((arm) => arm.id === target.armId);
          const displaced = targetArm
            ? pieceOnSide(targetArm, target.side)
            : null;
          const from = session.fromArmId ? parseMount(session.fromArmId) : null;

          return current.map((arm) => {
            let next = withoutPiece(arm, session.pieceId);
            if (displaced && displaced !== session.pieceId) {
              next = withoutPiece(next, displaced);
            }
            if (arm.id === target.armId) {
              next = withPieceOnSide(next, target.side, session.pieceId);
            }
            if (
              from &&
              displaced &&
              displaced !== session.pieceId &&
              arm.id === from.armId
            ) {
              next = withPieceOnSide(next, from.side, displaced);
            }
            return next;
          });
        }

        if (overBasket || session.fromArmId) {
          return current.map((arm) => withoutPiece(arm, session.pieceId));
        }

        return current;
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const draggingPiece = drag ? pieceOrThrow(drag.pieceId) : null;

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 flex items-end justify-center overflow-hidden pb-[11.5rem] pt-6 md:items-start md:pt-20 xl:items-end xl:justify-end xl:pr-[9%] xl:pt-8 xl:pb-56">
        <div className="relative h-[46vh] w-[min(42vh,300px)] origin-bottom scale-[0.58] [transform-style:preserve-3d] [perspective:1200px] [perspective-origin:50%_78%] md:h-[58vh] md:w-[min(52vh,460px)] md:origin-bottom md:scale-100 xl:h-[calc(100dvh-13.75rem)] xl:max-h-[32.5rem] xl:w-[min(40vh,380px)] xl:origin-bottom xl:scale-[0.88]">
          <div
            ref={armatureRef}
            className="absolute inset-0 origin-[50%_90%] [transform-style:preserve-3d]"
            style={{ transformOrigin: "50% 90%", transformStyle: "preserve-3d" }}
          >
            <SculptureRod />

            {arms.map((arm) => {
              return (
                <div
                  key={arm.id}
                  data-arm-spin={arm.id}
                  className="absolute left-1/2 w-0 [transform-style:preserve-3d]"
                  style={{
                    top: `${arm.y}%`,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <BentArmSide
                    lengthRem={arm.lengthRem}
                    bendDeg={arm.tipBendDeg}
                    mountId={sideMountId(arm.id, "tip")}
                    pieceId={arm.pieceId}
                    draggingPieceId={drag?.pieceId ?? null}
                    glowing={hoverArmId === sideMountId(arm.id, "tip")}
                    bites={arm.pieceId ? bitesByPiece[arm.pieceId] : undefined}
                    onStartDrag={startDrag}
                  />
                  <BentArmSide
                    lengthRem={-arm.oppositeLengthRem}
                    bendDeg={arm.oppBendDeg}
                    mountId={sideMountId(arm.id, "opp")}
                    pieceId={arm.oppositePieceId}
                    draggingPieceId={drag?.pieceId ?? null}
                    glowing={hoverArmId === sideMountId(arm.id, "opp")}
                    bites={
                      arm.oppositePieceId
                        ? bitesByPiece[arm.oppositePieceId]
                        : undefined
                    }
                    onStartDrag={startDrag}
                  />
                </div>
              );
            })}
          </div>

          <SculptureBase />
        </div>
      </div>

      <div className="absolute right-0 bottom-[6.75rem] left-0 z-30 flex justify-center bg-[#F8F5F0] py-1.5 xl:right-auto xl:bottom-48 xl:left-1/2 xl:w-auto xl:-translate-x-1/2 xl:bg-transparent xl:py-0">
        <div className="flex items-center gap-1 xl:gap-2">
        <ControlButton
          kind="play"
          active={mode === "play"}
          onClick={setPlay}
        />
        <ControlButton
          kind="stop"
          active={mode === "stop"}
          onClick={setStop}
        />
        <ControlButton
          kind="reverse"
          active={false}
          onClick={setReverse}
        />
        <button
          type="button"
          aria-label="Reset sculpture"
          onClick={resetSculpture}
          className="flex h-8 items-center rounded-md bg-[#F4EBD8] px-2.5 font-display text-[10px] tracking-[0.16em] text-[#D32F27] ring-1 ring-[#D32F27]/40 xl:h-11 xl:px-3 xl:text-xs"
        >
          Reset
        </button>
        </div>
      </div>

      <div
        className={`absolute right-0 bottom-0 left-0 z-30 flex h-[6.75rem] flex-col justify-center gap-1 border-t px-4 pt-2 pr-36 pb-[max(0.4rem,env(safe-area-inset-bottom))] xl:h-44 xl:gap-2 xl:px-8 xl:pt-4 xl:pr-48 xl:pb-3 xl:pl-16 ${
          hoverArmId ? "border-[#D32F27]/30" : "border-[#D32F27]/15"
        } bg-[#EBE0C4]`}
      >
        <div className="shrink-0">
          <p className="font-display text-xs tracking-[0.16em] whitespace-nowrap text-[#D32F27]/70 lg:text-sm">
            BASKET OF SHAPES
          </p>
          <p className="mt-0.5 max-w-[22rem] font-sans text-[0.65rem] leading-snug text-[#D32F27]/55 xl:mt-1 xl:max-w-none xl:text-xs">
            Drag a new shape onto an existing one to add or edit.
          </p>
        </div>
        <div
          ref={basketRef}
          className="flex min-h-0 flex-1 items-center gap-4 overflow-x-auto xl:gap-6"
        >
          {basketPieces
            .filter((piece) => piece.id !== drag?.pieceId)
            .map((piece) => (
            <button
              key={piece.id}
              type="button"
              aria-label={`Add ${basketPieceName(piece)} to an arm`}
              onPointerDown={(event) => startDrag(event, piece.id, null)}
              onMouseDown={(event) => startDrag(event, piece.id, null)}
              className="h-10 w-10 shrink-0 cursor-grab touch-none overflow-hidden border-0 bg-transparent p-0 outline-none active:cursor-grabbing xl:h-auto xl:w-[var(--piece-w)] xl:overflow-visible"
              style={{
                ["--piece-w" as string]: `${Math.max(piece.width * BASKET_PIECE_SCALE, 3.2)}rem`,
              }}
            >
              <ShapeGraphic
                kind={piece.kind}
                fill={piece.fill}
                path={piece.path}
                viewBox={piece.viewBox}
                fillRule={piece.fillRule}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={generateShape}
          className="absolute right-2 bottom-[max(0.35rem,env(safe-area-inset-bottom))] z-40 min-h-9 max-w-[7rem] rounded-md bg-[#F4EBD8] px-2.5 py-1.5 text-center font-display text-[10px] leading-tight tracking-[0.14em] text-[#D32F27] ring-1 ring-[#D32F27]/40 xl:right-6 xl:bottom-4 xl:min-h-11 xl:max-w-none xl:px-3 xl:py-2 xl:text-xs"
        >
          Generate Shape
        </button>
      </div>

      {draggingPiece && drag ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: drag.x,
            top: drag.y,
            width: pieceWidthCss(draggingPiece.width),
          }}
        >
          <ShapeGraphic
            kind={draggingPiece.kind}
            fill={draggingPiece.fill}
            path={draggingPiece.path}
            viewBox={draggingPiece.viewBox}
            fillRule={draggingPiece.fillRule}
          />
        </div>
      ) : null}

      {crumbs.map((crumb) => {
        const life = 1 - (performance.now() - crumb.born) / CRUMB_LIFE_MS;
        return (
          <span
            key={crumb.id}
            className="pointer-events-none fixed z-50 rounded-[1px]"
            style={{
              left: crumb.x,
              top: crumb.y,
              width: crumb.size,
              height: crumb.size,
              background: crumb.fill,
              opacity: Math.max(0, life),
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
}

function BentArmSide({
  lengthRem,
  bendDeg,
  mountId,
  pieceId,
  draggingPieceId,
  glowing,
  bites,
  onStartDrag,
}: {
  lengthRem: number;
  bendDeg: number;
  mountId: string;
  pieceId: string | null;
  draggingPieceId: string | null;
  glowing: boolean;
  bites?: ShapeBite[];
  onStartDrag: (
    event: { preventDefault: () => void; clientX: number; clientY: number },
    pieceId: string,
    fromArmId: string | null,
  ) => void;
}) {
  const dir = lengthRem >= 0 ? 1 : -1;
  const absLen = Math.abs(lengthRem);
  const inner = absLen * (absLen < 5 ? 0.22 : 0.34);
  const outer = absLen - inner;
  const rot = dir * -bendDeg;

  return (
    <div className="absolute top-0 left-0 [transform-style:preserve-3d]">
      <div
        className="absolute top-0 h-[4px] bg-[#9aa0a6]"
        style={{
          left: dir > 0 ? 0 : `-${inner}rem`,
          width: `${inner}rem`,
        }}
      />
      <div
        className="absolute top-0 [transform-style:preserve-3d]"
        style={{
          left: `${dir * inner}rem`,
          transform: rot === 0 ? undefined : `rotateZ(${rot}deg)`,
          transformOrigin: "0px 2px",
        }}
      >
        <div
          className="absolute top-0 h-[4px] bg-[#9aa0a6]"
          style={{
            left: dir > 0 ? 0 : `-${outer}rem`,
            width: `${outer}rem`,
          }}
        />
        <ArmTip
          mountId={mountId}
          lengthRem={dir * outer}
          pieceLevelDeg={-rot}
          pieceId={pieceId}
          draggingPieceId={draggingPieceId}
          glowing={glowing}
          bites={bites}
          onStartDrag={onStartDrag}
        />
      </div>
    </div>
  );
}

function ArmTip({
  mountId,
  lengthRem,
  pieceLevelDeg,
  pieceId,
  draggingPieceId,
  glowing,
  bites,
  onStartDrag,
}: {
  mountId: string;
  lengthRem: number;
  pieceLevelDeg: number;
  pieceId: string | null;
  draggingPieceId: string | null;
  glowing: boolean;
  bites?: ShapeBite[];
  onStartDrag: (
    event: { preventDefault: () => void; clientX: number; clientY: number },
    pieceId: string,
    fromArmId: string | null,
  ) => void;
}) {
  const piece =
    pieceId && pieceId !== draggingPieceId ? pieceOrThrow(pieceId) : null;
  const rivet = piece ? pieceRivetShift(piece.kind) : null;
  const draggingPiece = draggingPieceId
    ? pieceOrThrow(draggingPieceId)
    : null;
  const glowSpan = Math.max(piece?.width ?? 0, draggingPiece?.width ?? 0);
  const facesOutward = lengthRem < 0;
  const pieceTransform = [
    pieceLevelDeg !== 0 ? `rotateZ(${pieceLevelDeg}deg)` : "",
    facesOutward ? "scaleX(-1)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      data-mount-id={mountId}
      className="absolute flex size-12 items-center justify-center rounded-full"
      style={{
        left: `${lengthRem}rem`,
        top: "2px",
        transform: "translate(-50%, -50%)",
      }}
    >
      <span className="pointer-events-none relative z-30 size-2 rounded-full bg-[#c5c8cc] shadow-[0_0_0_1px_rgba(80,80,80,0.25)]" />
      {piece && rivet ? (
        <div
          className="absolute inset-0"
          style={{
            transform: pieceTransform || undefined,
            transformOrigin: "50% 50%",
          }}
        >
          <button
            type="button"
            aria-label={`Remove ${piece.kind} from arm`}
            onPointerDown={(event) => onStartDrag(event, piece.id, mountId)}
            onMouseDown={(event) => onStartDrag(event, piece.id, mountId)}
            className="absolute z-0 cursor-grab touch-none border-0 bg-transparent p-0 outline-none active:cursor-grabbing"
            data-piece-hit={mountId}
            style={{
              width: pieceWidthCss(piece.width),
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${rivet.x}%), calc(-50% + ${rivet.y}%))`,
            }}
          >
            <span
              data-piece-corner="tl"
              className="pointer-events-none absolute top-0 left-0 size-px"
              aria-hidden
            />
            <span
              data-piece-corner="tr"
              className="pointer-events-none absolute top-0 right-0 size-px"
              aria-hidden
            />
            <span
              data-piece-corner="br"
              className="pointer-events-none absolute right-0 bottom-0 size-px"
              aria-hidden
            />
            <span
              data-piece-corner="bl"
              className="pointer-events-none absolute bottom-0 left-0 size-px"
              aria-hidden
            />
            <ShapeGraphic
              kind={piece.kind}
              fill={piece.fill}
              bites={bites}
              path={piece.path}
              viewBox={piece.viewBox}
              fillRule={piece.fillRule}
            />
          </button>
        </div>
      ) : null}
      {glowing ? (
        <div
          className="pointer-events-none absolute z-40 rounded-full bg-[#D32F27]/15 ring-[3px] ring-[#D32F27]"
          style={{
            left: "50%",
            top: "50%",
            width: glowSpan > 0 ? `calc(${pieceWidthCss(glowSpan)} + 1.4rem)` : "3.5rem",
            height: glowSpan > 0 ? `calc(${pieceWidthCss(glowSpan)} + 1.4rem)` : "3.5rem",
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : null}
    </div>
  );
}

function SculptureRod() {
  const size = 0.72;
  const radius = size / 2;
  const sides = 8;
  const faceWidth = size * Math.tan(Math.PI / sides);
  const metals = [
    "#f4f5f7",
    "#d5d9de",
    "#b0b6bd",
    "#8a919a",
    "#6d747d",
    "#9097a0",
    "#c4c9cf",
    "#e8eaed",
  ];

  return (
    <div
      className="absolute top-0 left-1/2 z-10 h-[90%]"
      style={{
        width: `${size}rem`,
        marginLeft: `${-radius}rem`,
        transformStyle: "preserve-3d",
      }}
    >
      {metals.map((color, index) => (
        <div
          key={color}
          className="absolute top-0 bottom-0"
          style={{
            width: `${faceWidth}rem`,
            left: "50%",
            marginLeft: `${-faceWidth / 2}rem`,
            background: color,
            transform: `rotateY(${(360 / sides) * index}deg) translateZ(${radius}rem)`,
          }}
        />
      ))}
      <div
        className="absolute left-0 rounded-full"
        style={{
          width: `${size}rem`,
          height: `${size}rem`,
          top: 0,
          background:
            "radial-gradient(circle at 32% 30%, #ffffff 0%, #dfe3e8 42%, #8b929b 100%)",
          transform: `rotateX(90deg) translateZ(${radius}rem)`,
        }}
      />
      <div
        className="absolute left-0 rounded-full"
        style={{
          width: `${size}rem`,
          height: `${size}rem`,
          bottom: 0,
          background: "#6a717a",
          transform: `rotateX(90deg) translateZ(${-radius}rem)`,
        }}
      />
    </div>
  );
}

function SculptureBase() {
  const width = 6.8;
  const depth = 6.8;
  const height = 1.9;

  return (
    <div
      className="absolute bottom-[5%] left-1/2 z-20"
      style={{
        width: `${width}rem`,
        height: `${height}rem`,
        marginLeft: `${-width / 2}rem`,
        transformOrigin: "50% 100%",
        transform: "rotateX(-18deg) rotateY(-28deg)",
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="sculpture-base-wood sculpture-base-wood--front absolute inset-0"
        style={{
          backfaceVisibility: "hidden",
          transform: `translateZ(${depth / 2}rem)`,
        }}
      />
      <div
        className="sculpture-base-wood sculpture-base-wood--back absolute inset-0"
        style={{
          backfaceVisibility: "hidden",
          transform: `rotateY(180deg) translateZ(${depth / 2}rem)`,
        }}
      />
      <div
        className="sculpture-base-wood sculpture-base-wood--right absolute top-0"
        style={{
          width: `${depth}rem`,
          height: `${height}rem`,
          left: "50%",
          marginLeft: `${-depth / 2}rem`,
          backfaceVisibility: "hidden",
          transform: `rotateY(90deg) translateZ(${width / 2}rem)`,
        }}
      />
      <div
        className="sculpture-base-wood sculpture-base-wood--left absolute top-0"
        style={{
          width: `${depth}rem`,
          height: `${height}rem`,
          left: "50%",
          marginLeft: `${-depth / 2}rem`,
          backfaceVisibility: "hidden",
          transform: `rotateY(-90deg) translateZ(${width / 2}rem)`,
        }}
      />
      <div
        className="sculpture-base-wood sculpture-base-wood--top absolute left-0"
        style={{
          width: `${width}rem`,
          height: `${depth}rem`,
          top: "50%",
          marginTop: `${-depth / 2}rem`,
          backfaceVisibility: "hidden",
          transform: `rotateX(90deg) translateZ(${height / 2}rem)`,
        }}
      />
      <div
        className="sculpture-base-wood sculpture-base-wood--bottom absolute left-0"
        style={{
          width: `${width}rem`,
          height: `${depth}rem`,
          top: "50%",
          marginTop: `${-depth / 2}rem`,
          backfaceVisibility: "hidden",
          transform: `rotateX(-90deg) translateZ(${height / 2}rem)`,
        }}
      />
    </div>
  );
}

type ControlKind = "play" | "stop" | "reverse";

function controlLabel(kind: ControlKind): string {
  switch (kind) {
    case "play":
      return "Play";
    case "stop":
      return "Stop";
    case "reverse":
      return "Reverse";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function ControlIcon({ kind }: { kind: ControlKind }) {
  const className = "size-3.5 xl:size-5";

  switch (kind) {
    case "play":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M8 5.2v13.6L19.2 12Z" />
        </svg>
      );
    case "stop":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <rect x="6.5" y="6.5" width="11" height="11" rx="1.25" />
        </svg>
      );
    case "reverse":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M11.2 12 20 6.4v11.2Zm-8.4 0 8.8-5.6v11.2Z" />
        </svg>
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function ControlButton({
  kind,
  active,
  onClick,
}: {
  kind: ControlKind;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={controlLabel(kind)}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-md xl:size-11 ${
        active
          ? "bg-[#D32F27] text-[#F4EBD8]"
          : "bg-[#F4EBD8] text-[#D32F27] ring-1 ring-[#D32F27]/40"
      }`}
    >
      <ControlIcon kind={kind} />
    </button>
  );
}
