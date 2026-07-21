export interface Point {
  x: number;
  y: number;
}

export type PathSegment =
  | { type: "line"; end: Point }
  | { type: "cubic"; control1: Point; control2: Point; end: Point }
  | {
      type: "arc";
      rx: number;
      ry: number;
      rotation: number;
      largeArc: boolean;
      sweep: boolean;
      end: Point;
    };

export interface Path {
  start: Point;
  segments: PathSegment[];
  closed: boolean;
}

export interface Transform {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface HitCandidate {
  id: string;
  path: Path;
  zIndex: number;
}

export type RoomEdge = "north" | "east" | "south" | "west";

export interface RoomTopology {
  id: string;
  row: number;
  column: number;
  rotation: 0 | 90 | 180 | 270;
  doors: RoomEdge[];
}
