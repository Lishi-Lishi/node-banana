import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockStat = vi.fn();
const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();

vi.mock("fs/promises", () => ({
  stat: (...args: unknown[]) => mockStat(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST } from "../route";

function createMockPostRequest(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("/api/workflow-images route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("POST - Save workflow image", () => {
    it("should save image when workflow directory exists", async () => {
      mockStat.mockResolvedValue({
        isDirectory: () => true,
      });
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const request = createMockPostRequest({
        workflowPath: "/test/workflow",
        imageId: "img_123",
        folder: "inputs",
        imageData: "data:image/png;base64,aGVsbG8=",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.imageId).toBe("img_123");
      expect(data.filePath).toBe("/test/workflow/inputs/img_123.png");
      expect(mockMkdir).toHaveBeenCalledWith("/test/workflow/inputs", { recursive: true });
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should create missing workflow directory and save image", async () => {
      mockStat.mockRejectedValue(new Error("ENOENT"));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const request = createMockPostRequest({
        workflowPath: "/test/new-workflow",
        imageId: "img_123",
        folder: "inputs",
        imageData: "data:image/png;base64,aGVsbG8=",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockMkdir).toHaveBeenCalledWith("/test/new-workflow", { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith("/test/new-workflow/inputs", { recursive: true });
    });
  });
});
