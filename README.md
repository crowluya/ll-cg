# llm-cg - A股 AI 交易模拟与可视化平台

## 项目简介

**llm-cg** 是一个面向 A 股的 AI 驱动交易模拟平台。该平台允许多个 AI Agent 独立监控实时股价并自主做出交易决策。

### 核心目标

- **观察 AI 交易风格**：对比不同 AI 模型（DeepSeek、Gemini、Claude）及其交易行为
- **辅助交易决策**：提供 AI 分析见解，辅助个人投资判断
- **量化学习沙箱**：学习量化交易逻辑并验证交易策略

## 技术栈

| 分类 | 技术 |
|------|------|
| **框架** | Next.js 15, React 19, TypeScript 5.x |
| **数据库** | PostgreSQL + Drizzle ORM |
| **UI** | TailwindCSS 3.x, ECharts 5.x |
| **AI** | Vercel AI SDK + OpenRouter |
| **测试** | Vitest |
| **数据源** | 新浪财经 API |

## 核心特性

### 1. 多 Agent AI 交易系统
- 支持 DeepSeek、Gemini、Claude 等模型
- 通过 OpenRouter API 自定义模型
- 可配置决策间隔（1-60 秒）
- 实时显示决策推理过程

### 2. 交易规则引擎
- **T+1 交易规则**（次日结算）
- **交易时段**：9:15-9:30（集合竞价）、9:30-11:30、13:00-15:00
- **持仓限制**：单只股票最大 50% 资金
- 涨跌停处理
- 停牌处理

### 3. 实时数据可视化
- 资产曲线图表（支持时间范围选择）
- 分时走势图
- 实时持仓价格面板
- 买卖五档数据

### 4. 历史数据与回测
- 历史交易记录
- AI 决策历史
- 持仓快照
- 策略回测功能

### 5. 实盘交易管理系统
- 多 AI 代理协调与调度
- 定时决策执行（可配置间隔）
- 单个 AI 暂停/恢复控制
- 实时状态监控与查询
- 账户快照自动保存
- 完整的错误处理与日志

## 安装指南

### 环境要求

- Node.js 18+
- PostgreSQL 数据库
- pnpm 包管理器

### 依赖安装

```bash
# 安装依赖
pnpm install
```

### 环境变量配置

创建 `.env.local` 文件：

```env
# OpenRouter API Key (必需)
OPENROUTER_API_KEY=your_openrouter_api_key

# 数据库连接 (必需)
DATABASE_URL=postgresql://user:password@host:port/database

# 新浪财经 API (可选，默认值如下)
NEXT_PUBLIC_SINA_API_BASE=https://hq.sinajs.cn
```

### 数据库初始化

```bash
# 推送数据库 Schema
pnpm db:push

# 初始化默认用户（需要先配置 .env.local）
pnpm init-users
```

## 使用方法

### 开发模式

```bash
# 启动开发服务器（端口 9633）
pnpm dev
```

访问 http://localhost:9633

### 生产构建

```bash
# 构建生产包
pnpm build

# 启动生产服务器
pnpm start
```

### 数据库操作

```bash
# 推送 Schema 变更到数据库
pnpm db:push

# 打开 Drizzle Studio（数据库管理界面）
pnpm db:studio
```

### 测试

```bash
# 运行所有测试
pnpm test

# 运行测试（带 UI 界面）
pnpm test:ui

# 运行测试（带覆盖率报告）
pnpm test:coverage
```

**测试统计：** 457 个测试全部通过 ✅

### 代码检查

```bash
# 运行 ESLint
pnpm lint
```

## 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   │   ├── auth/             # 认证（登录、登出、会话）
│   │   ├── ai/               # AI 决策接口
│   │   ├── stock/            # 股票数据接口
│   │   ├── trading/          # 交易执行
│   │   ├── history/          # 历史数据查询
│   │   └── portfolio/        # 资产组合数据
│   ├── dashboard/            # 主控台页面
│   ├── live/                 # 实盘交易页面
│   ├── history/              # 历史记录页面
│   └── login/                # 登录页面
├── components/               # React 组件
│   ├── dashboard/            # 主控台组件
│   ├── charts/               # 图表组件
│   ├── portfolio/            # 持仓组件
│   └── ui/                   # 通用 UI 组件
├── lib/                      # 核心业务逻辑
│   ├── ai/                   # AI 决策逻辑
│   ├── trading/              # 交易引擎
│   ├── live/                 # 实盘交易管理
│   │   ├── scheduler.ts      # 定时调度器
│   │   └── manager.ts        # 实盘交易管理器
│   ├── data/                 # 数据获取与缓存
│   │   ├── sina-api.ts       # 新浪财经 API 封装
│   │   └── cache.ts          # 请求合并与缓存
│   ├── auth/                 # 认证
│   ├── portfolio/            # 资产组合计算
│   ├── backtest/             # 回测引擎
│   └── db/                   # 数据库访问
├── hooks/                    # React Hooks
├── types/                    # TypeScript 类型定义
└── __tests__/                # 测试文件

specs/                        # 需求与计划文档
tests/                        # 集成测试脚本
```

## 核心模块

### 数据层 (`src/lib/data/`)
- **sina-api.ts**: 新浪财经 API 封装，支持实时行情、K线、分时数据
- **cache.ts**: 内存缓存与请求合并机制

### AI 决策 (`src/lib/ai/`)
- 多模型支持（DeepSeek、Gemini、Claude）
- 可配置的决策参数
- 决策历史记录

### 交易引擎 (`src/lib/trading/`)
- T+1 交易规则实现
- 交易时段校验
- 涨跌停/停牌处理
- 资金与持仓管理

### 实盘交易 (`src/lib/live/`)
- 多 AI 代理协调
- 定时调度与执行
- 状态监控与管理
- 错误处理与恢复

## 开发指南

### 代码规范

项目遵循 **简单性原则**：
- 遵循 Go 语言"少即是多"哲学
- 只实现明确要求的功能
- 优先使用标准库
- 避免过度抽象

### 测试先行

所有新功能必须先编写测试：
- 使用 Vitest 进行单元测试
- 优先编写集成测试
- 使用表格驱动测试风格

### 提交规范

遵循 Conventional Commits：
```
feat(scope): description
fix(scope): description
docs: description
test: description
refactor(scope): description
```

示例：
```
feat(data): add Sina API GBK encoding support
fix(auth): resolve session token expiration
docs: update README with new features
```

## 数据库 Schema

### 核心表

| 表名 | 说明 |
|------|------|
| `users` | 用户账户和配置 |
| `trades` | 交易执行记录 |
| `positions` | 持仓快照（T+1 追踪） |
| `ai_decisions` | AI 决策历史 |
| `account_snapshots` | 账户价值快照 |

### 时序表

| 表名 | 说明 |
|------|------|
| `portfolio_series_points` | 资产组合时序数据 |
| `stock_intraday_points` | 股票分时数据 |
| `portfolio_events` | 事件回放数据 |

### 实盘交易

| 表名 | 说明 |
|------|------|
| `live_trading_status` | 各模型实盘交易状态 |

## 最近更新

### 2025-02-05 - Phase 5 完全完成 + Phase 6 部分完成

- ✅ Phase 5 实盘交易系统 100% 完成
- ✅ 实现完整的实盘交易管理器（`LiveTradingManager`）
- ✅ 实现实盘控制 API（启动/停止/状态/代理控制）
- ✅ 修复全局变量问题，改为依赖注入架构
- ✅ 新增 68 个测试用例，所有 457 个测试通过
- ✅ 宪法符合度从 70% 提升到 90%
- ✅ 代码质量从 3.0/5 提升到 4.0/5

详细信息：
- [修复总结报告](./FIXES_SUMMARY.md)
- [第二轮代码审查](./CODE_REVIEW_ROUND2.md)

## License

MIT
