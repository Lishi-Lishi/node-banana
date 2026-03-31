import type { WorkflowNode, WorkflowEdge, NodeGroup } from "@/types";
import type { EdgeStyle } from "./workflowStore";

export interface UndoSnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  groups: Record<string, NodeGroup>;
  edgeStyle: EdgeStyle;
}

const MAX_HISTORY = 50;

export class UndoManager {
  private undoStack: UndoSnapshot[] = [];
  private redoStack: UndoSnapshot[] = [];

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  push(snapshot: UndoSnapshot): void {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(currentState: UndoSnapshot): UndoSnapshot | null {
    const previous = this.undoStack.pop();
    if (!previous) return null;
    this.redoStack.push(currentState);
    return previous;
  }

  redo(currentState: UndoSnapshot): UndoSnapshot | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(currentState);
    return next;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
