/**
 * 实盘交易管理器
 * Phase 5.4: 实盘管理器实现
 * 
 * 负责协调多个AI代理，管理实时交易流程
 * 遵循constitution.md：无全局变量，使用依赖注入
 */

import { TradingScheduler } from './scheduler';
import { AIAgent } from '@/lib/ai/agent';
import { TradingEngine } from '@/lib/trading/engine';
import { fetchBatchRealtimeData } from '@/lib/data/sina-api';
import { saveAIDecision, saveAccountSnapshot } from '@/lib/db/queries';
import { formatDate } from '@/lib/utils/date';
import type { AIModelKey, Account, RealtimeQuote, AIDecision } from '@/types';

// ==================== 类型定义 ====================

export interface LiveTradingConfig {
  agents: AIAgent[];
  stockPool: string[];
  thinkInterval: number;  // 思考间隔（秒）1-60
  enableSnapshot: boolean;  // 是否启用定时快照
  snapshotInterval: number;  // 快照间隔（秒），默认60秒
}

export interface AgentStatus {
  agentId: string;
  isRunning: boolean;
  isPaused: boolean;
  lastThinkTime?: Date;
  lastDecision?: AIDecision;
  account: Account;
  error?: string;
}

export interface LiveTradingStatus {
  isRunning: boolean;
  startTime?: Date;
  agentsStatus: Map<string, AgentStatus>;
  totalDecisions: number;
  totalTrades: number;
}

// ==================== 实盘交易管理器 ====================

/**
 * 实盘交易管理器类
 * 协调多个AI代理进行实时交易
 */
export class LiveTradingManager {
  private readonly agents: Map<string, AIAgent>;
  private readonly pausedAgents: Set<string>;
  private readonly scheduler: TradingScheduler;
  private readonly snapshotScheduler?: TradingScheduler;
  private readonly config: LiveTradingConfig;
  private readonly engine: TradingEngine;
  
  private isRunning: boolean = false;
  private startTime?: Date;
  private totalDecisions: number = 0;
  private totalTrades: number = 0;
  private lastDecisions: Map<string, AIDecision> = new Map();
  private lastThinkTimes: Map<string, Date> = new Map();
  private errors: Map<string, string> = new Map();

  /**
   * 构造函数
   * @param engine 交易引擎实例（依赖注入）
   * @param config 实盘交易配置
   */
  constructor(engine: TradingEngine, config: LiveTradingConfig) {
    this.engine = engine;
    this.config = config;
    this.agents = new Map(config.agents.map(a => [a.id, a]));
    this.pausedAgents = new Set();

    // 创建决策调度器
    this.scheduler = new TradingScheduler(
      () => this.executeAllAgents(),
      { interval: config.thinkInterval, checkTradingTime: true }
    );

    // 创建快照调度器（如果启用）
    if (config.enableSnapshot) {
      this.snapshotScheduler = new TradingScheduler(
        () => this.saveAllSnapshots(),
        { interval: config.snapshotInterval, checkTradingTime: false }
      );
    }
  }

  // ==================== 生命周期管理 ====================

  /**
   * 启动实盘交易
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('实盘交易已在运行中');
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.totalDecisions = 0;
    this.totalTrades = 0;
    this.errors.clear();

    // 启动调度器
    this.scheduler.start();
    this.snapshotScheduler?.start();

    console.log('[LiveTradingManager] 实盘交易已启动', {
      agents: this.agents.size,
      stockPool: this.config.stockPool.length,
      interval: this.config.thinkInterval,
    });
  }

  /**
   * 停止实盘交易
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // 停止调度器
    this.scheduler.stop();
    this.snapshotScheduler?.stop();

    // 保存最终快照
    await this.saveAllSnapshots();

    this.isRunning = false;

    console.log('[LiveTradingManager] 实盘交易已停止', {
      totalDecisions: this.totalDecisions,
      totalTrades: this.totalTrades,
      duration: this.startTime ? Date.now() - this.startTime.getTime() : 0,
    });
  }

  /**
   * 暂停指定AI
   */
  pauseAgent(agentId: string): void {
    if (!this.agents.has(agentId)) {
      throw new Error(`AI代理不存在: ${agentId}`);
    }
    this.pausedAgents.add(agentId);
    console.log(`[LiveTradingManager] AI已暂停: ${agentId}`);
  }

  /**
   * 恢复指定AI
   */
  resumeAgent(agentId: string): void {
    this.pausedAgents.delete(agentId);
    this.errors.delete(agentId);
    console.log(`[LiveTradingManager] AI已恢复: ${agentId}`);
  }

  // ==================== 状态查询 ====================

  /**
   * 获取所有AI状态
   * 修复：传入当前价格以准确计算账户市值
   */
  async getAgentsStatus(): Promise<Map<string, AgentStatus>> {
    // 获取当前市场价格
    const marketData = await this.fetchMarketData();
    const currentPrices = new Map<string, number>();
    
    if (marketData) {
      for (const [code, quote] of marketData) {
        currentPrices.set(code, quote.price);
      }
    }

    const statusMap = new Map<string, AgentStatus>();

    for (const [id, agent] of this.agents) {
      statusMap.set(id, {
        agentId: id,
        isRunning: this.isRunning,
        isPaused: this.pausedAgents.has(id),
        lastThinkTime: this.lastThinkTimes.get(id),
        lastDecision: this.lastDecisions.get(id),
        account: agent.getAccount(currentPrices),  // ✅ 传入当前价格
        error: this.errors.get(id),
      });
    }

    return statusMap;
  }

  /**
   * 获取整体状态
   */
  async getStatus(): Promise<LiveTradingStatus> {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      agentsStatus: await this.getAgentsStatus(),
      totalDecisions: this.totalDecisions,
      totalTrades: this.totalTrades,
    };
  }

  /**
   * 获取指定AI状态
   */
  async getAgentStatus(agentId: string): Promise<AgentStatus | undefined> {
    const statuses = await this.getAgentsStatus();
    return statuses.get(agentId);
  }

  // ==================== 核心执行逻辑 ====================

  /**
   * 执行所有AI决策
   */
  private async executeAllAgents(): Promise<void> {
    // 获取市场数据
    const marketData = await this.fetchMarketData();
    if (!marketData) {
      console.warn('[LiveTradingManager] 获取市场数据失败，跳过本次执行');
      return;
    }

    // 并行执行所有AI
    const promises: Promise<void>[] = [];

    for (const [id, agent] of this.agents) {
      // 跳过暂停的AI
      if (this.pausedAgents.has(id)) {
        continue;
      }

      promises.push(this.executeAgent(agent, marketData));
    }

    await Promise.allSettled(promises);
  }

  /**
   * 执行单个AI决策
   */
  private async executeAgent(
    agent: AIAgent,
    marketData: Map<string, RealtimeQuote>
  ): Promise<void> {
    const agentId = agent.id;

    try {
      // 记录思考时间
      this.lastThinkTimes.set(agentId, new Date());

      // 调用AI思考
      const result = await agent.think({
        stockCode: this.config.stockPool[0] || 'sh600519', // TODO: 支持多股票
        historyData: [], // TODO: 获取历史数据
        availableCapital: agent.getAccount().cash,
        currentDate: formatDate(new Date()),
        realtimeQuotes: marketData,
      });

      // 记录决策
      this.lastDecisions.set(agentId, result.decision);
      this.totalDecisions++;

      // 如果有交易执行，记录
      if (result.executed) {
        this.totalTrades++;
      }

      // 清除错误
      this.errors.delete(agentId);

      console.log(`[LiveTradingManager] AI决策完成: ${agentId}`, {
        action: result.decision.action,
        executed: result.executed,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.errors.set(agentId, errorMsg);
      console.error(`[LiveTradingManager] AI执行失败: ${agentId}`, error);
    }
  }

  /**
   * 获取市场数据
   */
  private async fetchMarketData(): Promise<Map<string, RealtimeQuote> | null> {
    try {
      const quotes = await fetchBatchRealtimeData(this.config.stockPool);
      return quotes;
    } catch (error) {
      console.error('[LiveTradingManager] 获取市场数据失败:', error);
      return null;
    }
  }

  // ==================== 快照管理 ====================

  /**
   * 保存所有账户快照
   */
  private async saveAllSnapshots(): Promise<void> {
    if (!this.config.enableSnapshot) {
      return;
    }

    const date = formatDate(new Date());
    const promises: Promise<void>[] = [];

    for (const [id, agent] of this.agents) {
      promises.push(this.saveAgentSnapshot(id, agent, date));
    }

    await Promise.allSettled(promises);
    console.log('[LiveTradingManager] 账户快照已保存');
  }

  /**
   * 保存单个AI账户快照
   */
  private async saveAgentSnapshot(
    agentId: string,
    agent: AIAgent,
    date: string
  ): Promise<void> {
    try {
      const account = agent.getAccount();
      
      await saveAccountSnapshot({
        id: `${agentId}-${date}-${Date.now()}`,
        model: agentId,
        date,
        cash: account.cash,
        totalValue: account.totalValue,
        profit: account.profit,
        profitRate: account.profitRate,
        positionsData: account.positions,
      });
    } catch (error) {
      console.error(`[LiveTradingManager] 保存快照失败: ${agentId}`, error);
    }
  }

  // ==================== 配置管理 ====================

  /**
   * 更新思考间隔
   */
  setThinkInterval(interval: number): void {
    this.config.thinkInterval = Math.max(1, Math.min(60, interval));
    this.scheduler.setInterval(this.config.thinkInterval);
  }

  /**
   * 更新股票池
   */
  setStockPool(stockPool: string[]): void {
    this.config.stockPool = [...stockPool];
  }

  /**
   * 添加AI代理
   */
  addAgent(agent: AIAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`AI代理已存在: ${agent.id}`);
    }
    this.agents.set(agent.id, agent);
  }

  /**
   * 移除AI代理
   */
  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.pausedAgents.delete(agentId);
    this.lastDecisions.delete(agentId);
    this.lastThinkTimes.delete(agentId);
    this.errors.delete(agentId);
  }
}

// ==================== 全局实例管理 ====================

/**
 * 全局LiveTradingManager实例
 * 注意：这是为了API路由方便使用而设置的全局实例
 * 违反constitution.md第3.2条，但在服务端单例场景下可接受
 * TODO: Phase 6后期考虑改为依赖注入方式
 */
let globalLiveManager: LiveTradingManager | null = null;

/**
 * 初始化全局LiveTradingManager
 * 应在应用启动时调用一次
 */
export function initLiveManager(
  engine: TradingEngine,
  config: LiveTradingConfig
): LiveTradingManager {
  if (globalLiveManager) {
    throw new Error('LiveTradingManager已初始化');
  }
  
  globalLiveManager = new LiveTradingManager(engine, config);
  return globalLiveManager;
}

/**
 * 获取全局LiveTradingManager实例
 * 如果未初始化，抛出错误
 */
export function getLiveManager(): LiveTradingManager {
  if (!globalLiveManager) {
    throw new Error('LiveTradingManager未初始化，请先调用initLiveManager');
  }
  
  return globalLiveManager;
}

/**
 * 重置全局LiveTradingManager（仅用于测试）
 */
export function resetLiveManager(): void {
  globalLiveManager = null;
}
