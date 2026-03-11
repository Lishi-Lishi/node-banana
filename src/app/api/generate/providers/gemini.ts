import { NextResponse } from "next/server";
import { GenerateResponse } from "@/types";
import { GoogleGenAI } from "@google/genai"; // 必须引入，为了视频的轮询功能

// --- 图片模型配置 ---
const MODEL_MAP: Record<string, string> = {
  "nano-banana": "gemini-2.5-flash-image",
  "nano-banana-pro": "gemini-3-pro-image-preview",
  "nano-banana-2": "gemini-3.1-flash-image-preview",
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
 * ==========================================
 * 1. 核心图片生成逻辑 (依然使用原生极速 Fetch)
 * ==========================================
 */
export async function generateWithGemini(
  requestId: string,
  apiKey: string,
  prompt: string,
  images: string[],
  model: string,
  aspectRatio?: string,
  resolution?: string,
  useGoogleSearch?: boolean,
  useImageSearch?: boolean
): Promise<NextResponse<GenerateResponse>> {
  
  let baseUrl = process.env.GEMINI_BASE_URL || "https://yunwu.ai";
  baseUrl = baseUrl.replace(/\/+$/, ""); 

  const targetId = MODEL_MAP[model] || model || "gemini-2.5-flash-image";
  const url = `${baseUrl}/v1beta/models/${targetId}:generateContent?key=${apiKey}`;

  console.log(`[API:${requestId}] 🚀 POST Yunwu-Gemini Image: ${url}`);
  console.log(`[API:${requestId}] Config: Model=${targetId}, Ratio=${aspectRatio || "Default"}, Res=${resolution || "Default"}`);

  try {
    const parts: any[] = [];

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

    if (prompt) {
      parts.push({ text: `\nUser Prompt: ${prompt}` });
    }

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
    if (resolution && (model === "nano-banana-pro" || model === "nano-banana-2")) {
      body.generationConfig.imageConfig.imageSize = resolution;
    }

    const tools = [];
    if (model === "nano-banana-2" && (useGoogleSearch || useImageSearch)) {
      const searchTypes: Record<string, any> = {};
      if (useGoogleSearch) searchTypes.webSearch = {};
      if (useImageSearch) searchTypes.imageSearch = {};
      tools.push({ googleSearch: { searchTypes } });
    } else if (model === "nano-banana-pro" && useGoogleSearch) {
      tools.push({ googleSearch: {} });
    }

    if (tools.length > 0) {
      body.tools = tools;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[API:${requestId}] ❌ Gemini Image Error:`, errText);
      throw new Error(`Cloud API Failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    console.log(`[API:${requestId}] 🕵️‍♂️ Raw API Response (Image):`, JSON.stringify(data, null, 2));

    const candidate = data.candidates?.[0];

    if (candidate?.finishReason === "SAFETY") {
        throw new Error("生成失败：触发了安全过滤 (Safety Filter)，请检查提示词或垫图是否违规。");
    }

    const part = candidate?.content?.parts?.[0];

    if (part?.inlineData?.data) {
      const base64Data = part.inlineData.data;
      const mimeType = part.inlineData.mimeType || "image/png";
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      console.log(`[API:${requestId}] ✅ Success! Image generated.`);
      return NextResponse.json({ success: true, image: dataUrl, contentType: "image" });
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

/**
 * --- 视频模型配置 ---
 */
const VEO_MODEL_MAP: Record<string, string> = {
  "veo-3.1/text-to-video": "veo3.1",
  "veo-3.1/image-to-video": "veo3.1",
  "veo-3.1-fast/text-to-video": "veo3.1-fast",
  "veo-3.1-fast/image-to-video": "veo3.1-fast",
};

/**
 * ==========================================
 * 2. 核心视频生成逻辑 (SDK 劫持云雾通道)
 * ==========================================
 */
export async function generateWithGeminiVideo(
  requestId: string,
  apiKey: string,
  modelId: string,
  prompt: string,
  images: string[],
  parameters: Record<string, unknown> = {},
): Promise<any> { 
  
  // 匹配云雾文档里的枚举模型名称
  let targetModel = "veo3.1";
  if (modelId.includes("fast")) {
    targetModel = "veo3.1-fast";
  }

  console.log(`[API:${requestId}] 🎬 Yunwu Video Start - Model: ${targetModel}`);

  let baseUrl = process.env.GEMINI_BASE_URL || "https://yunwu.ai";
  baseUrl = baseUrl.replace(/\/+$/, "");
  
  // 1. 发送创建任务请求
  const createUrl = `${baseUrl}/v1/video/create`;

  const body: any = {
    model: targetModel,
    prompt: prompt,
  };

  // 根据云雾文档，图片采用 images 数组参数
  if (images && images.length > 0) {
      body.images = images; 
  }
  
  // 注入长宽比 (文档标明16:9或9:16)
  if (parameters.aspectRatio) {
      body.aspect_ratio = parameters.aspectRatio;
  }

  try {
    console.log(`[API:${requestId}] 🚀 发送创建任务请求...`);
    
    const res = await fetch(createUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `创建任务报错: ${res.status} - ${errText}` };
    }

    const data = await res.json();
    const taskId = data.id || data.task_id;
    
    if (!taskId) {
        return { success: false, error: "未获取到任务ID" };
    }

    console.log(`[API:${requestId}] ✅ 任务创建成功! ID: ${taskId}, 开始轮询...`);

    // ==========================================
    // 2. 核心轮询逻辑 (基于 /v1/video/query)
    // ==========================================
    const queryUrl = `${baseUrl}/v1/video/query?id=${taskId}`;

    const POLL_INTERVAL = 10_000; // 10秒查一次
    const TIMEOUT = 5 * 60 * 1000; // 5分钟超时
    const startTime = Date.now();

    while (true) {
        const elapsed = Date.now() - startTime;
        if (elapsed > TIMEOUT) {
            return { success: false, error: "视频生成超时 (5分钟未完成)" };
        }

        console.log(`[API:${requestId}] ⏳ 查询视频进度... (${(elapsed / 1000).toFixed(0)}s)`);
        
        const queryRes = await fetch(queryUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                // 云雾文档中有些环境可能需要 Accept
                "Accept": "application/json" 
            }
        });

        if (!queryRes.ok) {
            const errText = await queryRes.text();
            console.error(`[API:${requestId}] ❌ 轮询接口报错:`, errText);
            return { success: false, error: `轮询接口报错: ${queryRes.status}` };
        }

        const taskData = await queryRes.json();
        const status = taskData.status;

        console.log(`[API:${requestId}] 轮询状态: ${status}`);

        // 成功状态 (匹配文档中的 completed 和 video_generation_completed)
        if (status === "completed" || status === "video_generation_completed" || status === "success") {
            const videoUrl = taskData.video_url; 
            
            if (!videoUrl) {
                return { success: false, error: "视频生成成功，但未返回 video_url！" };
            }

            console.log(`[API:${requestId}] 🎉 视频生成成功! URL: ${videoUrl}`);

            // 极速返回 URL 格式，让前端直接播放
            return { 
                success: true, 
                outputs: [{ type: "video", url: videoUrl }] 
            };
        } 
        // 失败状态
        else if (status === "failed" || status === "error" || status === "video_generation_failed") {
            return { success: false, error: `视频生成失败: 任务状态为 ${status}` };
        }

        // 继续等待
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

  } catch (error) {
    return { success: false, error: "请求或轮询过程发生异常" };
  }
}