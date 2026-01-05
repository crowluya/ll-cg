# Phase 2: 数据模块与 AI 服务

> **目标**: 实现新浪财经 API 数据获取和 OpenRouter AI 集成

---

## 实施清单

### 1. 新浪财经 API 封装

**文件**: `src/lib/data/sina-api.ts`

**创建函数**:
- `fetchStockData(code: string, days: number)` - 获取单只股票历史数据
- `fetchBatchStockData(codes: string[], days: number)` - 批量获取多只股票数据
- `fetchRealtimeData(code: string)` - 获取实时行情
- `parseSinaData(raw: string)` - 解析新浪返回的数据格式

**数据格式**:
```typescript
interface StockData {
  code: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

**验证**: 使用测试股票代码（如 sh600000）获取数据

---

### 2. 数据缓存模块

**文件**: `src/lib/data/cache.ts`

**创建函数**:
- `getCached(key: string)` - 获取缓存
- `setCached(key: string, data: any, ttl: number)` - 设置缓存（带过期时间）
- `generateCacheKey(code: string, days: number)` - 生成缓存键

**验证**: 相同请求在缓存有效期内直接返回缓存数据

---

### 3. OpenRouter 配置

**文件**: `src/lib/ai/client.ts`

**创建内容**:
```typescript
import { createOpenAI } from '@ai-sdk/openrouter';

// 创建 OpenRouter 客户端
export const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// 支持的模型列表
export const AI_MODELS = {
  deepseek: 'deepseek/deepseek-chat',
  gemini: 'google/gemini-2.0-flash-exp',
  claude: 'anthropic/claude-3.5-sonnet',
} as const;
```

**验证**: 客户端正确导出

---

### 4. AI 决策 Schema 定义

**文件**: `src/lib/ai/schema.ts`

**创建内容**:
```typescript
import { z } from 'zod';

// AI 决策输出 schema
export const decisionSchema = z.object({
  action: z.enum(['buy', 'sell', 'hold']),
  stock: z.string().optional(),
  quantity: z.number().optional(),
  reason: z.string(),
});

// AI 决策输入类型
export const decisionInputSchema = z.object({
  stockCode: z.string(),
  historyData: z.array(z.object({
    date: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
  })),
  currentPosition: z.object({
    stock: z.string(),
    quantity: z.number(),
    buyDate: z.string(),
    avgPrice: z.number(),
  }).optional(),
  availableCapital: z.number(),
  currentDate: z.string(),
});

export type AIDecision = z.infer<typeof decisionSchema>;
export type DecisionInput = z.infer<typeof decisionInputSchema>;
```

**验证**: schema 验证测试通过

---

### 5. AI 提示词模板

**文件**: `src/lib/ai/prompts.ts`

**创建内容**:
- `generateTradingPrompt(input: DecisionInput)` - 生成交易决策提示词
- `generateAnalysisPrompt(data: StockData[])` - 生成数据分析提示词

**提示词要点**:
- 角色定义：专业股票交易 AI
- 输入数据：历史 K 线数据、当前持仓、可用资金
- 约束条件：A 股 T+1 规则
- 输出要求：明确的买卖建议和理由

**验证**: 提示词格式正确，包含所有必要信息

---

### 6. AI 决策服务

**文件**: `src/lib/ai/decision.ts`

**创建函数**:
- `getAIDecision(model: string, input: DecisionInput)` - 获取 AI 决策
- `getBatchAIDecisions(models: string[], input: DecisionInput)` - 批量获取多模型决策

**实现**:
```typescript
import { generateText } from 'ai';
import { openrouter } from './client';
import { decisionSchema } from './schema';

export async function getAIDecision(model: string, input: DecisionInput) {
  const { object } = await generateText({
    model: openrouter(model),
    schema: decisionSchema,
    prompt: generateTradingPrompt(input),
  });
  return object;
}
```

**验证**: 调用 AI 返回正确的决策格式

---

### 7. 创建股票数据 API

**文件**: `src/app/api/stock/data/route.ts`

**接口**: `GET /api/stock/data?code=sh600000&days=30`

**返回格式**:
```json
{
  "success": true,
  "data": [
    {
      "code": "sh600000",
      "date": "2024-01-01",
      "open": 10.5,
      "high": 10.8,
      "low": 10.3,
      "close": 10.7,
      "volume": 1000000
    }
  ]
}
```

**验证**: API 返回正确的数据格式

---

### 8. 创建 AI 决策 API

**文件**: `src/app/api/ai/decision/route.ts`

**接口**: `POST /api/ai/decision`

**请求体**:
```json
{
  "model": "deepseek",
  "stockCode": "sh600000",
  "days": 30,
  "currentPosition": {...},
  "availableCapital": 100000,
  "currentDate": "2024-01-01"
}
```

**返回格式**:
```json
{
  "success": true,
  "decision": {
    "action": "buy",
    "stock": "sh600000",
    "quantity": 100,
    "reason": "技术指标显示上涨趋势"
  }
}
```

**验证**: API 正确调用 AI 并返回决策

---

### 9. 验证第二阶段完成

**检查项**:
- [ ] 能获取新浪财经股票数据
- [ ] 数据缓存正常工作
- [ ] OpenRouter 客户端配置正确
- [ ] AI 决策 schema 验证通过
- [ ] 提示词模板生成正确
- [ ] AI 决策服务返回有效决策
- [ ] 股票数据 API 可访问
- [ ] AI 决策 API 可访问

---

## 依赖关系

```
1. 新浪API封装 (无额外依赖)
   ↓
2. 数据缓存模块 (依赖 1)
   ↓
3. OpenRouter配置 (无依赖)
   ↓
4. AI决策Schema (无依赖)
   ↓
5. AI提示词模板 (依赖 4)
   ↓
6. AI决策服务 (依赖 3, 4, 5)
   ↓
7. 股票数据API (依赖 1, 2)
   ↓
8. AI决策API (依赖 1, 6)
   ↓
9. 验证 (依赖所有)
```

---

## 预计创建的文件

```
src/
├── lib/
│   ├── data/
│   │   ├── sina-api.ts      (新增)
│   │   └── cache.ts         (新增)
│   └── ai/
│       ├── client.ts        (新增)
│       ├── schema.ts        (新增)
│       ├── prompts.ts       (新增)
│       └── decision.ts      (新增)
└── app/
    └── api/
        ├── stock/
        │   └── data/
        │       └── route.ts (新增)
        └── ai/
            └── decision/
                └── route.ts (新增)
```
