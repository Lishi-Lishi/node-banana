/**
 * Gemini Provider for Generate API Route
 *
 * Handles image generation using Google's Gemini API models.
 */

/**import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GenerateResponse, ModelType } from "@/types";

/**
 * Map model types to Gemini model IDs
 */
/*export const MODEL_MAP: Record<ModelType, string> = {
  "nano-banana": "gemini-2.5-flash-image",
  "nano-banana-pro": "gemini-3-pro-image-preview",
};

/**
 * Generate image using Gemini API (legacy/default path)
 */
/*export async function generateWithGemini(
  requestId: string,
  apiKey: string,
  prompt: string,
  images: string[],
  model: ModelType,
  aspectRatio?: string,
  resolution?: string,
  useGoogleSearch?: boolean
): Promise<NextResponse<GenerateResponse>> {
  console.log(`[API:${requestId}] Gemini generation - Model: ${model}, Images: ${images?.length || 0}, Prompt: ${prompt?.length || 0} chars`);

  // Extract base64 data and MIME types from data URLs
  const imageData = (images || []).map((image, idx) => {
    if (image.includes("base64,")) {
      const [header, data] = image.split("base64,");
      // Extract MIME type from header (e.g., "data:image/png;" -> "image/png")
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      console.log(`[API:${requestId}]   Image ${idx + 1}: ${mimeType}, ${(data.length / 1024).toFixed(1)}KB`);
      return { data, mimeType };
    }
    console.log(`[API:${requestId}]   Image ${idx + 1}: raw, ${(image.length / 1024).toFixed(1)}KB`);
    return { data: image, mimeType: "image/png" };
  });

  // Initialize Gemini client
  const ai = new GoogleGenAI({ apiKey });

  // Build request parts array with prompt and all images
  const requestParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
    ...imageData.map(({ data, mimeType }) => ({
      inlineData: {
        mimeType,
        data,
      },
    })),
  ];

  // Build config object based on model capabilities
  const config: Record<string, unknown> = {
    responseModalities: ["IMAGE", "TEXT"],
  };

  // Add imageConfig for both models (both support aspect ratio)
  if (aspectRatio) {
    config.imageConfig = {
      aspectRatio,
    };
  }

  // Add resolution only for Nano Banana Pro
  if (model === "nano-banana-pro" && resolution) {
    if (!config.imageConfig) {
      config.imageConfig = {};
    }
    (config.imageConfig as Record<string, unknown>).imageSize = resolution;
  }

  // Add tools array for Google Search (only Nano Banana Pro)
  const tools = [];
  if (model === "nano-banana-pro" && useGoogleSearch) {
    tools.push({ googleSearch: {} });
  }

  console.log(`[API:${requestId}] Config: ${JSON.stringify(config)}`);

  // Make request to Gemini
  const geminiStartTime = Date.now();

  const response = await ai.models.generateContent({
    model: MODEL_MAP[model],
    contents: [
      {
        role: "user",
        parts: requestParts,
      },
    ],
    config,
    ...(tools.length > 0 && { tools }),
  });

  const geminiDuration = Date.now() - geminiStartTime;
  console.log(`[API:${requestId}] Gemini API completed in ${geminiDuration}ms`);

  // Extract image from response
  const candidates = response.candidates;

  if (!candidates || candidates.length === 0) {
    console.error(`[API:${requestId}] No candidates in Gemini response`);
    return NextResponse.json<GenerateResponse>(
      {
        success: false,
        error: "No response from AI model",
      },
      { status: 500 }
    );
  }

  const parts = candidates[0].content?.parts;
  console.log(`[API:${requestId}] Response parts: ${parts?.length || 0}`);

  if (!parts) {
    console.error(`[API:${requestId}] No parts in Gemini candidate content`);
    return NextResponse.json<GenerateResponse>(
      {
        success: false,
        error: "No content in response",
      },
      { status: 500 }
    );
  }

  // Find image part in response
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      const imgData = part.inlineData.data;
      const imageSizeKB = (imgData.length / 1024).toFixed(1);

      console.log(`[API:${requestId}] Output image: ${mimeType}, ${imageSizeKB}KB`);

      const dataUrl = `data:${mimeType};base64,${imgData}`;

      const responsePayload = { success: true, image: dataUrl };
      const responseSize = JSON.stringify(responsePayload).length;
      const responseSizeMB = (responseSize / (1024 * 1024)).toFixed(2);

      if (responseSize > 4.5 * 1024 * 1024) {
        console.warn(`[API:${requestId}] Response size (${responseSizeMB}MB) approaching Next.js 5MB limit`);
      }

      console.log(`[API:${requestId}] SUCCESS - Returning ${responseSizeMB}MB payload`);

      return NextResponse.json<GenerateResponse>(responsePayload);
    }
  }

  // If no image found, check for text error
  for (const part of parts) {
    if (part.text) {
      console.error(`[API:${requestId}] Gemini returned text instead of image: ${part.text.substring(0, 100)}`);
      return NextResponse.json<GenerateResponse>(
        {
          success: false,
          error: `Model returned text instead of image: ${part.text.substring(0, 200)}`,
        },
        { status: 500 }
      );
    }
  }

  console.error(`[API:${requestId}] No image or text found in Gemini response`);
  return NextResponse.json<GenerateResponse>(
    {
      success: false,
      error: "No image in response",
    },
    { status: 500 }
  );
}
*/

import { NextResponse } from "next/server";
import { GenerateResponse } from "@/types";

// Map model types to Gemini model IDs
const MODEL_MAP: Record<string, string> = {
  "nano-banana": "gemini-2.5-flash-image",
  "nano-banana-pro": "gemini-3-pro-image-preview",
};

/**
 * 辅助函数：将图片 (URL 或 Base64) 转为纯 Base64 字符串
 */
async function imageUrlToBase64(url: string): Promise<string> {
  if (url.startsWith("data:")) {
    return url.split("base64,")[1];
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (error) {
    console.error("Image conversion failed:", error);
    throw error;
  }
}

/**
 * Generate image using Gemini API (通过云雾 Native Fetch)
 */
export async function generateWithGemini(
  requestId: string,
  apiKey: string,
  prompt: string,
  images: string[],
  model: string,
  aspectRatio?: string,
  resolution?: string,
  useGoogleSearch?: boolean
): Promise<NextResponse<GenerateResponse>> {
  
  // 1. 获取 Base URL (适配云雾)
  let baseUrl = process.env.GEMINI_BASE_URL || "https://yunwu.ai";
  baseUrl = baseUrl.replace(/\/+$/, ""); 

  const targetId = MODEL_MAP[model] || model || "gemini-2.5-flash-image";
  const url = `${baseUrl}/v1beta/models/${targetId}:generateContent?key=${apiKey}`;

  console.log(`[API:${requestId}] 🚀 POST Yunwu-Gemini Native: ${url}`);
  console.log(`[API:${requestId}] Config: Model=${targetId}, Ratio=${aspectRatio || "Default"}, Res=${resolution || "Default"}`);

  try {
    const parts: any[] = [];

    // 2. 处理图片，加上 "Image X:" 标签
    if (images && images.length > 0) {
      console.log(`[API:${requestId}] 🔄 Converting ${images.length} images...`);
      for (let i = 0; i < images.length; i++) {
        const imgUrl = images[i];
        try {
          const base64Data = await imageUrlToBase64(imgUrl);
          parts.push({ text: `Image ${i + 1}:` });
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          });
        } catch (e) {
          console.error(`[API:${requestId}] Failed to process image ${i + 1}`, e);
        }
      }
    }

    // 3. 处理 Prompt
    if (prompt) {
      parts.push({ text: `\nUser Prompt: ${prompt}` });
    }

    // 4. 构造 Body
    const body: any = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {}
      }
    };

    if (aspectRatio) {
      body.generationConfig.imageConfig.aspectRatio = aspectRatio;
    }
    if (resolution && (targetId.includes("pro") || model.includes("pro"))) {
      body.generationConfig.imageConfig.imageSize = resolution;
    }

    // 5. 发送 Fetch 请求
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[API:${requestId}] ❌ Gemini Native Error:`, errText);
      throw new Error(`Cloud API Failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    // 6. 解析图片返回结果
    if (part?.inlineData?.data) {
      const base64Data = part.inlineData.data;
      const mimeType = part.inlineData.mimeType || "image/png";
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      console.log(`[API:${requestId}] ✅ Success! Image generated.`);
      
      // 返回与原版兼容的格式
      return NextResponse.json({ 
        success: true, 
        image: dataUrl, 
        contentType: "image" 
      });
    }

    if (part?.text) {
      console.warn(`[API:${requestId}] ⚠️ Gemini returned text:`, part.text);
      throw new Error(`Model returned text instead of image: "${part.text}"`);
    }

    throw new Error("Unknown Gemini native response format");

  } catch (error: any) {
    console.error(`[API:${requestId}] 💥 Handler Error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
