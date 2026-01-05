import axios from 'axios';
import type { AIModelKey } from '@/types';

// 从环境变量获取 API Key
const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.warn('OPENROUTER_API_KEY is not set in environment variables');
}

// OpenRouter API 基础地址
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

// 支持的 AI 模型配置
export const AI_MODEL_CONFIGS = {
  deepseek: {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'DeepSeek 高性能对话模型',
    maxTokens: 8192,
  },
  gemini: {
    id: 'google/gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    description: 'Google 最新 Gemini 模型',
    maxTokens: 8192,
  },
  claude: {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Anthropic 高性能模型',
    maxTokens: 8192,
  },
} as const;

// 获取模型 ID
export function getModelId(key: AIModelKey): string {
  return AI_MODEL_CONFIGS[key].id;
}

// 获取所有可用的模型
export function getAvailableModels(): Array<{
  key: AIModelKey;
  id: string;
  name: string;
  description: string;
}> {
  return Object.entries(AI_MODEL_CONFIGS).map(([key, config]) => ({
    key: key as AIModelKey,
    id: config.id,
    name: config.name,
    description: config.description,
  }));
}

// 检查 API Key 是否配置
export function isApiKeyConfigured(): boolean {
  return !!apiKey && apiKey !== 'your_api_key_here' && apiKey.length > 10;
}

/**
 * 调用 OpenRouter API
 * @param model 模型ID
 * @param messages 消息数组
 * @returns 响应文本
 */
export async function callOpenRouter(
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (!isApiKeyConfigured()) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const response = await axios.post(
    `${OPENROUTER_API_BASE}/chat/completions`,
    {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      timeout: 60000,
    }
  );

  return response.data.choices[0]?.message?.content || '';
}

/**
 * 流式调用 OpenRouter API
 * @param model 模型ID
 * @param messages 消息数组
 * @returns 流式响应
 */
export async function streamOpenRouter(
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<ReadableStream> {
  if (!isApiKeyConfigured()) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    }),
  });

  return response.body!;
}
