import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CostDialog } from "@/components/CostDialog";
import { PredictedCostResult } from "@/utils/costCalculator";

// Mock the workflow store
const mockResetIncurredCost = vi.fn();
const mockUseWorkflowStore = vi.fn();

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector?: (state: unknown) => unknown) => {
    if (selector) {
      return mockUseWorkflowStore(selector);
    }
    return mockUseWorkflowStore((s: unknown) => s);
  },
}));

// Mock confirm
const mockConfirm = vi.fn(() => true);
global.confirm = mockConfirm;

describe("CostDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkflowStore.mockImplementation((selector) => {
      const state = {
        resetIncurredCost: mockResetIncurredCost,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createPredictedCost = (overrides: Partial<PredictedCostResult> = {}): PredictedCostResult => ({
    totalCost: 0.50,
    breakdown: [
      {
        model: "nano-banana",
        resolution: "1K",
        count: 5,
        unitCost: 0.039,
        subtotal: 0.195,
      },
      {
        model: "nano-banana-pro",
        resolution: "2K",
        count: 2,
        unitCost: 0.134,
        subtotal: 0.268,
      },
    ],
    nodeCount: 7,
    ...overrides,
  });

  describe("Basic Rendering", () => {
    it("should render dialog with title", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Workflow Costs")).toBeInTheDocument();
    });

    it("should render close button", () => {
      const { container } = render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Close button has an SVG with X icon
      const closeButton = container.querySelector("button");
      expect(closeButton).toBeInTheDocument();
    });

    it("should render Predicted Cost section", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Predicted Cost")).toBeInTheDocument();
    });

    it("should render Incurred Cost section", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Incurred Cost")).toBeInTheDocument();
    });

    it("should render Pricing Reference section", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Pricing Reference:")).toBeInTheDocument();
    });
  });

  describe("Cost Display", () => {
    it("should display formatted predicted cost", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost({ totalCost: 1.25 })}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("$1.25")).toBeInTheDocument();
    });

    it("should display formatted incurred cost", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={2.50}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("$2.50")).toBeInTheDocument();
    });

    it("should display $0.00 for zero costs", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost({ totalCost: 0 })}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Should have two $0.00 - one for predicted, one for incurred
      const zeroValues = screen.getAllByText("$0.00");
      expect(zeroValues.length).toBe(2);
    });
  });

  describe("Cost Breakdown", () => {
    it("should render per-model cost rows", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Check for model count and name
      expect(screen.getByText(/5x Nano Banana/)).toBeInTheDocument();
      expect(screen.getByText(/2x Nano Banana Pro/)).toBeInTheDocument();
    });

    it("should show resolution for Nano Banana Pro models", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Nano Banana Pro should show resolution
      expect(screen.getByText(/Nano Banana Pro.*\(2K\)/)).toBeInTheDocument();
    });

    it("should display subtotal for each model type", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Check for subtotals
      expect(screen.getByText("$0.20")).toBeInTheDocument(); // 0.195 rounded
      expect(screen.getByText("$0.27")).toBeInTheDocument(); // 0.268 rounded
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no generation nodes exist", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost({
            totalCost: 0,
            breakdown: [],
            nodeCount: 0
          })}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("No generation nodes in workflow")).toBeInTheDocument();
    });

    it("should not show breakdown section when nodeCount is 0", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost({
            totalCost: 0,
            breakdown: [],
            nodeCount: 0
          })}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByText(/5x Nano Banana/)).not.toBeInTheDocument();
    });
  });

  describe("Reset Costs Button", () => {
    it("should not show reset button when incurredCost is 0", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByText("Reset to $0.00")).not.toBeInTheDocument();
    });

    it("should show reset button when incurredCost is greater than 0", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={1.00}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Reset to $0.00")).toBeInTheDocument();
    });

    it("should show confirmation dialog when reset is clicked", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={1.00}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("Reset to $0.00"));

      expect(mockConfirm).toHaveBeenCalledWith("Reset incurred cost to $0.00?");
    });

    it("should call resetIncurredCost when confirmed", () => {
      mockConfirm.mockReturnValue(true);

      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={1.00}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("Reset to $0.00"));

      expect(mockResetIncurredCost).toHaveBeenCalled();
    });

    it("should not call resetIncurredCost when cancelled", () => {
      mockConfirm.mockReturnValue(false);

      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={1.00}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("Reset to $0.00"));

      expect(mockResetIncurredCost).not.toHaveBeenCalled();
    });
  });

  describe("Close Behavior", () => {
    it("should call onClose when close button is clicked", () => {
      const onClose = vi.fn();

      const { container } = render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={onClose}
        />
      );

      // Click the close button (first button in the dialog)
      const closeButton = container.querySelector("button");
      fireEvent.click(closeButton!);

      expect(onClose).toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", () => {
      const onClose = vi.fn();

      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Pricing Reference", () => {
    it("should display nano-banana pricing", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Nano Banana \(Flash\):/)).toBeInTheDocument();
    });

    it("should display nano-banana-pro pricing tiers", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Nano Banana Pro 1K\/2K:/)).toBeInTheDocument();
      expect(screen.getByText(/Nano Banana Pro 4K:/)).toBeInTheDocument();
    });

    it("should display currency note", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("All prices in USD")).toBeInTheDocument();
    });
  });

  describe("Incurred Cost Description", () => {
    it("should display description for incurred costs", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Actual API spend from successful generations")).toBeInTheDocument();
    });
  });
});
