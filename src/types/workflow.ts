/**
 * Workflow Types
 *
 * Types for workflow management including edges, save configuration,
 * cost tracking, and node groups.
 */

import { Edge } from "@xyflow/react";

// Workflow Edge Data
export interface WorkflowEdgeData extends Record<string, unknown> {
  hasPause?: boolean;
}

// Workflow Edge
export type WorkflowEdge = Edge<WorkflowEdgeData>;

// Auto-save configuration stored in localStorage
export interface WorkflowSaveConfig {
  workflowId: string;
  name: string;
  directoryPath: string;
  generationsPath: string | null;
  lastSavedAt: number | null;
}

// Cost tracking data stored per-workflow in localStorage
export interface WorkflowCostData {
  workflowId: string;
  incurredCost: number;
  lastUpdated: number;
}

// Group background color options (dark mode tints)
export type GroupColor =
  | "neutral"
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "red";

// Group definition stored in workflow
export interface NodeGroup {
  id: string;
  name: string;
  color: GroupColor;
  position: { x: number; y: number };
  size: { width: number; height: number };
  locked?: boolean;
}
