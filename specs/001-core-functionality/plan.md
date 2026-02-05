# A股 AI 交易模拟平台 - 技术实现方案

> 版本: 1.0  
> 基于: `spec.md` v1.0、`constitution.md`、`package-structure.md`、`api-sketch.md`  
> 状态: 待评审

---

## 1. 技术上下文总结

### 1.1 技术栈约束（必须遵循）

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 语言 | TypeScript (>= 5.x) | 严格模式，类型安全 |
| 前端框架 | Next.js 15+ (App Router) + React 19 | `src/app` 目录结构，服务端/客户端组件分离 |
| 样式 | Tailwind CSS 3.x | 与 `globals.css`、`tailwind.config.ts` 一致 |
| 图表 | ECharts + echarts-for-react | 资产曲线、分时图、K 线、回放 |
| 数据库 | PostgreSQL | 部署可选用 Supabase Cloud |
| ORM | Drizzle ORM | Schema 定义在 `src/db/schema.ts` |
| AI 服务 | OpenRouter API | 多模型（DeepSeek、Gemini 等），`ai` + `@openrouter/ai-sdk-provider` |
| 行情数据 | 新浪财经 API | 封装于 `lib/data/sina-api.ts`，配合 `lib/data/cache.ts` |
| 测试 | Vitest | 单元/集成测试，可与 Next.js 路由联调 |

### 1.2 架构原则

- **无状态 API**：API 路由无全局可变状态，依赖通过参数或服务层注入。
- **数据实时获取为主**：行情、分时、K 线以外部 API + 缓存为主；持久化仅用于用户、交易记录、快照、决策记录、回放事件等。
- **Markdown/文档**：规格与方案以 Markdown 维护，不引入额外文档框架。

### 1.3 与 Spec 的对应关系

- Spec 第 3 节（技术架构）中的模块划分、数据流、API 路由与本方案一致。
- 本方案在“项目结构细化”“核心数据结构”“接口设计”中落实 Spec 第 2 节功能需求与第 4 节边缘场景。

---

## 2. “合宪性”审查

以下逐条对照 `constitution.md`，确认本技术方案符合所有条款。

### 2.1 第一条：简单性原则 (Simplicity First)

| 条款 | 本方案中的落实 | 符合 |
|------|----------------|------|
| **1.1 (YAGNI)** | 仅实现 `spec.md` 中明确描述的功能；排行榜、回放、股票池管理等均按 Spec 范围实现，不提前做“策略回测”“多用户扩展”等未列需求。 | ✅ |
| **1.2 (标准库/框架优先)** | 优先使用 Next.js / React 标准能力与生态（fetch、React hooks、App Router）；第三方仅引入 Spec 指定的 ECharts、Drizzle、OpenRouter、新浪 API 等。 | ✅ |
| **1.3 (反过度工程)** | 业务逻辑以简单函数与数据结构为主；仅在多 AI 协调、回放控制等明确需要状态的地方引入类/管理器，不引入不必要的接口与继承体系。 | ✅ |

### 2.2 第二条：测试先行铁律 (Test-First Imperative)

| 条款 | 本方案中的落实 | 符合 |
|------|----------------|------|
| **2.1 (TDD 循环)** | 新功能与 Bug 修复均从“先写失败测试”开始，再实现逻辑，最后重构；CI 中默认运行 `pnpm test`。 | ✅ |
| **2.2 (表格驱动)** | 单元测试优先采用“参数化/表格驱动”风格：`describe` + 用例数组（输入、期望输出、边界），例如 `lib/trading/rules.test.ts`、`lib/ai/decision.test.ts`。 | ✅ |
| **2.3 (优先集成测试)** | 在可行且不依赖不可控外部服务的前提下，优先用真实依赖做集成测试（如交易引擎 + 内存/测试 DB）；Mock 仅用于外部 HTTP（新浪、OpenRouter）或难以复现的场景。 | ✅ |

### 2.3 第三条：明确性原则 (Clarity and Explicitness)

| 条款 | 本方案中的落实 | 符合 |
|------|----------------|------|
| **3.1 (错误处理)** | 所有异步错误显式处理：API 路由使用 try/catch 并返回明确 HTTP 状态与错误体；底层函数通过 `throw` 或 `Result` 风格返回，错误传递时包装上下文（如 `new Error('...', { cause })`）。不吞掉错误、不仅打 log 不返回。 | ✅ |
| **3.2 (无全局变量)** | 不在模块顶层维护可变全局状态；多 AI 协调器、调度器等通过依赖注入（构造函数或工厂）获取；请求级状态仅存在于 Next.js 请求上下文或 React 状态中。 | ✅ |

### 2.4 治理 (Governance)

- 本技术方案服从 `constitution.md` 的最高优先级；若与单次会话或其它文档冲突，以宪法为准。

---

## 3. 项目结构细化

### 3.1 目录与职责总览

```
src/
├── app/                    # 展示层 + API 路由
│   ├── api/                # 后端 API（见 3.2）
│   ├── dashboard/         # 首页大屏（待建）
│   ├── live/               # 实盘交易页（已有）
│   ├── history/            # 历史记录页（已有）
│   ├── login/              # 登录页（已有）
│   └── ...
├── components/             # React 组件（见 3.3）
├── lib/                    # 领域与基础设施（见 3.4）
├── db/                     # Drizzle Schema（已有）
├── types/                  # 共享类型（已有，扩展）
└── hooks/                  # React Hooks（已有，扩展）
```

### 3.2 API 路由职责与依赖

| 路由 | 方法 | 职责 | 主要依赖 |
|------|------|------|----------|
| `api/auth/login` | POST | 登录，写 session | `lib/auth` |
| `api/auth/logout` | POST | 登出 | `lib/auth` |
| `api/auth/session` | GET | 当前会话 | `lib/auth` |
| `api/stock/data` | GET | 股票数据（实时/K 线/分时） | `lib/data` |
| `api/stock/search` | GET | 股票搜索 | `lib/data`（待接搜索能力） |
| `api/ai/decision` | POST | 单次 AI 决策 | `lib/ai/decision` |
| `api/portfolio/value` | GET | 组合价值 | `lib/portfolio` |
| `api/portfolio/intraday` | GET | 分时 | `lib/portfolio` + `lib/data` |
| `api/portfolio/realtime` | GET | 实时组合 | `lib/portfolio` |
| `api/live/start` | POST | 启动实盘 | `lib/live/manager` |
| `api/live/stop` | POST | 停止实盘 | `lib/live/manager` |
| `api/live/status` | GET | 实盘状态 | `lib/live/manager` |
| `api/history/trades` | GET | 交易历史 | `lib/db/queries` |
| `api/history/decisions` | GET | 决策历史 | `lib/db/queries` |
| `api/history/positions` | GET | 持仓历史 | `lib/db/queries` |
| `api/replay/start` | POST | 启动回放 | `lib/replay`（待建） |
| `api/replay/data` | GET | 回放数据 | `lib/replay` |
| `api/leaderboard` | GET | 排行榜 | `lib/db/queries` + 聚合逻辑 |

### 3.3 组件包职责

| 包/目录 | 职责 | 关键文件（含待建） |
|---------|------|--------------------|
| `components/dashboard/` | 首页大屏 | `AiCard`、资产曲线图、统计面板 |
| `components/chat/` | AI 思考流 | 消息列表、思考消息（可折叠）、交易消息 |
| `components/charts/` | 图表 | 已有；扩展分时、K 线、回放标记 |
| `components/trading/` | 交易相关 UI | 股票池管理、持仓列表、交易记录表 |
| `components/replay/` | 回放 UI | K 线图 + 回放事件、播放控制条 |
| `components/ui/` | 通用 UI | 按钮、弹窗等（按需） |

### 3.4 核心 lib 包职责与依赖关系

- **依赖方向**：`app` → `components` → `lib`；`lib` 内部仅允许 `lib/ai` → `lib/trading`、`lib/data`，`lib/live` → `lib/ai`、`lib/trading`，`lib/replay` → `lib/data`、`lib/db`；`lib` 不依赖 `components` 或 `app`。

| 包 | 职责 | 对外暴露 | 依赖 |
|----|------|----------|------|
| `lib/data/` | 新浪 API 封装、缓存、请求合并、数据标准化 | `getRealtimeQuote`、`getKLineData`、`getIntradayData`、`searchStock`、cache/merge | 无（仅 types） |
| `lib/ai/` | OpenRouter 客户端、决策 Schema、提示词、决策生成、AI 代理封装 | `makeDecision`、`AIAgent`、Zod schema | `lib/data`、`lib/trading`、types |
| `lib/trading/` | 规则校验（T+1、涨跌停、停牌、仓位）、交易执行、账户/订单 | `executeTrade`、`validateTrade`、rules、Account/Position | `lib/data`、`lib/db`、types |
| `lib/live/` | 多 AI 协调、定时调度、状态监控与快照 | `LiveTradingManager` | `lib/ai`、`lib/trading`、`lib/db` |
| `lib/replay/` | 回放数据构建、播放控制、事件同步 | 回放数据 API、Player 状态 | `lib/data`、`lib/db` |
| `lib/portfolio/` | 组合价值、分时、实时计算 | 现有逻辑 | `lib/data`、`lib/db` |
| `lib/auth/` | 登录、会话、鉴权 | 现有逻辑 | `lib/db` |
| `lib/db/` | Drizzle 连接、通用 queries | 现有逻辑 | `db/schema` |

---

## 4. 核心数据结构

以下结构在模块间流转，并需与 Spec 2.2.5、2.3、2.7 等字段一致；与 DB 的对应见 4.2。

### 4.1 领域类型（TypeScript）

- **股票与行情**  
  - `StockData`：日 K OHLCV + code/name/date。  
  - `RealtimeQuote`：当前价、开高低、昨收、买卖一档、量、涨停/跌停/停牌标记、时间戳。  
  - `IntradayPoint`：timestamp、price、volume。

- **AI**  
  - `AIModel`：id、name、provider、modelId、enabled。  
  - `AIDecision`：`action: 'buy'|'sell'|'hold'`；可选 `stock`、`quantity`；必填 `reason`；可选 `confidence`、`timestamp`。  
  - `AIMessage`：id、agentId、type（thinking/decision/execution）、content、data、timestamp。

- **交易与账户**  
  - `Position`：stock、stockName、quantity、avgPrice、currentPrice、marketValue、profit、profitRate、buyDate、availableToday。  
  - `Account`：agentId、initialCapital、cash、positions、totalValue、marketValue、profit、profitRate、dailyProfit、dailyProfitRate。  
  - `Trade`：id、agentId、stock、stockName、type、price、quantity、amount、date、timestamp、reason、status（success/failed）、error？。

- **配置与池**  
  - `TradingConfig`：thinkInterval、initialCapital、maxPositionRatio、tradingHours。  
  - `StockPool`：userId、stocks、updatedAt。

- **回放**  
  - `ReplayEvent`：id、timestamp、type、agentId？、data。  
  - `ReplayState`：isPlaying、currentTime、speed、events、currentEventIndex。

- **决策输入（AI 用）**  
  - `DecisionInput`：realtimeQuotes、klineData、intradayData、account、config、currentTime。

以上字段覆盖 Spec 中的“决策输出”“交易记录”“AI 卡片”“排行榜”等所需字段；具体签名以 `src/types/index.ts` 与 `api-sketch.md` 为准。

### 4.2 与数据库 Schema 的对应

- `trades`：对应 `Trade`；当前 schema 使用 `model` 表示 AI，与类型中 `agentId` 在应用层做映射。  
- `positions`：对应持仓快照，可派生 `Position`。  
- `ai_decisions`：对应 `AIDecision` + 执行结果；input/output/execution 用 jsonb。  
- `account_snapshots`：对应 `Account` 快照；positionsData 存 Position[]。  
- `live_trading_status`：实盘开关与最后决策时间；按 `model` 维度的状态。  
- `portfolio_series_points` / `stock_intraday_points` / `portfolio_events`：资产曲线、分时、回放事件。

新增表仅在有明确 Spec 需求时增加（如用户级股票池表），避免 YAGNI。

---

## 5. 接口设计

### 5.1 数据层（lib/data）

- `getRealtimeQuote(codes: string[]): Promise<Map<string, RealtimeQuote>>`  
- `getKLineData(code: string, startDate: string, endDate: string): Promise<StockData[]>`  
- `getIntradayData(code: string, date: string): Promise<IntradayPoint[]>`  
- `searchStock(query: string): Promise<Array<{ code, name, market }>>`（待接上游 API）  
- 缓存：`get/set/mergeRequest`、统一 cache key 策略（见 api-sketch）。

### 5.2 AI 层（lib/ai）

- `makeDecision(model: AIModel, input: DecisionInput): Promise<AIDecision>`  
- `saveDecision(decision, input, result): Promise<void>`  
- `AIAgent`：构造(id, model, initialCapital, config)；`think(marketData)`；`getAccount()`；`updateAccount(trade)`；`reset(initialCapital)`。

### 5.3 交易层（lib/trading）

- `executeTrade(agentId: string, decision: AIDecision, quote: RealtimeQuote): Promise<Trade>`  
- `validateTrade(account, decision, quote): { valid: boolean; reason?: string }`  
- 规则函数：`isTradingTime`、`isSellable`、`isLimitUp`、`isLimitDown`、`calcLimitPrice`、`checkPositionLimit`。

### 5.4 实盘层（lib/live）

- `LiveTradingManager`：构造(config: { agents, stockPool, thinkInterval })；`start()`/`stop()`；`pauseAgent(id)`/`resumeAgent(id)`；`getAgentsStatus()`。  
- 内部依赖：`AIAgent`、调度器（1–60s 可调）、交易引擎、DB 写入决策与快照。

### 5.5 回放层（lib/replay，待建）

- 按日期构建回放数据：K 线 + 决策/成交事件（从 `portfolio_events`、`ai_decisions`、`trades` 等聚合）。  
- 对外提供：回放数据查询接口、播放状态（currentTime、speed、events、currentEventIndex），供 API 与前端控制条使用。

### 5.6 API 路由契约

- 所有 API 返回 JSON；错误时统一结构如 `{ error: string; code?: string }`，并设置合适 HTTP 状态码。  
- 需鉴权的路由从 session 取 userId，与 `users` 表及“用户数据隔离”一致。  
- 列表类接口支持分页（page/size 或 cursor），避免单次过大 payload。

---

## 6. 实施顺序建议

1. **数据与类型**：在 `types/index.ts` 中补齐/统一 4.1 中的类型；如需股票搜索，在 `lib/data` 中预留接口并在有明确 API 后实现。  
2. **交易与规则**：巩固 `lib/trading/rules` 与 `engine`，补全 T+1、涨跌停、停牌、单票仓位校验及测试。  
3. **AI 决策与代理**：在现有 `lib/ai/decision` 基础上增加 `DecisionInput` 组装与 `AIAgent`，并与交易引擎联调。  
4. **实盘管理**：实现 `lib/live/manager` 与 `scheduler`，接 API `/api/live/*`。  
5. **首页大屏**：Dashboard 布局、资产曲线、AI 卡片、底部统计（今日操作、胜率、最大回撤）。  
6. **群聊窗口**：AI 思考流消息列表、折叠与过滤。  
7. **交易记录与历史**：确保 `api/history/*` 与 Spec 2.7 字段一致，并做每分钟快照。  
8. **股票池与排行榜**：股票池 CRUD、排行榜 API（收益/今日/胜率/回撤）。  
9. **回放**：回放数据构建与 API、前端 K 线与控制条。  
10. **边缘场景**：非交易时间、节假日、API 超时/降级、涨跌停失败反馈、AI 超时与重试（见 Spec 4）。

---

## 7. 文档与模板说明

- 本方案未依赖 `.claude/templates/plan-template.md`（当前不存在），结构按“技术上下文 → 合宪性审查 → 项目结构 → 核心数据 → 接口设计”组织，便于评审与迭代。  
- 后续若引入 plan 模板，可将本节与上述章节对齐到模板占位符。

---

*文档结束*
