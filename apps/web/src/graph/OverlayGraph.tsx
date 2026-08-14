import { Background, Controls, PanOnScrollMode, ReactFlow, type EdgeTypes, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ElementNode } from "./ElementNode";
import { RelationEdge } from "./RelationEdge";
import type { ElementNode as ElementNodeType, RelationEdge as RelationEdgeType } from "./toFlowGraph";

const NODE_TYPES: NodeTypes = { element: ElementNode };
const EDGE_TYPES: EdgeTypes = { relation: RelationEdge };

// Always read-only — unlike CanvasGraph, there is no "active milestone" a
// mutation could target here (the view merges two at once), so there is no
// mutation machinery to strip in the first place.
export function OverlayGraph({ nodes, edges, dataQa = "overlay-canvas" }: { nodes: ElementNodeType[]; edges: RelationEdgeType[]; dataQa?: string }) {
  return (
    <div data-qa={dataQa} style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnScroll={false}
          zoomOnPinch
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
