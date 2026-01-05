# Phase 1: 项目初始化实施清单

> **目标**: 初始化 Next.js 项目，配置开发环境和数据库

---

## 实施清单

### 1. 初始化 Next.js 项目

**文件**: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`

**操作**:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

**验证**: 运行 `npm run dev` 确认项目启动成功，访问 `http://localhost:3000` 看到 Welcome 页面

---

### 2. 安装核心依赖

**操作**:
```bash
npm install ai @ai-sdk/openrouter drizzle-orm postgres drizzle-kit echarts echarts-for-react axios zod date-fns
```

**验证**: 检查 `package.json` 中包含所有依赖

---

### 3. 配置 TypeScript 类型定义

**文件**: `src/types/index.ts`

**创建内容**:
- `StockData` - 股票数据接口 `{code, date, open, high, low, close, volume}`
- `Trade` - 交易记录接口 `{id, model, stock, type, price, quantity, date, timestamp}`
- `Position` - 持仓接口 `{stock, quantity, buyDate, avgPrice}`
- `ModelAccount` - 模型账户接口 `{model, initialCapital, currentCapital, positions, trades, totalValue, profit}`
- `AIDecision` - AI决策记录接口

**验证**: 运行 `npx tsc --noEmit` 无 TypeScript 错误

---

### 4. 配置 Drizzle ORM

**文件**: `drizzle.config.ts`

**创建内容**:
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**验证**: 文件存在于项目根目录

---

### 5. 创建数据库 Schema

**文件**: `src/db/schema.ts`

**创建内容**:
- `trades` 表 - 交易记录
- `positions` 表 - 历史持仓快照
- `ai_decisions` 表 - AI操作记录
- `account_snapshots` 表 - 账户快照
- `live_trading_status` 表 - 实盘交易状态

**验证**: 运行 `npx drizzle-kit generate` 生成迁移文件

---

### 6. 创建环境变量文件

**文件**: `.env.local`

**创建内容**:
```env
OPENROUTER_API_KEY=your_api_key_here
NEXT_PUBLIC_SINA_API_BASE=https://hq.sinajs.cn
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

**验证**: 文件存在，格式正确

---

### 7. 更新 .gitignore

**文件**: `.gitignore`

**添加内容**:
```
.env.local
.env.*.local
*.log
.drizzle/
node_modules/.cache
```

**验证**: 运行 `git check-ignore .env.local` 确认被忽略

---

### 8. 创建数据库连接模块

**文件**: `src/lib/db/index.ts`

**创建内容**:
- 导入 `drizzle` 和 `postgres`
- 创建数据库连接
- 导出 `db` 实例
- 添加连接检查函数 `checkConnection()`

**验证**: 导出 `db` 实例，类型为 `DrizzleDB`

---

### 9. 创建数据库查询函数

**文件**: `src/lib/db/queries.ts`

**创建函数**:
- `saveTrade(data)` - 保存交易记录
- `savePositionSnapshot(data)` - 保存持仓快照
- `saveAIDecision(data)` - 保存AI决策
- `saveAccountSnapshot(data)` - 保存账户快照
- `getHistoryPositions(filters)` - 查询历史持仓
- `getAIDecisions(filters)` - 查询AI操作记录
- `getTrades(filters)` - 查询交易记录
- `getAccountSnapshots(filters)` - 查询账户快照

**验证**: 所有函数有正确的类型签名

---

### 10. 验证第一阶段完成

**检查项**:
- [ ] `npm run dev` 成功启动
- [ ] `npx drizzle-kit generate` 成功生成迁移
- [ ] TypeScript 编译无错误
- [ ] `.env.local` 配置完整
- [ ] 数据库连接测试通过

---

## 依赖关系

```
1. 初始化Next.js (无依赖)
   ↓
2. 安装依赖 (依赖 1)
   ↓
3. 类型定义 (依赖 1)
   ↓
4. Drizzle配置 (依赖 2)
   ↓
5. 数据库Schema (依赖 3, 4)
   ↓
6. 环境变量 (依赖 5)
   ↓
7. .gitignore更新 (依赖 6)
   ↓
8. 数据库连接 (依赖 5, 6)
   ↓
9. 数据库查询函数 (依赖 3, 8)
   ↓
10. 验证 (依赖所有)
```

---

## 预计创建的文件

```
llm-cg/
├── drizzle.config.ts          (新增)
├── .env.local                 (新增)
├── src/
│   ├── types/
│   │   └── index.ts           (新增)
│   ├── db/
│   │   └── schema.ts          (新增)
│   └── lib/
│       └── db/
│           ├── index.ts       (新增)
│           └── queries.ts     (新增)
```
