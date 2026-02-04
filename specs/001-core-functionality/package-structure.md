# 包结构设计 (Package Structure)

> 版本: 1.0
> 设计原则: constitution.md (简单性、测试先行、明确性)
> 核心原则: **高内聚、低耦合**

---

## 设计原则

### 1. 包内聚原则
每个包（目录）应该有**单一、明确的职责**，相关功能放在一起，无关功能分离。

### 2. 依赖方向
```
app/ (presentation) → components/ → lib/ (domain) ← db/ (infrastructure)
                                    ↓
                               types/ (shared)
```

### 3. 禁止事项
- 禁止循环依赖
- 禁止全局可变状态
- 禁止过度抽象（YAGNI）

---

## 目录结构总览

```
src/
├── app/                          # Next.js App Router (presentation + API routes)
│   ├── api/                      # API 路由
│   │   ├── auth/                 #   认证相关
│   │   ├── ai/                   #   AI 决策
│   │   ├── stock/                #   股票数据
│   │   ├── trading/              #   交易执行
│   │   ├── live/                 #   实盘交易管理
│   │   ├── history/              #   历史数据查询
│   │   ├── replay/               #   K 线回放
│   │   ├── leaderboard/          #   排行榜
│   │   └── portfolio/            #   组合数据 (现有)
│   ├── dashboard/                # 首页大屏
│   ├── live/                     #   实盘交易页 (现有)
│   ├── history/                  #   历史记录页 (现有)
│   └── login/                    #   登录页 (现有)
│
├── components/                   # React 组件
│   ├── dashboard/                #   大屏组件
│   │   ├── ai-card.tsx           #     AI 卡片
│   │   ├── asset-chart.tsx       #     资产曲线图
│   │   └── stats-panel.tsx       #     统计面板
│   ├── chat/                     #   AI 思考聊天窗口
│   │   ├── message-list.tsx      #     消息列表
│   │   ├── thinking-message.tsx  #     思考消息
│   │   └── trade-message.tsx     #     交易消息
│   ├── charts/                   #   图表组件 (现有)
│   ├── trading/                  #   交易相关组件
│   │   ├── stock-pool-manager.tsx#   股票池管理
│   │   ├── position-list.tsx     #     持仓列表
│   │   └── trade-record.tsx      #     交易记录
│   ├── replay/                   #   回放组件
│   │   ├── kline-chart.tsx       #     K 线图
│   │   └── replay-controls.tsx   #     控制条
│   └── ui/                       #   通用 UI 组件
│       ├── button.tsx
│       ├── modal.tsx
│       └── ...
│
├── lib/                          # 核心业务逻辑 (domain layer)
│   ├── ai/                       # AI 决策域 (现有)
│   │   ├── client.ts             #     OpenRouter 客户端
│   │   ├── decision.ts           #     决策生成
│   │   ├── prompts.ts            #     提示词模板
│   │   ├── schema.ts             #     Zod schema
│   │   └── agent.ts              #     AI 代理 (新增)
│   │
│   ├── trading/                  # 交易引擎域 (现有)
│   │   ├── engine.ts             #     交易执行核心
│   │   ├── rules.ts              #     T+1、涨跌停规则
│   │   ├── account.ts            #     账户管理
│   │   └── order.ts              #     订单模型 (新增)
│   │
│   ├── data/                     # 数据获取域 (现有)
│   │   ├── sina.ts               #     新浪 API 客户端
│   │   ├── cache.ts              #     缓存层
│   │   └── normalizer.ts         #     数据标准化 (新增)
│   │
│   ├── live/                     # 实盘交易域 (新增)
│   │   ├── manager.ts            #     多 AI 协调器
│   │   ├── scheduler.ts          #     定时调度
│   │   └── monitor.ts            #     状态监控
│   │
│   ├── replay/                   # 回放域 (新增)
│   │   ├── builder.ts            #     回放数据构建
│   │   ├── player.ts             #     回放控制器
│   │   └── events.ts             #     事件处理
│   │
│   ├── auth/                     # 认证域 (现有)
│   ├── portfolio/                # 组合计算 (现有)
│   ├── db/                       # 数据库访问 (现有)
│   └── mock/                     # Mock 数据 (现有，测试用)
│
├── db/                           # 数据库 Schema (现有)
│   └── schema.ts
│
├── types/                        # 共享类型定义 (现有)
│   └── index.ts
│
├── hooks/                        # React Hooks (现有)
│   ├── useRealtimePortfolio.ts
│   ├── useAIChat.ts              #   AI 聊天 (新增)
│   └── useReplay.ts              #   回放控制 (新增)
│
└── __tests__/                    # 测试文件
    ├── unit/                     #   单元测试
    ├── integration/              #   集成测试
    └── fixtures/                 #   测试数据
```

---

## 各包职责说明

### `lib/ai/` - AI 决策域
**职责**: 封装所有与 AI 决策相关的逻辑

| 文件 | 职责 | 依赖 |
|------|------|------|
| `client.ts` | OpenRouter API 客户端配置 | `ai` SDK |
| `schema.ts` | Zod 决策输出 schema 定义 | `zod` |
| `prompts.ts` | AI 提示词模板 | 无 |
| `decision.ts` | 决策生成核心逻辑 | `client.ts`, `schema.ts`, `prompts.ts` |
| `agent.ts` | AI 代理封装（状态+决策能力） | `decision.ts`, `lib/trading/` |

### `lib/trading/` - 交易引擎域
**职责**: 封装交易执行、规则校验、账户管理

| 文件 | 职责 | 依赖 |
|------|------|------|
| `engine.ts` | 交易执行核心逻辑 | `rules.ts`, `account.ts`, `lib/db/` |
| `rules.ts` | T+1、涨跌停、停牌规则校验 | `lib/data/` |
| `account.ts` | 账户状态管理（资金、持仓） | `types/` |
| `order.ts` | 订单模型与状态机 | `types/` |

### `lib/data/` - 数据获取域
**职责**: 封装外部数据源（新浪 API）访问

| 文件 | 职责 | 依赖 |
|------|------|------|
| `sina.ts` | 新浪 API 客户端 | `fetch` |
| `cache.ts` | 内存缓存 + 请求合并 | 无 |
| `normalizer.ts` | 数据格式标准化 | 无 |

### `lib/live/` - 实盘交易域
**职责**: 协调多个 AI 代理，管理实时交易流程

| 文件 | 职责 | 依赖 |
|------|------|------|
| `manager.ts` | 多 AI 协调器 | `lib/ai/agent.ts`, `scheduler.ts` |
| `scheduler.ts` | 定时调度（1-60s 可调） | 无 |
| `monitor.ts` | 状态监控与快照 | `lib/db/` |

### `lib/replay/` - 回放域
**职责**: K 线回放功能

| 文件 | 职责 | 依赖 |
|------|------|------|
| `builder.ts` | 从历史数据构建回放数据 | `lib/data/`, `lib/db/` |
| `player.ts` | 回放控制器（播放/暂停/跳转） | 无 |
| `events.ts` | 事件处理与同步 | 无 |

### `components/chat/` - AI 思考聊天
**职责**: 展示 AI 思考过程和决策结果

| 文件 | 职责 |
|------|------|
| `message-list.tsx` | 消息列表容器 |
| `thinking-message.tsx` | 思考消息组件（可折叠） |
| `trade-message.tsx` | 交易消息组件（高亮） |

### `components/trading/` - 交易相关组件
**职责**: 交易相关 UI 组件

| 文件 | 职责 |
|------|------|
| `stock-pool-manager.tsx` | 股票池管理界面 |
| `position-list.tsx` | 持仓列表展示 |
| `trade-record.tsx` | 交易记录表格 |

### `components/replay/` - 回放组件
**职责**: K 线回放 UI

| 文件 | 职责 |
|------|------|
| `kline-chart.tsx` | K 线图（集成回放事件标记） |
| `replay-controls.tsx` | 播放控制条 |

---

## 依赖规则

### 允许的依赖方向
```
app/          → components/
app/          → lib/
app/          → types/
components/   → lib/
components/   → types/
lib/ai/       → lib/trading/
lib/ai/       → lib/data/
lib/trading/  → lib/data/
lib/live/     → lib/ai/
lib/live/     → lib/trading/
lib/replay/   → lib/data/
lib/          → types/
lib/db/       → db/
```

### 禁止的依赖
```
lib/          → components/   (业务逻辑不依赖 UI)
lib/          → app/          (业务逻辑不依赖路由)
types/        → lib/          (类型定义不依赖业务逻辑)
```

---

## 文件命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件 | Pascal Case, `.tsx` | `AiCard.tsx` |
| 工具函数 | camel Case, `.ts` | `formatCurrency.ts` |
| 类型定义 | camel Case, `.ts` | `index.ts` (导出 type/interface) |
| 测试文件 | 同名 + `.test.ts` | `engine.test.ts` |
| Mock 文件 | `mock-*.ts` 或 `*.mock.ts` | `mock-data.ts` |

---

## 迁移计划

### 现有结构调整
现有代码基本符合结构，主要调整：

1. **新增 `lib/ai/agent.ts`**: AI 代理封装
2. **新增 `lib/live/` 目录**: 实盘交易协调
3. **新增 `lib/replay/` 目录**: K 线回放
4. **新增 `components/chat/` 目录**: AI 聊天组件
5. **新增 `components/trading/` 目录**: 交易组件
6. **新增 `components/replay/` 目录**: 回放组件

### 无需调整
- `src/app/api/portfolio/*` - 保留
- `src/components/charts/*` - 保留
- `src/components/dashboard/*` - 扩展
- `src/hooks/*` - 扩展

---

## 测试策略

### 单元测试 (`__tests__/unit/`)
- `lib/ai/decision.test.ts`
- `lib/trading/rules.test.ts`
- `lib/trading/engine.test.ts`
- `lib/data/cache.test.ts`

### 集成测试 (`__tests__/integration/`)
- `lib/live/manager.test.ts`
- `lib/replay/player.test.ts`
- API 路由测试

### Fixtures (`__tests__/fixtures/`)
- `stock-data.mock.ts`
- `ai-decisions.mock.ts`
- `trades.mock.ts`
