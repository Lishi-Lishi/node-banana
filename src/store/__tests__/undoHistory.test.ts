import { describe, it, expect, beforeEach } from "vitest";
import { UndoManager, UndoSnapshot } from "../undoHistory";

function makeSnapshot(label: string): UndoSnapshot {
  return {
    nodes: [{ id: label }] as UndoSnapshot["nodes"],
    edges: [],
    groups: {},
    edgeStyle: "curved",
  };
}

describe("UndoManager", () => {
  let manager: UndoManager;

  beforeEach(() => {
    manager = new UndoManager();
  });

  it("starts with empty stacks", () => {
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
  });

  it("push adds to undo stack", () => {
    manager.push(makeSnapshot("A"));
    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(false);
  });

  it("undo pops from undo stack and pushes current to redo", () => {
    manager.push(makeSnapshot("A"));
    const current = makeSnapshot("B");
    const result = manager.undo(current);
    expect(result?.nodes[0].id).toBe("A");
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(true);
  });

  it("undo returns null when stack is empty", () => {
    const result = manager.undo(makeSnapshot("current"));
    expect(result).toBeNull();
  });

  it("redo pops from redo stack and pushes current to undo", () => {
    manager.push(makeSnapshot("A"));
    const current = makeSnapshot("B");
    manager.undo(current);
    // now redo stack has B, undo stack is empty
    const redone = manager.redo(makeSnapshot("A-restored"));
    expect(redone?.nodes[0].id).toBe("B");
    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(false);
  });

  it("redo returns null when stack is empty", () => {
    const result = manager.redo(makeSnapshot("current"));
    expect(result).toBeNull();
  });

  it("push clears redo stack", () => {
    manager.push(makeSnapshot("A"));
    manager.push(makeSnapshot("B"));
    const current = makeSnapshot("C");
    manager.undo(current); // redo has C
    expect(manager.canRedo).toBe(true);
    manager.push(makeSnapshot("D")); // new action clears redo
    expect(manager.canRedo).toBe(false);
  });

  it("respects max depth of 50", () => {
    for (let i = 0; i < 60; i++) {
      manager.push(makeSnapshot(`snap-${i}`));
    }
    // Should have exactly 50 entries
    let count = 0;
    while (manager.canUndo) {
      manager.undo(makeSnapshot("current"));
      count++;
    }
    expect(count).toBe(50);
  });

  it("oldest entries are pruned when exceeding max depth", () => {
    for (let i = 0; i < 55; i++) {
      manager.push(makeSnapshot(`snap-${i}`));
    }
    // The first undo should give us snap-54 (most recent), and the oldest available should be snap-5
    const result = manager.undo(makeSnapshot("current"));
    expect(result?.nodes[0].id).toBe("snap-54");

    // Undo 48 more times to get to the oldest
    let last: UndoSnapshot | null = null;
    for (let i = 0; i < 48; i++) {
      last = manager.undo(makeSnapshot("temp"));
    }
    // last should be snap-6
    expect(last?.nodes[0].id).toBe("snap-6");

    // One more undo to get the oldest
    const oldest = manager.undo(makeSnapshot("temp"));
    expect(oldest?.nodes[0].id).toBe("snap-5");

    // No more undo available
    expect(manager.canUndo).toBe(false);
  });

  it("clear empties both stacks", () => {
    manager.push(makeSnapshot("A"));
    manager.push(makeSnapshot("B"));
    manager.undo(makeSnapshot("C")); // creates redo entry
    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(true);
    manager.clear();
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
  });

  it("multiple undo/redo cycles work correctly", () => {
    manager.push(makeSnapshot("A"));
    manager.push(makeSnapshot("B"));
    manager.push(makeSnapshot("C"));

    // Undo 3 times
    const r1 = manager.undo(makeSnapshot("D"));
    expect(r1?.nodes[0].id).toBe("C");

    const r2 = manager.undo(makeSnapshot("C"));
    expect(r2?.nodes[0].id).toBe("B");

    const r3 = manager.undo(makeSnapshot("B"));
    expect(r3?.nodes[0].id).toBe("A");

    expect(manager.canUndo).toBe(false);

    // Redo 3 times
    const f1 = manager.redo(makeSnapshot("A"));
    expect(f1?.nodes[0].id).toBe("B");

    const f2 = manager.redo(makeSnapshot("B"));
    expect(f2?.nodes[0].id).toBe("C");

    const f3 = manager.redo(makeSnapshot("C"));
    expect(f3?.nodes[0].id).toBe("D");

    expect(manager.canRedo).toBe(false);
  });
});
