# Phase 4: 前端页面与实盘交易

> **目标**: 实现前端页面和实盘交易系统

---

## 实施清单

### 1. 主页面组件

**文件**: `src/app/page.tsx`

**功能**:
- 模式切换：回测模式 / 实盘模式
- 股票选择器（多选）
- 模型选择器（多选）
- 历史天数设置
- 回测时间段选择（回测模式）
- 开始回测 / 启动实盘按钮

**验证**: 页面可正常渲染和交互

---

### 2. 股票选择器组件

**文件**: `src/components/StockSelector.tsx`

**功能**:
- 搜索股票
- 多选支持
- 常用股票快捷选择

**验证**: 可选择多个股票

---

### 3. 模型选择器组件

**文件**: `src/components/ModelSelector.tsx`

**功能**:
- 多选 AI 模型
- 显示模型信息

**验证**: 可选择多个模型

---

### 4. K 线图组件

**文件**: `src/components/KLineChart.tsx`

**功能**:
- 使用 ECharts 渲染 K 线图
- 支持缩放和平移
- 显示均线

**验证**: K 线图正确渲染

---

### 5. 回测结果页面

**文件**: `src/app/results/page.tsx`

**功能**:
- 各模型盈亏对比卡片
- K 线图展示
- 交易记录表格
- 资金曲线图
- 持仓明细

**验证**: 页面正确展示回测结果

---

### 6. 盈亏卡片组件

**文件**: `src/components/ProfitCard.tsx`

**功能**:
- 显示模型盈亏
- 盈亏率
- 颜色标识（红涨绿跌）

**验证**: 数据正确显示

---

### 7. 交易记录表格组件

**文件**: `src/components/TradeTable.tsx`

**功能**:
- 分页显示交易记录
- 筛选和排序
- 导出功能

**验证**: 表格正确显示和交互

---

### 8. 资金曲线图组件

**文件**: `src/components/FundCurveChart.tsx`

**功能**:
- 使用 ECharts 绘制资金曲线
- 多模型对比
- 区间选择

**验证**: 曲线正确渲染

---

### 9. 实盘交易管理器

**文件**: `src/lib/live-trading/manager.ts`

**创建类**: `LiveTradingManager`

**方法**:
- `start(config)` - 启动实盘交易
- `stop()` - 停止实盘交易
- `getStatus()` - 获取交易状态
- `executeDecisionLoop()` - 执行决策循环

**验证**: 实盘交易可正常启动和停止

---

### 10. 实盘交易 API

**文件**: `src/app/api/live/start/route.ts`, `src/app/api/live/status/route.ts`, `src/app/api/live/stop/route.ts`

**接口**:
- `POST /api/live/start` - 启动实盘交易
- `GET /api/live/status` - 获取交易状态
- `POST /api/live/stop` - 停止实盘交易

**验证**: API 可正常调用

---

### 11. 实盘交易页面

**文件**: `src/app/live/page.tsx`

**功能**:
- 实时行情展示
- 实盘交易控制面板
- 实时持仓列表
- 实时盈亏统计
- 最新交易记录
- AI 决策日志

**验证**: 页面实时更新

---

### 12. 历史记录 API

**文件**: `src/app/api/history/positions/route.ts`, `src/app/api/history/decisions/route.ts`, `src/app/api/history/trades/route.ts`

**接口**:
- `GET /api/history/positions` - 查询历史持仓
- `GET /api/history/decisions` - 查询 AI 操作记录
- `GET /api/history/trades` - 查询历史交易

**验证**: API 返回正确数据

---

### 13. 历史记录页面

**文件**: `src/app/history/page.tsx`

**功能**:
- 历史持仓查看
- AI 操作记录查看
- 决策时间线
- 交易统计
- 盈亏分析图表

**验证**: 页面正确展示历史数据

---

### 14. 根布局更新

**文件**: `src/app/layout.tsx`

**更新内容**:
- 添加导航栏
- 统一样式
- 添加元数据

**验证**: 布局正确应用

---

### 15. 验证第四阶段完成

**检查项**:
- [ ] 主页面可正常使用
- [ ] 回测结果页面正确展示
- [ ] 实盘交易页面实时更新
- [ ] 历史记录页面正确展示
- [ ] 所有 API 可正常访问
- [ ] 组件交互正常

---

## 依赖关系

```
1. 主页面 (无额外依赖)
   ↓
2. 股票选择器 (依赖 1)
   ↓
3. 模型选择器 (依赖 1)
   ↓
4. K线图组件 (无依赖)
   ↓
5. 回测结果页面 (依赖 4, 6, 7, 8, Phase 3)
   ↓
6. 盈亏卡片 (无依赖)
   ↓
7. 交易记录表格 (无依赖)
   ↓
8. 资金曲线图 (无依赖)
   ↓
9. 实盘交易管理器 (依赖 Phase 2, Phase 3)
   ↓
10. 实盘交易API (依赖 9)
   ↓
11. 实盘交易页面 (依赖 9, 10)
   ↓
12. 历史记录API (依赖 Phase 1)
   ↓
13. 历史记录页面 (依赖 12)
   ↓
14. 根布局更新 (无依赖)
   ↓
15. 验证 (依赖所有)
```

---

## 预计创建的文件

```
src/
├── app/
│   ├── page.tsx                 (更新)
│   ├── layout.tsx               (更新)
│   ├── results/
│   │   └── page.tsx             (新增)
│   ├── live/
│   │   └── page.tsx             (新增)
│   ├── history/
│   │   └── page.tsx             (新增)
│   └── api/
│       ├── live/
│       │   ├── start/route.ts   (新增)
│       │   ├── status/route.ts  (新增)
│       │   └── stop/route.ts    (新增)
│       └── history/
│           ├── positions/route.ts (新增)
│           ├── decisions/route.ts (新增)
│           └── trades/route.ts    (新增)
├── lib/
│   └── live-trading/
│       └── manager.ts           (新增)
└── components/
    ├── StockSelector.tsx        (新增)
    ├── ModelSelector.tsx        (新增)
    ├── KLineChart.tsx           (新增)
    ├── ProfitCard.tsx           (新增)
    ├── TradeTable.tsx           (新增)
    └── FundCurveChart.tsx       (新增)
```
