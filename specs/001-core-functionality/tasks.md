# A股 AI 交易模拟平台 - 任务列表

> 基于: `spec.md` v1.0、`plan.md` v1.0、`constitution.md`
> 状态: 待执行
> 更新日期: 2025-02-05

---

## 任务说明

- **[P]** 标记表示可并行执行的任务（无依赖关系）
- **TDD** 遵循测试先行原则：每个实现任务前都有对应的测试任务
- 任务按 Phase 组织，Phase 内按编号顺序执行
- 每个任务仅涉及一个主要文件

---

## Phase 1: 基础类型与数据结构补全

### 1.1 [P] 测试: 扩展类型定义
- **文件**: `src/types/index.ts`
- **内容**:
  - 添加 `RealtimeQuote` 接口（当前价、买卖五档、成交量、涨停/跌停/停牌标记）
  - 添加 `IntradayPoint` 接口（timestamp、price、volume）
  - 添加 `AIModel` 接口（id、name、provider、modelId、enabled）
  - 添加 `AIMessage` 接口（id、agentId、type、content、data、timestamp）
  - 添加 `TradingConfig` 接口（thinkInterval、initialCapital、maxPositionRatio、tradingHours）
  - 添加 `StockPool` 接口（userId、stocks、updatedAt）
  - 添加 `ReplayEvent` 和 `ReplayState` 接口
  - 添加 `DecisionInput` 扩展（realtimeQuotes、klineData、intradayData、account、config、currentTime）

### 1.2 实现: 扩展类型定义
- **文件**: `src/types/index.ts`
- **依赖**: 1.1
- **内容**: 实现 1.1 中定义的所有接口

### 1.3 [P] 测试: 数据库 schema 补全
- **文件**: `src/db/schema.ts`
- **内容**:
  - 验证现有表结构完整性
  - 确认 `users` 表有 `stockPool` jsonb 字段（用于用户股票池配置）
  - 确认 `trades` 表有 `reason` 和 `stockName` 字段
  - 验证枚举类型定义正确

### 1.4 实现: 数据库 schema 补全
- **文件**: `src/db/schema.ts`
- **依赖**: 1.3
- **内容**: 根据 1.3 测试结果，补全缺失字段

---

## Phase 2: 数据服务层增强（TDD）

### 2.1 [P] 测试: 实时行情数据结构
- **文件**: `src/lib/data/sina-api.test.ts`
- **内容**:
  - 测试 `fetchRealtimeData` 返回包含涨停/跌停标记
  - 测试买卖五档数据解析（如果新浪 API 支持）
  - 测试停牌标记检测

### 2.2 实现: 扩展实时行情数据结构
- **文件**: `src/lib/data/sina-api.ts`
- **依赖**: 2.1
- **内容**:
  - 扩展 `fetchRealtimeData` 返回类型包含 `isLimitUp`、`isLimitDown`、`isSuspended`
  - 添加买卖五档解析（如 `bid1-5`、`ask1-5`、`bidVol1-5`、`askVol1-5`）
  - 实现 `isLimitUp`、`isLimitDown` 检测函数
  - 实现 `calcLimitPrice` 涨跌停价计算函数

### 2.3 [P] 测试: 股票搜索功能
- **文件**: `src/lib/data/sina-api.test.ts`
- **内容**:
  - 测试 `searchStock` 函数按代码搜索
  - 测试 `searchStock` 函数按名称搜索
  - 测试空结果处理
  - 测试特殊字符处理

### 2.4 实现: 股票搜索功能
- **文件**: `src/lib/data/sina-api.ts`
- **依赖**: 2.3
- **内容**:
  - 实现 `searchStock(query: string): Promise<Array<{ code, name, market }>>`
  - 如果新浪 API 不支持搜索，使用本地常量列表（暂时方案）
  - 添加搜索结果缓存

### 2.5 [P] 测试: 分时数据获取
- **文件**: `src/lib/data/sina-api.test.ts`
- **内容**:
  - 测试 `getIntradayData` 返回分钟级数据
  - 测试数据按时间排序
  - 测试空数据/非交易日处理

### 2.6 实现: 分时数据获取
- **文件**: `src/lib/data/sina-api.ts`
- **依赖**: 2.5
- **内容**:
  - 实现 `getIntradayData(code: string, date: string): Promise<IntradayPoint[]>`
  - 使用缓存层避免重复请求
  - 统一返回格式（`{ timestamp, price, volume }`）

### 2.7 [P] 测试: 请求合并与缓存
- **文件**: `src/lib/data/cache.test.ts`
- **内容**:
  - 测试相同 key 的并发请求合并
  - 测试缓存 TTL 正确生效
  - 测试缓存清理机制

### 2.8 实现: 请求合并机制
- **文件**: `src/lib/data/cache.ts`
- **依赖**: 2.7
- **内容**:
  - 添加 `mergeRequest<T>(key: string, fn: () => Promise<T>): Promise<T>` 函数
  - 使用 Map 存储进行中的请求
  - 防止新浪 API 限流

---

## Phase 3: 交易规则增强（TDD）

### 3.1 [P] 测试: 涨跌停检测
- **文件**: `src/lib/trading/rules.test.ts`
- **内容**:
  - 测试 `isLimitUp` 函数（价格=涨停价）
  - 测试 `isLimitDown` 函数（价格=跌停价）
  - 测试 `calcLimitPrice` 涨跌停价计算（主板10%、创业板20%）
  - 表格驱动测试多只股票

### 3.2 实现: 涨跌停检测与计算
- **文件**: `src/lib/trading/rules.ts`
- **依赖**: 3.1
- **内容**:
  - 实现 `isLimitUp(price: number, prevClose: number, market: string): boolean`
  - 实现 `isLimitDown(price: number, prevClose: number, market: string): boolean`
  - 实现 `calcLimitPrice(prevClose: number, market: string, direction: 'up' | 'down'): number`
  - 根据市场返回不同涨跌幅（沪深主板10%、创业板20%、科创板20%）

### 3.3 [P] 测试: 停牌检测
- **文件**: `src/lib/trading/rules.test.ts`
- **内容**:
  - 测试 `isSuspended` 函数（成交量=0且价格不变）
  - 测试停牌状态下交易被拒绝

### 3.4 实现: 停牌检测
- **文件**: `src/lib/trading/rules.ts`
- **依赖**: 3.3
- **内容**:
  - 实现 `isSuspended(quote: RealtimeQuote): boolean`
  - 在 `validateBuyOrder` 和 `validateSellOrder` 中集成停牌检测

### 3.5 [P] 测试: 单票持仓上限
- **文件**: `src/lib/trading/rules.test.ts`
- **内容**:
  - 测试 `checkPositionLimit` 函数
  - 测试买入后不超过总资金的 50%
  - 测试加仓场景

### 3.6 实现: 单票持仓上限
- **文件**: `src/lib/trading/rules.ts`
- **依赖**: 3.5
- **内容**:
  - 实现 `checkPositionLimit(account, newBuyValue, maxRatio = 0.5): { valid, reason }`
  - 在 `validateBuyOrder` 中集成持仓上限检查

### 3.7 [P] 测试: 交易日历
- **文件**: `src/lib/trading/rules.test.ts`
- **内容**:
  - 测试 `isTradingDay` 正确识别周末
  - 测试 `getTradingDays` 返回正确的交易日列表
  - 表格驱动测试节假日（先简单实现，TODO: 接入外部 API）

### 3.8 实现: 交易日历功能
- **文件**: `src/lib/trading/rules.ts`
- **依赖**: 3.7
- **内容**:
  - 扩展 `isTradingDay` 支持传入节假日列表
  - 扩展 `getTradingDays` 过滤节假日
  - 添加 `getTradingDateRange(startDate, endDate)` 辅助函数

---

## Phase 4: AI 决策层（TDD）

### 4.1 [P] 测试: AI 代理类基础
- **文件**: `src/lib/ai/agent.test.ts`
- **内容**:
  - 测试 `AIAgent` 构造函数
  - 测试 `think(marketData)` 方法调用决策函数
  - 测试 `getAccount()` 返回当前账户状态
  - 测试 `updateAccount(trade)` 更新账户

### 4.2 实现: AI 代理类
- **文件**: `src/lib/ai/agent.ts`
- **依赖**: 4.1
- **内容**:
  - 创建 `AIAgent` 类
  - 构造函数: `constructor(id, model, initialCapital, config)`
  - 方法: `think(marketData: MarketData): Promise<AIDecision>`
  - 方法: `getAccount(): Account`
  - 方法: `updateAccount(trade: Trade): void`
  - 方法: `reset(initialCapital): void`

### 4.3 [P] 测试: 决策输入组装
- **文件**: `src/lib/ai/decision.test.ts`
- **内容**:
  - 测试 `buildDecisionInput` 组装实时行情、分时数据、K线、账户、配置
  - 测试数据按优先级排序
  - 测试缺失数据的降级处理

### 4.4 实现: 决策输入组装
- **文件**: `src/lib/ai/decision.ts`
- **依赖**: 4.3
- **内容**:
  - 实现 `buildDecisionInput(params): DecisionInput`
  - 集成 `getRealtimeQuote`、`getIntradayData`、`getKLineData`
  - 添加数据缺失时的降级策略

### 4.5 [P] 测试: 决策输出验证增强
- **文件**: `src/lib/ai/schema.test.ts`
- **内容**:
  - 测试 `decisionSchema` 验证买入必须包含 stock 和 quantity
  - 测试卖出决策验证
  - 测试 `confidence` 字段范围

### 4.6 实现: 决策输出验证增强
- **文件**: `src/lib/ai/schema.ts`
- **依赖**: 4.5
- **内容**:
  - 增强 `decisionSchema` 使用 `refine` 添加条件验证
  - 添加 `validateDecisionWithContext` 函数结合上下文验证

### 4.7 [P] 测试: 决策记录保存
- **文件**: `src/lib/ai/decision.test.ts`
- **内容**:
  - 测试 `saveDecisionRecord` 写入 `ai_decisions` 表
  - 测试执行结果正确记录
  - 测试错误信息保存

### 4.8 实现: 决策记录保存
- **文件**: `src/lib/ai/decision.ts`
- **依赖**: 4.7
- **内容**:
  - 实现 `saveDecisionRecord(decision, input, result): Promise<string>`
  - 集成 `saveAIDecision` 数据库函数
  - 添加错误处理

---

## Phase 5: 实盘交易管理（TDD）

### 5.1 [P] 测试: 调度器基础
- **文件**: `src/lib/live/scheduler.test.ts`
- **内容**:
  - 测试 `TradingScheduler` 构造函数
  - 测试 `start(interval)` 启动定时任务
  - 测试 `stop()` 停止定时任务
  - 测试 `pause()` / `resume()` 暂停恢复

### 5.2 实现: 调度器
- **文件**: `src/lib/live/scheduler.ts`
- **依赖**: 5.1
- **内容**:
  - 创建 `TradingScheduler` 类
  - 使用 `setInterval` 实现可配置间隔（1-60秒）
  - 支持暂停/恢复
  - 支持交易时间检查（非交易时间自动跳过）

### 5.3 [P] 测试: 实盘管理器基础
- **文件**: `src/lib/live/manager.test.ts`
- **内容**:
  - 测试 `LiveTradingManager` 构造函数
  - 测试 `start()` 启动所有 AI 代理
  - 测试 `stop()` 停止所有代理
  - 测试 `pauseAgent(id)` / `resumeAgent(id)` 单个代理控制

### 5.4 实现: 实盘管理器
- **文件**: `src/lib/live/manager.ts`
- **依赖**: 5.3
- **内容**:
  - 创建 `LiveTradingManager` 类
  - 构造: `constructor(config: { agents, stockPool, thinkInterval })`
  - 方法: `start(): Promise<void>` 启动调度器
  - 方法: `stop(): void` 停止调度器
  - 方法: `pauseAgent(agentId): void` 暂停单个代理
  - 方法: `resumeAgent(agentId): void` 恢复单个代理
  - 方法: `getAgentsStatus(): AgentStatus[]` 获取状态

### 5.5 [P] 测试: 实盘状态持久化
- **文件**: `src/lib/live/manager.test.ts`
- **内容**:
  - 测试 `saveLiveStatus` 写入 `live_trading_status` 表
  - 测试 `loadLiveStatus` 恢复状态
  - 测试最后决策时间更新

### 5.6 实现: 实盘状态持久化
- **文件**: `src/lib/live/manager.ts`
- **依赖**: 5.5
- **内容**:
  - 集成 `upsertLiveTradingStatus`
  - 在每次决策后更新 `lastDecisionTime`
  - 在启动时加载并恢复状态

### 5.7 [P] 测试: 定时快照
- **文件**: `src/lib/live/manager.test.ts`
- **内容**:
  - 测试每分钟保存账户快照
  - 测试快照写入 `account_snapshots` 表
  - 测试快照时间戳正确

### 5.8 实现: 定时快照
- **文件**: `src/lib/live/manager.ts`
- **依赖**: 5.7
- **内容**:
  - 在 `LiveTradingManager` 中集成定时快照
  - 每分钟调用 `saveAllAccountSnapshots`

---

## Phase 6: API 路由实现

### 6.1 [P] 测试: 股票数据 API
- **文件**: `src/app/api/stock/data/route.test.ts`
- **内容**:
  - 测试 GET 返回股票实时数据
  - 测试参数验证（codes 必填）
  - 测试缓存生效

### 6.2 实现: 股票数据 API
- **文件**: `src/app/api/stock/data/route.ts`
- **依赖**: 6.1
- **内容**:
  - 实现已存在的 `/api/stock/data` 路由（如需修改）
  - 支持查询参数 `codes=sh600519,sz000001`
  - 返回 `Map<string, RealtimeQuote>`

### 6.3 [P] 测试: 股票搜索 API
- **文件**: `src/app/api/stock/search/route.test.ts`
- **内容**:
  - 测试 GET 返回搜索结果
  - 测试 `q` 参数必填
  - 测试空结果返回

### 6.4 实现: 股票搜索 API
- **文件**: `src/app/api/stock/search/route.ts`
- **依赖**: 6.3
- **内容**:
  - 创建 `/api/stock/search` 路由
  - 查询参数 `q` 搜索关键词
  - 调用 `searchStock` 函数

### 6.5 [P] 测试: 实盘控制 API
- **文件**: `src/app/api/live/start/route.test.ts`, `src/app/api/live/stop/route.test.ts`
- **内容**:
  - 测试 POST `/api/live/start` 启动实盘
  - 测试 POST `/api/live/stop` 停止实盘
  - 测试参数验证

### 6.6 实现: 实盘控制 API
- **文件**: `src/app/api/live/start/route.ts`, `src/app/api/live/stop/route.ts`
- **依赖**: 6.5
- **内容**:
  - 创建 `/api/live/start` 路由，调用 `LiveTradingManager.start()`
  - 创建 `/api/live/stop` 路由，调用 `LiveTradingManager.stop()`
  - 创建 `/api/live/status` 路由，返回当前状态

### 6.7 [P] 测试: 排行榜 API
- **文件**: `src/app/api/leaderboard/route.test.ts`
- **内容**:
  - 测试 GET 返回排行榜数据
  - 测试 `type` 参数（收益/今日/胜率/回撤）
  - 测试分页参数

### 6.8 实现: 排行榜 API
- **文件**: `src/app/api/leaderboard/route.ts`
- **依赖**: 6.7
- **内容**:
  - 创建 `/api/leaderboard` 路由
  - 查询参数: `type=profit|today|winrate|drawdown`
  - 计算并返回排序后的结果

### 6.9 [P] 测试: 历史决策 API
- **文件**: `src/app/api/history/decisions/route.test.ts`
- **内容**:
  - 测试 GET 返回决策历史
  - 测试 `model` 和 `stock` 过滤
  - 测试分页

### 6.10 实现: 历史决策 API
- **文件**: `src/app/api/history/decisions/route.ts`
- **依赖**: 6.9
- **内容**:
  - 实现已存在的路由（如需修改）
  - 返回包含思考过程和决策结果

---

## Phase 7: 前端组件 - Dashboard

### 7.1 [P] 测试: AI 卡片数据
- **文件**: `src/components/dashboard/AiCard.test.tsx`
- **内容**:
  - 测试组件接收 Account props 正确渲染
  - 测试收益率颜色（红涨绿跌）
  - 测试持仓列表展示

### 7.2 实现: AI 卡片组件
- **文件**: `src/components/dashboard/AiCard.tsx`
- **依赖**: 7.1
- **内容**:
  - 创建 `AiCard` 组件
  - Props: `model`, `account`, `onClick?`
  - 显示: 总资产、今日盈亏、累计盈亏、当前持仓
  - 排序: 按收益率

### 7.3 [P] 测试: 资产曲线图
- **文件**: `src/components/dashboard/PortfolioChart.test.tsx`
- **内容**:
  - 测试 ECharts 配置正确
  - 测试多线数据渲染
  - 测试空数据状态

### 7.4 实现: 资产曲线图组件
- **文件**: `src/components/dashboard/PortfolioChart.tsx`
- **依赖**: 7.3
- **内容**:
  - 创建 `PortfolioChart` 组件（扩展现有）
  - 支持多 AI 模型对比
  - X轴: 时间，Y轴: 总资产

### 7.5 [P] 测试: 股票分时图
- **文件**: `src/components/dashboard/IntradayChart.test.tsx`
- **内容**:
  - 测试分时数据渲染
  - 测试价格与成交量双轴

### 7.6 实现: 股票分时图组件
- **文件**: `src/components/dashboard/IntradayChart.tsx`
- **依赖**: 7.5
- **内容**:
  - 创建 `IntradayChart` 组件
  - 使用 ECharts 渲染分时图
  - 双轴: 价格 + 成交量

### 7.7 [P] 测试: 底部统计面板
- **文件**: `src/components/dashboard/StatsPanel.test.tsx`
- **内容**:
  - 测试今日操作次数统计
  - 测试胜率计算
  - 测试最大回撤计算

### 7.8 实现: 底部统计面板
- **文件**: `src/components/dashboard/StatsPanel.tsx`
- **依赖**: 7.7
- **内容**:
  - 创建 `StatsPanel` 组件
  - 显示: 今日操作次数、胜率、最大回撤
  - 支持按模型筛选

### 7.9 [P] 测试: Dashboard 主页
- **文件**: `src/app/dashboard/page.test.tsx`
- **内容**:
  - 测试页面布局结构
  - 测试组件集成
  - 测试数据获取 hooks

### 7.10 实现: Dashboard 主页
- **文件**: `src/app/dashboard/page.tsx`
- **依赖**: 7.1-7.8
- **内容**:
  - 创建或修改 Dashboard 页面
  - 布局: Header → 资产曲线 → 分时图 → AI 卡片区 → 统计面板
  - 集成 `useRealtimePortfolio`、`usePortfolioIntraday` 等 hooks

---

## Phase 8: 前端组件 - 群聊窗口（AI 思考流）

### 8.1 [P] 测试: 消息组件
- **文件**: `src/components/chat/MessageBubble.test.tsx`
- **内容**:
  - 测试思考过程消息样式（灰色、可折叠）
  - 测试决策结果消息高亮
  - 测试执行状态颜色（成功绿/失败红）

### 8.2 实现: 消息气泡组件
- **文件**: `src/components/chat/MessageBubble.tsx`
- **依赖**: 8.1
- **内容**:
  - 创建 `MessageBubble` 组件
  - Props: `message: AIMessage`, `onToggle?`
  - 根据 `type` 渲染不同样式

### 8.3 [P] 测试: 消息列表组件
- **文件**: `src/components/chat/MessageList.test.tsx`
- **内容**:
  - 测试消息按时间排序
  - 测试自动滚动
  - 测试折叠无操作消息

### 8.4 实现: 消息列表组件
- **文件**: `src/components/chat/MessageList.tsx`
- **依赖**: 8.3
- **内容**:
  - 创建 `MessageList` 组件
  - Props: `messages: AIMessage[]`, `autoScroll?: boolean`
  - 支持按 AI 过滤

### 8.5 [P] 测试: 聊天容器组件
- **文件**: `src/components/chat/ChatPanel.test.tsx`
- **内容**:
  - 测试实时接收消息
  - 测试暂停滚动控制

### 8.6 实现: 聊天容器组件
- **文件**: `src/components/chat/ChatPanel.tsx`
- **依赖**: 8.5
- **内容**:
  - 创建 `ChatPanel` 组件
  - 集成 SSE 或轮询接收实时消息
  - 添加暂停滚动按钮

---

## Phase 9: 前端组件 - 交易相关

### 9.1 [P] 测试: 股票池管理组件
- **文件**: `src/components/trading/StockPoolManager.test.tsx`
- **内容**:
  - 测试添加股票
  - 测试移除股票
  - 测试搜索股票

### 9.2 实现: 股票池管理组件
- **文件**: `src/components/trading/StockPoolManager.tsx`
- **依赖**: 9.1
- **内容**:
  - 创建 `StockPoolManager` 组件
  - 显示池内列表（代码、名称、实时价格、涨跌幅）
  - 显示持仓分布（哪些 AI 持有）
  - 添加/移除功能

### 9.3 [P] 测试: 持仓列表组件
- **文件**: `src/components/trading/PositionList.test.tsx`
- **内容**:
  - 测试持仓数据渲染
  - 测试盈亏颜色
  - 测试排序功能

### 9.4 实现: 持仓列表组件
- **文件**: `src/components/trading/PositionList.tsx`
- **依赖**: 9.3
- **内容**:
  - 创建 `PositionList` 组件
  - 列: 股票名、数量、成本价、当前价、盈亏、盈亏率
  - 支持按列排序

### 9.5 [P] 测试: 交易记录表组件
- **文件**: `src/components/trading/TradeTable.test.tsx`
- **内容**:
  - 测试交易记录渲染
  - 测试时间格式化
  - 测试分页

### 9.6 实现: 交易记录表组件
- **文件**: `src/components/trading/TradeTable.tsx`
- **依赖**: 9.5
- **内容**:
  - 创建 `TradeTable` 组件
  - 列: 时间、AI、股票、方向、数量、价格、原因
  - 支持筛选和分页

---

## Phase 10: 回放功能

### 10.1 [P] 测试: 回放数据构建
- **文件**: `src/lib/replay/builder.test.ts`
- **内容**:
  - 测试按日期构建回放数据
  - 测试事件排序
  - 测试数据聚合

### 10.2 实现: 回放数据构建
- **文件**: `src/lib/replay/builder.ts`
- **依赖**: 10.1
- **内容**:
  - 实现 `buildReplayData(date: string): Promise<ReplayData>`
  - 聚合 K 线、决策、成交事件
  - 从 `portfolio_events`、`ai_decisions`、`trades` 表读取

### 10.3 [P] 测试: 回放播放器
- **文件**: `src/lib/replay/player.test.ts`
- **内容**:
  - 测试播放状态管理
  - 测试暂停/继续
  - 测试进度跳转

### 10.4 实现: 回放播放器
- **文件**: `src/lib/replay/player.ts`
- **依赖**: 10.3
- **内容**:
  - 创建 `ReplayPlayer` 类
  - 方法: `play()`, `pause()`, `seek(progress: number)`
  - 状态: `isPlaying`, `currentTime`, `speed`

### 10.5 [P] 测试: 回放 API
- **文件**: `src/app/api/replay/data/route.test.ts`
- **内容**:
  - 测试 GET 返回回放数据
  - 测试 `date` 参数验证

### 10.6 实现: 回放 API
- **文件**: `src/app/api/replay/data/route.ts`, `src/app/api/replay/start/route.ts`
- **依赖**: 10.5
- **内容**:
  - 创建 `/api/replay/data` 路由
  - 创建 `/api/replay/start` 路由（初始化回放会话）

### 10.7 [P] 测试: 回放 UI 组件
- **文件**: `src/components/replay/ReplayView.test.tsx`
- **内容**:
  - 测试 K 线图渲染
  - 测试事件标记显示
  - 测试播放控制条

### 10.8 实现: 回放 UI 组件
- **文件**: `src/components/replay/ReplayView.tsx`
- **依赖**: 10.7
- **内容**:
  - 创建 `ReplayView` 组件
  - K 线图 + 事件标记
  - 播放控制条（播放/暂停、进度条、速度选择）

---

## Phase 11: 边缘场景与错误处理

### 11.1 [P] 测试: 非交易时间处理
- **文件**: `src/lib/live/manager.test.ts`
- **内容**:
  - 测试非交易时间自动跳过决策
  - 测试周末跳过
  - 测试节假日跳过

### 11.2 实现: 非交易时间处理
- **文件**: `src/lib/live/scheduler.ts`
- **依赖**: 11.1
- **内容**:
  - 在 `tick` 中检查 `isTradingTime()`
  - 非交易时间不触发决策

### 11.3 [P] 测试: API 超时降级
- **文件**: `src/lib/data/sina-api.test.ts`
- **内容**:
  - 测试请求超时使用缓存
  - 测试标记"数据延迟"

### 11.4 实现: API 超时降级
- **文件**: `src/lib/data/sina-api.ts`
- **依赖**: 11.3
- **内容**:
  - 添加 `fetchWithFallback` 函数
  - 超时时返回缓存数据 + 延迟标记

### 11.5 [P] 测试: AI 调用重试
- **文件**: `src/lib/ai/client.test.ts`
- **内容**:
  - 测试失败重试 3 次
  - 测试最终失败后跳过该周期

### 11.6 实现: AI 调用重试
- **文件**: `src/lib/ai/client.ts`
- **依赖**: 11.5
- **内容**:
  - 添加 `callWithRetry` 函数
  - 指数退避重试策略

### 11.7 [P] 测试: 交易失败反馈
- **文件**: `src/lib/trading/engine.test.ts`
- **内容**:
  - 测试涨停买入失败
  - 测试跌停卖出失败
  - 测试资金不足

### 11.8 实现: 交易失败反馈
- **文件**: `src/lib/trading/engine.ts`
- **依赖**: 11.7
- **内容**:
  - 在 `executeBuy` 中检测涨停
  - 在 `executeSell` 中检测跌停
  - 返回明确的失败原因

---

## Phase 12: 集成与收尾

### 12.1 [P] 测试: 端到端实盘流程
- **文件**: `src/__tests__/integration/live-trading.test.ts`
- **内容**:
  - 测试启动实盘 → AI 决策 → 交易执行 → 快照保存
  - 测试停止实盘

### 12.2 实现: 端到端实盘流程验证
- **文件**: 集成验证
- **依赖**: Phase 1-11
- **内容**:
  - 验证完整流程
  - 修复发现的问题

### 12.3 [P] 测试: 用户数据隔离
- **文件**: `src/__tests__/integration/user-isolation.test.ts`
- **内容**:
  - 测试不同用户的 AI 配置独立
  - 测试股票池独立
  - 测试交易历史独立

### 12.4 实现: 用户数据隔离
- **文件**: `src/lib/auth/`, `src/lib/db/queries.ts`
- **依赖**: 12.3
- **内容**:
  - 确保所有查询都基于 `userId` 过滤
  - 中间件验证用户身份

### 12.5 [P] 测试: 环境变量验证
- **文件**: `src/__tests__/unit/config.test.ts`
- **内容**:
  - 测试 `OPENROUTER_API_KEY` 必填
  - 测试 `DATABASE_URL` 必填

### 12.6 实现: 环境变量验证
- **文件**: `src/lib/config.ts`
- **依赖**: 12.5
- **内容**:
  - 创建配置验证函数
  - 启动时检查必需环境变量

---

## 附录：依赖关系图

```
Phase 1 (类型) ──────────────────────────────────────┐
                                                    │
Phase 2 (数据) ─────────────────────────────────────┤
                                          │         │
Phase 3 (规则) ────────────────────────────┤         │
                                    │     │         │
Phase 4 (AI) ───────────────────────┐     │         │
                              │      │     │         │
Phase 5 (实盘) ───────────────┼──────┼─────┼─────────┤
                         │     │      │     │         │
Phase 6 (API) ───────────┼─────┼──────┼─────┼─────────┤
                   │     │     │      │     │         │
Phase 7-9 (前端) ───┼─────┼─────┼──────┼─────┼─────────┤
              │     │     │     │      │     │         │
Phase 10 (回放) ──┼─────┼─────┼──────┼─────┼─────────┤
              │     │     │     │      │     │         │
Phase 11 (异常) ──┼─────┼─────┼──────┼─────┼─────────┤
                    │     │     │      │     │         │
Phase 12 (集成) ─────┴─────┴─────┴──────┴─────┴─────────┘
```

---

## 统计信息

- **总阶段数**: 12
- **总任务数**: ~72
- **测试任务数**: 36
- **实现任务数**: 36
- **预估文件数**: ~40 新文件 + ~20 修改文件

---

*任务列表结束*
