/**
 * Utility functions for calculating node dimensions based on output aspect ratio.
 */

/**
 * Extract dimensions from a base64 data URL image.
 * @param base64DataUrl - The image as a base64 data URL (e.g., "data:image/png;base64,...")
 * @returns Promise resolving to {width, height} or null if extraction fails
 */
export function getImageDimensions(
  base64DataUrl: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!base64DataUrl || !base64DataUrl.startsWith("data:image")) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = base64DataUrl;
  });
}

/**
 * Extract dimensions from a video data URL or blob URL.
 * @param videoUrl - The video as a data URL or blob URL
 * @returns Promise resolving to {width, height} or null if extraction fails
 */
export function getVideoDimensions(
  videoUrl: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!videoUrl) {
      resolve(null);
      return;
    }

    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      resolve(null);
    };
    video.src = videoUrl;
  });
}

// Node sizing constraints
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 600;

// Node chrome: header (~40px), controls/padding (~60px)
const NODE_CHROME_HEIGHT = 100;

/**
 * Calculate node dimensions that maintain aspect ratio within constraints.
 * @param aspectRatio - Width divided by height (e.g., 16/9 for landscape, 9/16 for portrait)
 * @param baseWidth - Starting width to calculate from (default 300px)
 * @returns {width, height} dimensions that fit within constraints
 */
export function calculateNodeSize(
  aspectRatio: number,
  baseWidth: number = 300
): { width: number; height: number } {
  // Handle invalid aspect ratios
  if (!aspectRatio || aspectRatio <= 0 || !isFinite(aspectRatio)) {
    return { width: 300, height: 300 }; // Return default square
  }

  // Start with base width and calculate content height
  let width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, baseWidth));

  // Calculate content area height based on aspect ratio
  // Content height = width / aspectRatio
  let contentHeight = width / aspectRatio;
  let totalHeight = contentHeight + NODE_CHROME_HEIGHT;

  // Check if height exceeds max - if so, scale down width to fit
  if (totalHeight > MAX_HEIGHT) {
    contentHeight = MAX_HEIGHT - NODE_CHROME_HEIGHT;
    width = contentHeight * aspectRatio;
    totalHeight = MAX_HEIGHT;
  }

  // Check if height is below min - if so, scale up width to fit
  if (totalHeight < MIN_HEIGHT) {
    contentHeight = MIN_HEIGHT - NODE_CHROME_HEIGHT;
    width = contentHeight * aspectRatio;
    totalHeight = MIN_HEIGHT;
  }

  // Clamp width to constraints
  if (width > MAX_WIDTH) {
    width = MAX_WIDTH;
    contentHeight = width / aspectRatio;
    totalHeight = contentHeight + NODE_CHROME_HEIGHT;
    // Re-clamp height
    totalHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, totalHeight));
  }

  if (width < MIN_WIDTH) {
    width = MIN_WIDTH;
    contentHeight = width / aspectRatio;
    totalHeight = contentHeight + NODE_CHROME_HEIGHT;
    // Re-clamp height
    totalHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, totalHeight));
  }

  return {
    width: Math.round(width),
    height: Math.round(totalHeight),
  };
}
