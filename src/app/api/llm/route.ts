import { NextRequest, NextResponse } from "next/server";
//import { GoogleGenAI } from "@google/genai";
import { LLMGenerateRequest, LLMGenerateResponse, LLMModelType } from "@/types";
import { logger } from "@/utils/logger";

export const maxDuration = 60; // 1 minute timeout

// Generate a unique request ID for tracking
function generateRequestId(): string {
  return `llm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Map model types to actual API model IDs
const GOOGLE_MODEL_MAP: Record<string, string> = {
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-3-flash-preview": "gemini-3-flash-preview",
  "gemini-3-pro-preview": "gemini-3-pro-preview",
};

const OPENAI_MODEL_MAP: Record<string, string> = {
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-4.1-nano": "gpt-4.1-nano",
};

/**
 * 核心修改：使用原生 Fetch 调用云雾/Google API
 * 替代了原来的 SDK 调用
 */
async function generateWithGoogle(
  prompt: string,
  model: LLMModelType,
  temperature: number,
  maxTokens: number,
  images?: string[],
  requestId?: string,
  userApiKey?: string | null
): Promise<string> {
  // 1. 获取 Key
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('api.error', 'GEMINI_API_KEY not configured', { requestId });
    throw new Error("GEMINI_API_KEY not configured.");
  }

  // 2. 获取 Base URL (新增逻辑)
  // 默认使用云雾地址，如果 .env.local 没配则兜底到 Google
  let baseUrl = process.env.GEMINI_BASE_URL || "https://yunwu.ai";
  baseUrl = baseUrl.replace(/\/+$/, ""); // 移除末尾斜杠

  const modelId = GOOGLE_MODEL_MAP[model] || model;

  logger.info('api.llm', 'Calling Google (Yunwu) API', {
    requestId,
    model: modelId,
    endpoint: baseUrl, // 记录一下请求地址方便调试
    temperature,
    maxTokens,
    imageCount: images?.length || 0,
    promptLength: prompt.length,
  });

  // 3. 构建 URL
  const url = `${baseUrl}/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  // 4. 构建请求内容 (Parts)
  // 保持原有的多模态逻辑：图片在前，文本在后
  const parts: any[] = [];

  // 🔥【关键修改】处理图片并添加 Image X 标签
  if (images && images.length > 0) {
    images.forEach((img, index) => {
      // A. 添加标签 (帮助模型区分图片)
      parts.push({ text: `Image ${index + 1}:` });

      // B. 添加图片数据
      const matches = img.match(/^data:(.+?);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2],
          },
        });
      } else {
        // 兜底处理纯 Base64
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: img,
          },
        });
      }
    });
  }

  // 添加文本 Prompt
  parts.push({ text: `\nUser Prompt: ${prompt}` });

  const startTime = Date.now();

  // 5. 发送原生请求
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      logger.error('api.error', 'Google API request failed', {
        requestId,
        status: response.status,
        error: errText,
      });
      throw new Error(`Cloud API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    
    // 6. 解析结果 (Native 格式解析)
    // 路径通常是 candidates[0].content.parts[0].text
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      logger.error('api.error', 'No text in Google API response', { requestId, data });
      throw new Error("No text in Google API response");
    }

    logger.info('api.llm', 'Google API response received', {
      requestId,
      duration,
      responseLength: text.length,
    });

    return text;

  } catch (error: any) {
    // 捕获 Fetch 错误 (如网络不通)
    logger.error('api.error', 'Fetch execution failed', { requestId }, error);
    throw error;
  }
}

async function generateWithOpenAI(
  prompt: string,
  model: LLMModelType,
  temperature: number,
  maxTokens: number,
  images?: string[],
  requestId?: string,
  userApiKey?: string | null
): Promise<string> {
  // User-provided key takes precedence over env variable
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error('api.error', 'OPENAI_API_KEY not configured', { requestId });
    throw new Error("OPENAI_API_KEY not configured. Add it to .env.local or configure in Settings.");
  }

  const modelId = OPENAI_MODEL_MAP[model];

  logger.info('api.llm', 'Calling OpenAI API', {
    requestId,
    model: modelId,
    temperature,
    maxTokens,
    imageCount: images?.length || 0,
    promptLength: prompt.length,
  });

  // Build content array for vision if images are provided
  let content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  if (images && images.length > 0) {
    content = [
      { type: "text", text: prompt },
      ...images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: img },
      })),
    ];
  } else {
    content = prompt;
  }

  const startTime = Date.now();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content }],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const duration = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    logger.error('api.error', 'OpenAI API request failed', {
      requestId,
      status: response.status,
      error: error.error?.message,
    });
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    logger.error('api.error', 'No text in OpenAI response', { requestId });
    throw new Error("No text in OpenAI response");
  }

  logger.info('api.llm', 'OpenAI API response received', {
    requestId,
    duration,
    responseLength: text.length,
  });

  return text;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Get user-provided API keys from headers (override env variables)
    const geminiApiKey = request.headers.get("X-Gemini-API-Key");
    const openaiApiKey = request.headers.get("X-OpenAI-API-Key");

    const body: LLMGenerateRequest = await request.json();
    const {
      prompt,
      images,
      provider,
      model,
      temperature = 0.7,
      maxTokens = 1024
    } = body;

    logger.info('api.llm', 'LLM generation request received', {
      requestId,
      provider,
      model,
      temperature,
      maxTokens,
      hasImages: !!(images && images.length > 0),
      imageCount: images?.length || 0,
      prompt,
    });

    if (!prompt) {
      logger.warn('api.llm', 'LLM request validation failed: missing prompt', { requestId });
      return NextResponse.json<LLMGenerateResponse>(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    let text: string;

    if (provider === "google") {
      // 这一步会调用我们改写后的 fetch 版本
      text = await generateWithGoogle(prompt, model, temperature, maxTokens, images, requestId, geminiApiKey);
    } else if (provider === "openai") {
      text = await generateWithOpenAI(prompt, model, temperature, maxTokens, images, requestId, openaiApiKey);
    } else {
      logger.warn('api.llm', 'Unknown provider requested', { requestId, provider });
      return NextResponse.json<LLMGenerateResponse>(
        { success: false, error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }

    logger.info('api.llm', 'LLM generation successful', {
      requestId,
      responseLength: text.length,
    });

    return NextResponse.json<LLMGenerateResponse>({
      success: true,
      text,
    });
  } catch (error) {
    logger.error('api.error', 'LLM generation error', { requestId }, error instanceof Error ? error : undefined);

    // Handle rate limiting
    if (error instanceof Error && error.message.includes("429")) {
      return NextResponse.json<LLMGenerateResponse>(
        { success: false, error: "Rate limit reached. Please wait and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json<LLMGenerateResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "LLM generation failed",
      },
      { status: 500 }
    );
  }
}