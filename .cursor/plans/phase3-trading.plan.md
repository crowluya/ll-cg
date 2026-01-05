# Phase 3: 交易引擎与回测系统

> **目标**: 实现 T+1 交易引擎和回测系统

---

## 实施清单

### 1. T+1 规则实现

**文件**: `src/lib/trading/rules.ts`

**创建函数**:
- `canSellPosition(position: Position, currentDate: string)` - 判断持仓是否可卖出
- `isTradingDay(date: string)` - 判断是否是交易日
- `isTradingTime()` - 判断当前是否在交易时间段（9:15-15:00）

**T+1 规则**:
- 当天买入的股票，次日才能卖出
- 做T：只有昨日或更早买入的持仓可以当日卖出

**验证**: 单元测试覆盖所有规则场景

---

### 2. 交易引擎核心

**文件**: `src/lib/trading/engine.ts`

**创建类**: `TradingEngine`

**方法**:
- `executeBuy(model: string, stock: string, quantity: number, price: number, date: string)` - 执行买入
- `executeSell(model: string, stock: string, quantity: number, price: number, date: string)` - 执行卖出
- `getPositions(model: string)` - 获取模型当前持仓
- `getAccountValue(model: string, currentPrices: Map<string, number>)` - 计算账户总价值
- `getProfit(model: string, currentPrices: Map<string, number>)` - 计算盈亏

**验证**: 买卖操作正确执行，T+1 规则生效

---

### 3. 模型账户管理

**文件**: `src/lib/trading/account.ts`

**创建类**: `ModelAccountManager`

**方法**:
- `createAccount(model: string, initialCapital: number)` - 创建模型账户
- `getAccount(model: string)` - 获取账户信息
- `updateCash(model: string, amount: number)` - 更新现金
- `addPosition(model: string, position: Position)` - 添加持仓
- `removePosition(model: string, stock: string, quantity: number)` - 减少持仓

**初始资金**: 每个模型 100,000 元

**验证**: 账户操作正确记录

---

### 4. 回测执行器

**文件**: `src/lib/backtest/runner.ts`

**创建类**: `BacktestRunner`

**方法**:
- `run(config: BacktestConfig)` - 执行回测
- `runDay(date: string, models: string[])` - 执行单日回测
- `getResults()` - 获取回测结果

**回测配置**:
```typescript
interface BacktestConfig {
  stocks: string[];        // 股票列表
  models: string[];        // 模型列表
  startDate: string;       // 开始日期
  endDate: string;         // 结束日期
  historyDays: number;     // 历史数据天数
  initialCapital: number;  // 初始资金
}
```

**回测结果**:
```typescript
interface BacktestResult {
  model: string;
  trades: Trade[];
  finalValue: number;
  profit: number;
  profitRate: number;
  winRate: number;
  sharpeRatio?: number;
}
```

**验证**: 回测结果符合预期

---

### 5. 回测 API

**文件**: `src/app/api/backtest/run/route.ts`

**接口**: `POST /api/backtest/run`

**请求体**:
```json
{
  "stocks": ["sh600000", "sh600519"],
  "models": ["deepseek", "gemini"],
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "historyDays": 30
}
```

**返回格式**:
```json
{
  "success": true,
  "results": [
    {
      "model": "deepseek",
      "trades": [...],
      "finalValue": 105000,
      "profit": 5000,
      "profitRate": 0.05,
      "winRate": 0.6
    }
  ]
}
```

**验证**: API 正确执行回测并返回结果

---

### 6. 交易记录持久化

**文件**: `src/lib/trading/persistence.ts`

**创建函数**:
- `saveTradeToDB(trade: Trade)` - 保存交易到数据库
- `savePositionToDB(position: Position, model: string, date: string)` - 保存持仓快照
- `saveAccountSnapshot(model: string, date: string)` - 保存账户快照

**验证**: 数据正确写入数据库

---

### 7. 回测报告生成

**文件**: `src/lib/backtest/report.ts`

**创建函数**:
- `generateReport(results: BacktestResult[])` - 生成回测报告
- `calculateMetrics(trades: Trade[])` - 计算交易指标（胜率、夏普比率等）
- `generateChartData(results: BacktestResult[])` - 生成图表数据

**验证**: 报告数据正确计算

---

### 8. 验证第三阶段完成

**检查项**:
- [ ] T+1 规则正确实现
- [ ] 交易引擎正确执行买卖
- [ ] 账户管理正常工作
- [ ] 回测执行器可完成完整回测
- [ ] 回测 API 可访问
- [ ] 交易记录正确持久化
- [ ] 回测报告正确生成

---

## 依赖关系

```
1. T+1规则实现 (无额外依赖)
   ↓
2. 交易引擎核心 (依赖 1, Phase 1)
   ↓
3. 模型账户管理 (依赖 Phase 1)
   ↓
4. 回测执行器 (依赖 1, 2, 3, Phase 2)
   ↓
5. 回测API (依赖 4)
   ↓
6. 交易记录持久化 (依赖 2, Phase 1)
   ↓
7. 回测报告生成 (依赖 4)
   ↓
8. 验证 (依赖所有)
```

---

## 预计创建的文件

```
src/
├── lib/
│   ├── trading/
│   │   ├── rules.ts        (新增)
│   │   ├── engine.ts       (新增)
│   │   ├── account.ts      (新增)
│   │   └── persistence.ts  (新增)
│   └── backtest/
│       ├── runner.ts       (新增)
│       └── report.ts       (新增)
└── app/
    └── api/
        └── backtest/
            └── run/
                └── route.ts (新增)
```
