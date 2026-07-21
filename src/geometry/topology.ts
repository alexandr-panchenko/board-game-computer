import type { RoomEdge, RoomTopology } from "./types";

const edges: RoomEdge[] = ["north", "east", "south", "west"];

export function rotateEdge(
  edge: RoomEdge,
  rotation: 0 | 90 | 180 | 270,
): RoomEdge {
  return edges[(edges.indexOf(edge) + rotation / 90) % edges.length]!;
}

export function sharedEdges(
  left: RoomTopology,
  right: RoomTopology,
): [RoomEdge, RoomEdge] | null {
  const row = right.row - left.row;
  const column = right.column - left.column;
  if (row === -1 && column === 0) return ["north", "south"];
  if (row === 1 && column === 0) return ["south", "north"];
  if (row === 0 && column === 1) return ["east", "west"];
  if (row === 0 && column === -1) return ["west", "east"];
  return null;
}

export function roomsConnected(
  left: RoomTopology,
  right: RoomTopology,
): boolean {
  const shared = sharedEdges(left, right);
  if (shared === null) return false;
  const leftDoors = left.doors.map((edge) => rotateEdge(edge, left.rotation));
  const rightDoors = right.doors.map((edge) =>
    rotateEdge(edge, right.rotation),
  );
  return leftDoors.includes(shared[0]) && rightDoors.includes(shared[1]);
}

export function connectedRoomIds(
  roomId: string,
  rooms: RoomTopology[],
): string[] {
  const room = rooms.find((candidate) => candidate.id === roomId);
  if (room === undefined) return [];
  return rooms
    .filter(
      (candidate) => candidate.id !== roomId && roomsConnected(room, candidate),
    )
    .map((candidate) => candidate.id)
    .sort();
}
