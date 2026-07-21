import { describe, expect, it } from "vitest";

import {
  anchorInside,
  arcTo,
  boundsOf,
  circlePath,
  cubicTo,
  fullyInside,
  hitSelect,
  lineTo,
  nearestPoint,
  overlapRatio,
  path,
  pathsIntersect,
  point,
  pointInside,
  rectPath,
  roomsConnected,
  transformPath,
} from "../../../src/geometry";

describe("renderer-independent geometry", () => {
  it("handles line intersection, tangency, containment, and overlap", () => {
    const room = rectPath(0, 0, 100, 100);
    const crossing = path(point(-20, 50), [lineTo(120, 50)]);
    const tangent = circlePath(110, 50, 10);
    const token = circlePath(50, 50, 8);

    expect(pathsIntersect(room, crossing)).toBe(true);
    expect(pathsIntersect(room, tangent)).toBe(true);
    expect(pointInside(room, point(0, 40))).toBe(true);
    expect(fullyInside(token, room)).toBe(true);
    expect(anchorInside(token, room)).toBe(true);
    expect(overlapRatio(token, room)).toBeGreaterThan(0.99);
  });

  it("uses adaptive cubic and arc narrow-phase geometry", () => {
    const cubic = path(point(0, 50), [cubicTo(25, -20, 75, 120, 100, 50)]);
    const arc = path(point(0, 50), [arcTo(50, 50, 0, false, true, 100, 50)]);
    const vertical = path(point(50, -10), [lineTo(50, 110)]);

    expect(pathsIntersect(cubic, vertical)).toBe(true);
    expect(pathsIntersect(arc, vertical)).toBe(true);
    const nearest = nearestPoint(arc, point(50, 40));
    expect(Number.isFinite(nearest.x)).toBe(true);
    expect(Number.isFinite(nearest.y)).toBe(true);
  });

  it("transforms bounds and resolves stable z-ordered hits", () => {
    const original = rectPath(0, 0, 20, 10);
    const transformed = transformPath(original, {
      a: 0,
      b: 1,
      c: -1,
      d: 0,
      tx: 30,
      ty: 40,
    });
    expect(boundsOf(transformed)).toEqual({
      minX: 20,
      minY: 40,
      maxX: 30,
      maxY: 60,
    });
    expect(
      hitSelect(
        [
          { id: "lower", path: rectPath(0, 0, 50, 50), zIndex: 1 },
          { id: "upper", path: rectPath(10, 10, 50, 50), zIndex: 2 },
        ],
        point(20, 20),
      ),
    ).toBe("upper");
  });

  it("computes rotation-aware room door topology", () => {
    const left = {
      id: "left",
      row: 0,
      column: 0,
      rotation: 0 as const,
      doors: ["east" as const],
    };
    const right = {
      id: "right",
      row: 0,
      column: 1,
      rotation: 0 as const,
      doors: ["west" as const],
    };
    expect(roomsConnected(left, right)).toBe(true);
    expect(roomsConnected(left, { ...right, rotation: 90 })).toBe(false);
  });
});
