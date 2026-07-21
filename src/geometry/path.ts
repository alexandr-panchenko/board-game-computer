import type {
  Bounds,
  HitCandidate,
  Path,
  PathSegment,
  Point,
  Transform,
} from "./types";

export const GEOMETRY_EPSILON = 1e-7;

export function point(x: number, y: number): Point {
  return { x, y };
}

export function lineTo(x: number, y: number): PathSegment {
  return { type: "line", end: point(x, y) };
}

export function cubicTo(
  cx1: number,
  cy1: number,
  cx2: number,
  cy2: number,
  x: number,
  y: number,
): PathSegment {
  return {
    type: "cubic",
    control1: point(cx1, cy1),
    control2: point(cx2, cy2),
    end: point(x, y),
  };
}

export function arcTo(
  rx: number,
  ry: number,
  rotation: number,
  largeArc: boolean,
  sweep: boolean,
  x: number,
  y: number,
): PathSegment {
  return {
    type: "arc",
    rx,
    ry,
    rotation,
    largeArc,
    sweep,
    end: point(x, y),
  };
}

export function path(
  start: Point,
  segments: PathSegment[],
  closed = false,
): Path {
  return { start, segments, closed };
}

export function rectPath(
  x: number,
  y: number,
  width: number,
  height: number,
): Path {
  return path(
    point(x, y),
    [
      lineTo(x + width, y),
      lineTo(x + width, y + height),
      lineTo(x, y + height),
    ],
    true,
  );
}

export function circlePath(cx: number, cy: number, radius: number): Path {
  return path(
    point(cx + radius, cy),
    [
      arcTo(radius, radius, 0, false, true, cx - radius, cy),
      arcTo(radius, radius, 0, false, true, cx + radius, cy),
    ],
    true,
  );
}

export function flattenPath(shape: Path, tolerance = 0.75): Point[] {
  const points = [shape.start];
  let current = shape.start;
  for (const segment of shape.segments) {
    if (segment.type === "line") points.push(segment.end);
    else if (segment.type === "cubic")
      flattenCubic(
        current,
        segment.control1,
        segment.control2,
        segment.end,
        tolerance,
        points,
      );
    else flattenArc(current, segment, tolerance, points);
    current = segment.end;
  }
  if (shape.closed && !samePoint(points[0]!, points.at(-1)!))
    points.push(points[0]!);
  return points;
}

export function transformPath(shape: Path, transform: Transform): Path {
  const points = flattenPath(shape).map((candidate) =>
    transformPoint(candidate, transform),
  );
  const start = points[0] ?? point(0, 0);
  const body = shape.closed ? points.slice(1, -1) : points.slice(1);
  return path(
    start,
    body.map((candidate) => lineTo(candidate.x, candidate.y)),
    shape.closed,
  );
}

export function transformPoint(candidate: Point, transform: Transform): Point {
  return {
    x: transform.a * candidate.x + transform.c * candidate.y + transform.tx,
    y: transform.b * candidate.x + transform.d * candidate.y + transform.ty,
  };
}

export function boundsOf(shape: Path): Bounds {
  const points = flattenPath(shape);
  return points.reduce<Bounds>(
    (bounds, candidate) => ({
      minX: Math.min(bounds.minX, candidate.x),
      minY: Math.min(bounds.minY, candidate.y),
      maxX: Math.max(bounds.maxX, candidate.x),
      maxY: Math.max(bounds.maxY, candidate.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

export function boundsIntersect(left: Bounds, right: Bounds): boolean {
  return !(
    left.maxX < right.minX - GEOMETRY_EPSILON ||
    right.maxX < left.minX - GEOMETRY_EPSILON ||
    left.maxY < right.minY - GEOMETRY_EPSILON ||
    right.maxY < left.minY - GEOMETRY_EPSILON
  );
}

export function pointOnPath(shape: Path, candidate: Point): boolean {
  const points = flattenPath(shape);
  for (let index = 1; index < points.length; index += 1)
    if (pointOnSegment(candidate, points[index - 1]!, points[index]!))
      return true;
  return false;
}

export function pointInside(shape: Path, candidate: Point): boolean {
  if (!shape.closed) return pointOnPath(shape, candidate);
  if (pointOnPath(shape, candidate)) return true;
  const points = flattenPath(shape);
  let inside = false;
  for (
    let index = 0, previous = points.length - 1;
    index < points.length;
    previous = index++
  ) {
    const left = points[index]!;
    const right = points[previous]!;
    if (
      left.y > candidate.y !== right.y > candidate.y &&
      candidate.x <
        ((right.x - left.x) * (candidate.y - left.y)) / (right.y - left.y) +
          left.x
    )
      inside = !inside;
  }
  return inside;
}

export function pathsIntersect(left: Path, right: Path): boolean {
  if (!boundsIntersect(boundsOf(left), boundsOf(right))) return false;
  const leftPoints = flattenPath(left);
  const rightPoints = flattenPath(right);
  for (let leftIndex = 1; leftIndex < leftPoints.length; leftIndex += 1)
    for (let rightIndex = 1; rightIndex < rightPoints.length; rightIndex += 1)
      if (
        segmentsIntersect(
          leftPoints[leftIndex - 1]!,
          leftPoints[leftIndex]!,
          rightPoints[rightIndex - 1]!,
          rightPoints[rightIndex]!,
        )
      )
        return true;
  return (
    (left.closed && pointInside(left, rightPoints[0]!)) ||
    (right.closed && pointInside(right, leftPoints[0]!))
  );
}

export function fullyInside(inner: Path, outer: Path): boolean {
  return flattenPath(inner).every((candidate) => pointInside(outer, candidate));
}

export function anchorInside(entity: Path, zone: Path): boolean {
  return pointInside(zone, entity.start);
}

export function overlapRatio(entity: Path, zone: Path): number {
  const entityBounds = boundsOf(entity);
  const width = entityBounds.maxX - entityBounds.minX;
  const height = entityBounds.maxY - entityBounds.minY;
  if (width <= GEOMETRY_EPSILON || height <= GEOMETRY_EPSILON)
    return pointInside(zone, entity.start) ? 1 : 0;
  const samples = 40;
  let entitySamples = 0;
  let overlapSamples = 0;
  for (let row = 0; row < samples; row += 1)
    for (let column = 0; column < samples; column += 1) {
      const candidate = {
        x: entityBounds.minX + ((column + 0.5) / samples) * width,
        y: entityBounds.minY + ((row + 0.5) / samples) * height,
      };
      if (!pointInside(entity, candidate)) continue;
      entitySamples += 1;
      if (pointInside(zone, candidate)) overlapSamples += 1;
    }
  return entitySamples === 0 ? 0 : overlapSamples / entitySamples;
}

export function nearestPoint(shape: Path, candidate: Point): Point {
  const points = flattenPath(shape);
  let nearest = points[0] ?? shape.start;
  let distance = squaredDistance(nearest, candidate);
  for (let index = 1; index < points.length; index += 1) {
    const projected = nearestOnSegment(
      candidate,
      points[index - 1]!,
      points[index]!,
    );
    const projectedDistance = squaredDistance(projected, candidate);
    if (projectedDistance < distance) {
      nearest = projected;
      distance = projectedDistance;
    }
  }
  return nearest;
}

export function hitSelect(
  candidates: HitCandidate[],
  candidate: Point,
): string | null {
  return (
    [...candidates]
      .sort((left, right) =>
        left.zIndex === right.zIndex
          ? left.id < right.id
            ? 1
            : -1
          : right.zIndex - left.zIndex,
      )
      .find((item) => pointInside(item.path, candidate))?.id ?? null
  );
}

function flattenCubic(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  tolerance: number,
  output: Point[],
): void {
  const estimate =
    distance(start, control1) +
    distance(control1, control2) +
    distance(control2, end);
  const steps = Math.max(4, Math.min(128, Math.ceil(estimate / tolerance)));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const inverse = 1 - t;
    output.push({
      x:
        inverse ** 3 * start.x +
        3 * inverse ** 2 * t * control1.x +
        3 * inverse * t ** 2 * control2.x +
        t ** 3 * end.x,
      y:
        inverse ** 3 * start.y +
        3 * inverse ** 2 * t * control1.y +
        3 * inverse * t ** 2 * control2.y +
        t ** 3 * end.y,
    });
  }
}

function flattenArc(
  start: Point,
  segment: Extract<PathSegment, { type: "arc" }>,
  tolerance: number,
  output: Point[],
): void {
  const arc = endpointArc(start, segment);
  if (arc === null) {
    output.push(segment.end);
    return;
  }
  const steps = Math.max(
    4,
    Math.min(
      256,
      Math.ceil((Math.abs(arc.delta) * Math.max(arc.rx, arc.ry)) / tolerance),
    ),
  );
  const rotation = radians(segment.rotation);
  for (let index = 1; index <= steps; index += 1) {
    const angle = arc.start + (arc.delta * index) / steps;
    const x = arc.rx * Math.cos(angle);
    const y = arc.ry * Math.sin(angle);
    output.push({
      x: arc.cx + Math.cos(rotation) * x - Math.sin(rotation) * y,
      y: arc.cy + Math.sin(rotation) * x + Math.cos(rotation) * y,
    });
  }
  output[output.length - 1] = segment.end;
}

function endpointArc(
  start: Point,
  segment: Extract<PathSegment, { type: "arc" }>,
): {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  start: number;
  delta: number;
} | null {
  let rx = Math.abs(segment.rx);
  let ry = Math.abs(segment.ry);
  if (
    rx <= GEOMETRY_EPSILON ||
    ry <= GEOMETRY_EPSILON ||
    samePoint(start, segment.end)
  )
    return null;
  const phi = radians(segment.rotation);
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (start.x - segment.end.x) / 2;
  const dy = (start.y - segment.end.y) / 2;
  const xPrime = cos * dx + sin * dy;
  const yPrime = -sin * dx + cos * dy;
  const scale = xPrime ** 2 / rx ** 2 + yPrime ** 2 / ry ** 2;
  if (scale > 1) {
    const factor = Math.sqrt(scale);
    rx *= factor;
    ry *= factor;
  }
  const numerator = Math.max(
    0,
    rx ** 2 * ry ** 2 - rx ** 2 * yPrime ** 2 - ry ** 2 * xPrime ** 2,
  );
  const denominator = rx ** 2 * yPrime ** 2 + ry ** 2 * xPrime ** 2;
  const sign = segment.largeArc === segment.sweep ? -1 : 1;
  const coefficient =
    denominator <= GEOMETRY_EPSILON
      ? 0
      : sign * Math.sqrt(numerator / denominator);
  const centerPrime = {
    x: coefficient * ((rx * yPrime) / ry),
    y: coefficient * (-(ry * xPrime) / rx),
  };
  const cx =
    cos * centerPrime.x - sin * centerPrime.y + (start.x + segment.end.x) / 2;
  const cy =
    sin * centerPrime.x + cos * centerPrime.y + (start.y + segment.end.y) / 2;
  const startVector = {
    x: (xPrime - centerPrime.x) / rx,
    y: (yPrime - centerPrime.y) / ry,
  };
  const endVector = {
    x: (-xPrime - centerPrime.x) / rx,
    y: (-yPrime - centerPrime.y) / ry,
  };
  const startAngle = vectorAngle({ x: 1, y: 0 }, startVector);
  let delta = vectorAngle(startVector, endVector);
  if (!segment.sweep && delta > 0) delta -= Math.PI * 2;
  if (segment.sweep && delta < 0) delta += Math.PI * 2;
  return { cx, cy, rx, ry, start: startAngle, delta };
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  if (
    ((abC > GEOMETRY_EPSILON && abD < -GEOMETRY_EPSILON) ||
      (abC < -GEOMETRY_EPSILON && abD > GEOMETRY_EPSILON)) &&
    ((cdA > GEOMETRY_EPSILON && cdB < -GEOMETRY_EPSILON) ||
      (cdA < -GEOMETRY_EPSILON && cdB > GEOMETRY_EPSILON))
  )
    return true;
  return (
    (Math.abs(abC) <= GEOMETRY_EPSILON && pointOnSegment(c, a, b)) ||
    (Math.abs(abD) <= GEOMETRY_EPSILON && pointOnSegment(d, a, b)) ||
    (Math.abs(cdA) <= GEOMETRY_EPSILON && pointOnSegment(a, c, d)) ||
    (Math.abs(cdB) <= GEOMETRY_EPSILON && pointOnSegment(b, c, d))
  );
}

function pointOnSegment(candidate: Point, start: Point, end: Point): boolean {
  if (Math.abs(cross(start, end, candidate)) > GEOMETRY_EPSILON) return false;
  return (
    candidate.x >= Math.min(start.x, end.x) - GEOMETRY_EPSILON &&
    candidate.x <= Math.max(start.x, end.x) + GEOMETRY_EPSILON &&
    candidate.y >= Math.min(start.y, end.y) - GEOMETRY_EPSILON &&
    candidate.y <= Math.max(start.y, end.y) + GEOMETRY_EPSILON
  );
}

function nearestOnSegment(candidate: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  if (length <= GEOMETRY_EPSILON) return start;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((candidate.x - start.x) * dx + (candidate.y - start.y) * dy) / length,
    ),
  );
  return { x: start.x + t * dx, y: start.y + t * dy };
}

function cross(start: Point, end: Point, candidate: Point): number {
  return (
    (end.x - start.x) * (candidate.y - start.y) -
    (end.y - start.y) * (candidate.x - start.x)
  );
}

function vectorAngle(left: Point, right: Point): number {
  return Math.atan2(
    left.x * right.y - left.y * right.x,
    left.x * right.x + left.y * right.y,
  );
}

function samePoint(left: Point, right: Point): boolean {
  return squaredDistance(left, right) <= GEOMETRY_EPSILON ** 2;
}

function squaredDistance(left: Point, right: Point): number {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2;
}

function distance(left: Point, right: Point): number {
  return Math.sqrt(squaredDistance(left, right));
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
