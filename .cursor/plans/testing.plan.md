# 测试用例实施计划

## 测试技术选型

| 项目 | 选择 | 理由 |

|------|------|------|

| 测试框架 | **Vitest** | Next.js原生支持，与项目配置兼容 |

| API Mock | **vi.fn() + vi.stubGlobal()** | Vitest内置，无需额外依赖 |

| 数据库 | **内存测试模式** | 不依赖外部数据库 |

| 覆盖率 | **c8** (Vitest内置) | 快速准确 |

---

## 实施清单

### 第一阶段：测试基础设施搭建 (5个文件)

1. **安装测试依赖包**

- 更新 package.json，添加 vitest、@vitest/ui、@vitest/coverage-v8
- 配置 npm script: test、test:ui、test:coverage

2. **创建 Vitest 配置文件**

- vitest.config.ts
- 配置测试环境为 node
- 配置路径别名 (@/ *映射到 src/*)
- 启用覆盖率统计

3. **创建测试工具函数**

- src/**tests**/utils/mock-data.ts
- 包含固定股票测试数据
- 包含固定AI响应数据
- 包含测试用日期和交易日数据

4. **创建 Mock 工具**

- src/**tests**/utils/mocks.ts
- axios mock 封装
- OpenRouter API mock 封装
- 数据库 mock 封装

5. **创建测试配置文件**

- src/**tests**/setup.ts
- 全局测试前置设置
- 环境变量设置

### 第二阶段：核心规则单元测试 (1个文件)

6. **创建 src/lib/trading/rules.test.ts**

- canSellPosition() 测试
    - 当日买入次日可卖
    - 当日买入当日不可卖
    - 持仓多日可卖
    - 空持仓返回false
- validateBuyOrder() 测试
    - 资金充足订单有效
    - 资金不足订单无效
    - 数量为0订单无效
    - 价格为0订单无效
- validateSellOrder() 测试
    - 持仓充足订单有效
    - 持仓不足订单无效
- calculateCommission() 测试
    - 5元最低手续费
    - 万分之五费率计算
    - 向上取整
- calculateBuyQuantity() 测试
    - 整数买入数量计算
    - 考虑手续费
- calculateProfit() 测试
    - 盈利计算
    - 亏损计算
- isTradingDay() 测试
    - 工作日判断
    - 周末判断

### 第三阶段：交易引擎单元测试 (1个文件)

7. **创建 src/lib/trading/engine.test.ts**

- TradingEngine 初始化测试
    - 账户初始资金为100000
    - 初始持仓为空
- executeBuy() 测试
    - 买入成功：资金减少，持仓增加
    - 买入成功：创建交易记录
    - 买入失败：资金不足
    - 买入失败：数量为0
- executeSell() 测试
    - 卖出成功：持仓减少，资金增加
    - 卖出成功：创建交易记录
    - 卖出失败：持仓不足
    - 卖出失败：违反T+1规则
- getPositions() 测试
    - 返回所有持仓
    - 返回指定股票持仓
- getAccountValue() 测试
    - 空仓时账户价值等于现金
    - 有持仓时账户价值=现金+持仓市值
- getProfit() 测试
    - 盈利计算正确
    - 亏损计算正确
    - 盈利率计算正确

### 第四阶段：数据模块单元测试 (2个文件)

8. **创建 src/lib/data/sina-api.test.ts**

- standardizeStockCode() 测试
    - 6位数字代码自动添加sz前缀
    - 000xxx添加sz前缀
    - 600xxx添加sh前缀
    - 已有前缀保持不变
- fetchStockData() 测试
    - 成功获取数据
    - 解析CSV格式正确
    - API失败时抛出异常
    - 使用缓存
- fetchBatchStockData() 测试
    - 批量获取多只股票
    - 并发请求正确处理
- isTradingTime() 测试
    - 9:30-15:00返回true
    - 非交易时间返回false
    - 周末返回false

9. **创建 src/lib/data/cache.test.ts**

- set() / get() 测试
    - 设置和获取值
    - 过期时间正确
    - 过期后返回undefined
- has() / clear() 测试
    - 检查键存在
    - 清空缓存

### 第五阶段：AI决策单元测试 (1个文件)

10. **创建 src/lib/ai/decision.test.ts**

    - getAIDecision() 测试
    - 成功获取AI决策
    - 解析JSON响应正确
    - API失败时抛出异常
    - 无效JSON重试
    - validateAIDecision() 测试
    - 买入决策：包含股票和数量
    - 卖出决策：包含股票和数量
    - 持有决策：reason非空
    - 无效决策被拒绝
    - aggregateDecisions() 测试
    - 多数决策聚合
    - 平票时处理
    - streamAIDecision() 测试
    - 流式响应正确解析

### 第六阶段：回测集成测试 (1个文件)

11. **创建 src/lib/backtest/runner.test.ts**

    - BacktestRunner.run() 测试
    - 3天回测正确执行
    - 每日调用AI决策
    - 非交易日跳过
    - 多模型并行回测
    - 生成正确结果
    - 保存交易记录到数据库
    - runModelDay() 测试
    - 单日执行逻辑
    - 错误处理

### 第七阶段：数据库查询测试 (1个文件)

12. **创建 src/lib/db/queries.test.ts**

    - 使用内存SQLite测试
    - saveTrade() 测试
    - 保存交易记录
    - 返回保存的记录
    - getTrades() 测试
    - 查询指定模型交易
    - 按日期排序
    - savePositionSnapshot() 测试
    - 保存持仓快照
    - getHistoryPositions() 测试
    - 查询历史持仓
    - saveAIDecision() 测试
    - 保存AI决策
    - getModelTradeStats() 测试
    - 计算交易统计

### 第八阶段：API路由测试 (3个文件)

13. **创建 src/app/api/stock/data/route.test.ts**

    - GET 请求测试
    - 返回股票数据
    - 参数验证
    - 错误处理

14. **创建 src/app/api/backtest/run/route.test.ts**

    - POST 请求测试
    - 启动回测
    - 参数验证
    - 返回回测结果

15. **创建 src/app/api/history/positions/route.test.ts**

    - GET 请求测试
    - 返回持仓历史
    - 分页参数处理

### 第九阶段：端到端测试 (1个文件)

16. **创建 src/tests/integration/backtest-flow.test.ts**

    - 完整回测流程测试
    - 从获取数据到执行交易
    - 验证最终账户状态
    - 验证交易记录完整性

### 第十阶段：覆盖率报告与优化

17. **运行测试覆盖率报告**

    - 执行 npm run test:coverage
    - 检查核心模块覆盖率 ≥ 80%
    - 生成覆盖率报告

18. **补充边界情况测试**

    - 根据覆盖率报告补充遗漏测试
    - 添加错误场景测试
    - 添加性能测试（如有需要）

---

## 测试文件结构总览

````javascript
src/
├── __tests__/
│   ├── setup.ts                           # 全局测试设置
│   ├── utils/
│   │   ├── mock-data.ts                   # 固定测试数据
│   │   └── mocks.ts                       # Mock工具
│   └── integration/
│       └── backtest-flow.test.ts         # E2E测试
│
├── lib/
│   ├── trading/
│   │   ├── rules.ts
│   │   ├── rules.test.ts                 # 规则单元测试
│   │   ├── engine.ts
│   │   └── engine.test.ts                # 引擎单元测试
│   ├── data/
│   │   ├── sina-api.ts
│   │   ├── sina-api.test.ts             # API单元测试
│   │   ├── cache.ts
│   │   └── cache.test.ts                # 缓存单元测试
│   ├── ai/
│   │   ├── decision.ts
│   │   └── decision.test.ts             # AI决策单元测试
│   ├── backtest/
│   │   ├── runner.ts
│   │   └── runner.test.ts               # 回测集成测试
│   └── db/
│       ├── queries.ts
│       └── queries.test.ts              # 数据库测试
│
└── app/api/
    ├── stock/data/
    │   └── route.test.ts                # API测试
    ├── backtest/run/
    │   └── route.test.ts
    └── history/
        └── positions/
            └── route.test.ts
```

---

## 预估测试用例数量

| 模块 | 测试文件 | 测试用例数 |
|------|----------|-----------|
| Trading Rules | 1 | ~15 |
| Trading Engine | 1 | ~18 |
| Sina API | 1 | ~12 |
| Cache | 1 | ~6 |
| AI Decision | 1 | ~10 |
| Backtest Runner | 1 | ~8 |
| DB Queries | 1 | ~10 |
| API Routes | 3 | ~15 |
| Integration | 1 | ~3 |

````