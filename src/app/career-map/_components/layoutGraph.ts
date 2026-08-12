import dagre from "dagre";
import { Position, type Edge, type Node } from "reactflow";

// Per-node-type estimated dimensions — dagre needs a size per node to lay
// out ranks/spacing correctly before ReactFlow has actually measured the
// rendered DOM. Keep these roughly in sync with CareerMapNodes.tsx widths.
const NODE_SIZE: Record<string, { width: number; height: number }> = {
  student: { width: 180, height: 120 },
  info: { width: 210, height: 60 },
  program: { width: 220, height: 84 },
  credential: { width: 210, height: 60 },
  cluster: { width: 210, height: 56 },
  role: { width: 220, height: 60 },
  empty: { width: 210, height: 56 },
};
const DEFAULT_SIZE = { width: 210, height: 64 };

/**
 * Lays out nodes/edges left-to-right (a journey/roadmap feel) using dagre
 * instead of hand-picked x/y coordinates — stays clean and non-overlapping
 * regardless of how many programs/credentials/AI clusters a student has.
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR",
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 32, ranksep: 110 });

  nodes.forEach((node) => {
    const size = NODE_SIZE[node.type ?? ""] ?? DEFAULT_SIZE;
    g.setNode(node.id, size);
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const isHorizontal = direction === "LR";
  const layoutedNodes = nodes.map((node) => {
    const size = NODE_SIZE[node.type ?? ""] ?? DEFAULT_SIZE;
    const pos = g.node(node.id) as { x: number; y: number };
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: pos.x - size.width / 2,
        y: pos.y - size.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
