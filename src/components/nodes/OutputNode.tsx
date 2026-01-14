"use client";

import { useCallback, useState, useMemo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { OutputNodeData } from "@/types";

type OutputNodeType = Node<OutputNodeData, "output">;

export function OutputNode({ id, data, selected }: NodeProps<OutputNodeType>) {
  const nodeData = data;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [showLightbox, setShowLightbox] = useState(false);

  // Determine if content is video
  const isVideo = useMemo(() => {
    if (nodeData.video) return true;
    if (nodeData.contentType === "video") return true;
    if (nodeData.image?.startsWith("data:video/")) return true;
    if (nodeData.image?.includes(".mp4") || nodeData.image?.includes(".webm")) return true;
    return false;
  }, [nodeData.video, nodeData.contentType, nodeData.image]);

  // Get the content source (video or image)
  const contentSrc = useMemo(() => {
    if (nodeData.video) return nodeData.video;
    return nodeData.image;
  }, [nodeData.video, nodeData.image]);

  const handleDownload = useCallback(async () => {
    if (!contentSrc) return;

    const timestamp = Date.now();
    const filename = isVideo ? `generated-${timestamp}.mp4` : `generated-${timestamp}.png`;

    // Handle URL-based content (needs fetch + blob conversion)
    if (contentSrc.startsWith("http://") || contentSrc.startsWith("https://")) {
      try {
        const response = await fetch(contentSrc);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Failed to download:", error);
      }
      return;
    }

    // Handle data URL content (direct download)
    const link = document.createElement("a");
    link.href = contentSrc;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [contentSrc, isVideo]);

  return (
    <>
      <BaseNode
        id={id}
        title="Output"
        customTitle={nodeData.customTitle}
        comment={nodeData.comment}
        onCustomTitleChange={(title) => updateNodeData(id, { customTitle: title || undefined })}
        onCommentChange={(comment) => updateNodeData(id, { comment: comment || undefined })}
        selected={selected}
        className="min-w-[200px]"
      >
        <Handle
          type="target"
          position={Position.Left}
          id="image"
          data-handletype="image"
        />

        {contentSrc ? (
          <div className="flex-1 flex flex-col min-h-0 gap-2">
            <div
              className="relative cursor-pointer group flex-1 min-h-0"
              onClick={() => setShowLightbox(true)}
            >
              {isVideo ? (
                <video
                  src={contentSrc}
                  controls
                  loop
                  muted
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain rounded"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={contentSrc}
                  alt="Output"
                  className="w-full h-full object-contain rounded"
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center rounded pointer-events-none">
                <span className="text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded">
                  View full size
                </span>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="w-full py-1.5 bg-white hover:bg-neutral-200 text-neutral-900 text-[10px] font-medium rounded transition-colors shrink-0"
            >
              Download
            </button>
          </div>
        ) : (
          <div className="w-full flex-1 min-h-[144px] border border-dashed border-neutral-600 rounded flex items-center justify-center">
            <span className="text-neutral-500 text-[10px]">Waiting for image or video</span>
          </div>
        )}
      </BaseNode>

      {/* Lightbox Modal */}
      {showLightbox && contentSrc && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-8"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-full max-h-full">
            {isVideo ? (
              <video
                src={contentSrc}
                controls
                loop
                autoPlay
                playsInline
                className="max-w-full max-h-[90vh] object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={contentSrc}
                alt="Output full size"
                className="max-w-full max-h-[90vh] object-contain rounded"
              />
            )}
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
