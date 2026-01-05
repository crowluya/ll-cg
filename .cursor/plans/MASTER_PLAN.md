# A股AI交易模拟平台 - 总体实施计划

> 本文件汇总所有阶段的实施清单，按依赖顺序排列

---

## 项目概览

| 项目 | 内容 |
|------|------|
| **名称** | A股AI交易模拟平台 |
| **技术栈** | Next.js 16.1 + TypeScript + Tailwind CSS + Drizzle ORM + OpenRouter |
| **数据源** | 新浪财经 API |
| **AI 服务** | OpenRouter (DeepSeek, Gemini, Claude) |
| **数据库** | PostgreSQL (Supabase) |

---

## 阶段总览

```
Phase 1: 项目初始化 (10项)
    ↓
Phase 2: 数据模块与AI服务 (9项)
    ↓
Phase 3: 交易引擎与回测系统 (8项)
    ↓
Phase 4: 前端页面与实盘交易 (15项)
```

---

## Phase 1: 项目初始化

**文件**: `.cursor/plans/phase1-init.plan.md`

| 序号 | 任务 | 文件 |
|------|------|------|
| 1 | 初始化 Next.js 项目 | `package.json`, `next.config.ts` |
| 2 | 安装核心依赖 | `package.json` |
| 3 | 配置 TypeScript 类型 | `src/types/index.ts` |
| 4 | 配置 Drizzle ORM | `drizzle.config.ts` |
| 5 | 创建数据库 Schema | `src/db/schema.ts` |
| 6 | 创建环境变量文件 | `.env.local` |
| 7 | 更新 .gitignore | `.gitignore` |
| 8 | 创建数据库连接模块 | `src/lib/db/index.ts` |
| 9 | 创建数据库查询函数 | `src/lib/db/queries.ts` |
| 10 | 验证 | - |

---

## Phase 2: 数据模块与AI服务

**文件**: `.cursor/plans/phase2-data-ai.plan.md`

| 序号 | 任务 | 文件 |
|------|------|------|
| 1 | 新浪财经 API 封装 | `src/lib/data/sina-api.ts` |
| 2 | 数据缓存模块 | `src/lib/data/cache.ts` |
| 3 | OpenRouter 配置 | `src/lib/ai/client.ts` |
| 4 | AI 决策 Schema 定义 | `src/lib/ai/schema.ts` |
| 5 | AI 提示词模板 | `src/lib/ai/prompts.ts` |
| 6 | AI 决策服务 | `src/lib/ai/decision.ts` |
| 7 | 创建股票数据 API | `src/app/api/stock/data/route.ts` |
| 8 | 创建 AI 决策 API | `src/app/api/ai/decision/route.ts` |
| 9 | 验证 | - |

---

## Phase 3: 交易引擎与回测系统

**文件**: `.cursor/plans/phase3-trading.plan.md`

| 序号 | 任务 | 文件 |
|------|------|------|
| 1 | T+1 规则实现 | `src/lib/trading/rules.ts` |
| 2 | 交易引擎核心 | `src/lib/trading/engine.ts` |
| 3 | 模型账户管理 | `src/lib/trading/account.ts` |
| 4 | 回测执行器 | `src/lib/backtest/runner.ts` |
| 5 | 回测 API | `src/app/api/backtest/run/route.ts` |
| 6 | 交易记录持久化 | `src/lib/trading/persistence.ts` |
| 7 | 回测报告生成 | `src/lib/backtest/report.ts` |
| 8 | 验证 | - |

---

## Phase 4: 前端页面与实盘交易

**文件**: `.cursor/plans/phase4-frontend.plan.md`

| 序号 | 任务 | 文件 |
|------|------|------|
| 1 | 主页面组件 | `src/app/page.tsx` |
| 2 | 股票选择器组件 | `src/components/StockSelector.tsx` |
| 3 | 模型选择器组件 | `src/components/ModelSelector.tsx` |
| 4 | K 线图组件 | `src/components/KLineChart.tsx` |
| 5 | 回测结果页面 | `src/app/results/page.tsx` |
| 6 | 盈亏卡片组件 | `src/components/ProfitCard.tsx` |
| 7 | 交易记录表格组件 | `src/components/TradeTable.tsx` |
| 8 | 资金曲线图组件 | `src/components/FundCurveChart.tsx` |
| 9 | 实盘交易管理器 | `src/lib/live-trading/manager.ts` |
| 10 | 实盘交易 API | `src/app/api/live/*/route.ts` |
| 11 | 实盘交易页面 | `src/app/live/page.tsx` |
| 12 | 历史记录 API | `src/app/api/history/*/route.ts` |
| 13 | 历史记录页面 | `src/app/history/page.tsx` |
| 14 | 根布局更新 | `src/app/layout.tsx` |
| 15 | 验证 | - |

---

## 总任务统计

| 阶段 | 任务数 |
|------|--------|
| Phase 1 | 10 |
| Phase 2 | 9 |
| Phase 3 | 8 |
| Phase 4 | 15 |
| **总计** | **42** |

---

## 实施顺序建议

1. **第一批**: Phase 1 (1-10) - 搭建基础框架
2. **第二批**: Phase 2 (1-9) - 数据和 AI 能力
3. **第三批**: Phase 3 (1-8) - 核心交易逻辑
4. **第四批**: Phase 4 (1-15) - 用户界面和实盘

---

## 验收标准

### Phase 1 完成标准
- [x] Next.js 项目可正常启动
- [x] 数据库连接成功
- [x] Drizzle 迁移可正常生成

### Phase 2 完成标准
- [x] 可获取股票数据
- [x] AI 可返回有效决策
- [x] API 可正常调用

### Phase 3 完成标准
- [x] T+1 规则正确执行
- [x] 回测可完成完整流程
- [x] 交易记录正确保存

### Phase 4 完成标准
- [x] 所有页面可正常访问
- [x] 实盘交易可正常运行
- [x] 历史数据可正常查询
