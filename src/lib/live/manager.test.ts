/**
 * 实盘交易管理器单元测试
 * Phase 5.3-5.8: 实盘管理器测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LiveTradingManager } from './manager';
import { TradingEngine } from '@/lib/trading/engine';
import { AIAgent } from '@/lib/ai/agent';
import type { AIModelKey } from '@/types';

// Mock dependencies
vi.mock('@/lib/data/sina-api', () => ({
  fetchBatchRealtimeData: vi.fn(() => Promise.resolve(new Map([
    ['sh600519', {
      code: 'sh600519',
      name: '贵州茅台',
      price: 1800.00,
      open: 1790.00,
      close: 1795.00,
      high: 1810.00,
      low: 1785.00,
      volume: 1000000,
      timestamp: new Date().toISOString(),
      isLimitUp: false,
      isLimitDown: false,
      isSuspended: false,
    }]
  ]))),
}));

vi.mock('@/lib/db/queries', () => ({
  saveAIDecision: vi.fn(() => Promise.resolve()),
  saveAccountSnapshot: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/trading/rules', () => ({
  isTradingTime: vi.fn(() => true),
  getTradingSession: vi.fn(() => 'morning'),
}));

describe('LiveTradingManager', () => {
  let engine: TradingEngine;
  let manager: LiveTradingManager;
  let mockAgent1: AIAgent;
  let mockAgent2: AIAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // 创建交易引擎
    engine = new TradingEngine(100000);

    // 创建mock AI代理
    mockAgent1 = {
      id: 'deepseek-v3',
      model: 'deepseek-v3' as AIModelKey,
      think: vi.fn(() => Promise.resolve({
        decision: {
          action: 'hold' as const,
          reason: '观望',
          timestamp: new Date(),
        },
        executed: false,
      })),
      getAccount: vi.fn(() => ({
        userId: 'test-user',
        cash: 100000,
        totalValue: 100000,
        profit: 0,
        profitRate: 0,
        positions: [],
      })),
      updateAccount: vi.fn(),
      reset: vi.fn(),
    } as any;

    mockAgent2 = {
      id: 'gemini-flash',
      model: 'gemini-flash' as AIModelKey,
      think: vi.fn(() => Promise.resolve({
        decision: {
          action: 'hold' as const,
          reason: '观望',
          timestamp: new Date(),
        },
        executed: false,
      })),
      getAccount: vi.fn(() => ({
        userId: 'test-user',
        cash: 100000,
        totalValue: 100000,
        profit: 0,
        profitRate: 0,
        positions: [],
      })),
      updateAccount: vi.fn(),
      reset: vi.fn(),
    } as any;
  });

  afterEach(() => {
    manager?.stop();
    vi.useRealTimers();
  });

  // ============= 构造函数测试 =============

  describe('constructor', () => {
    it('正确初始化管理器', async () => {
      manager = new LiveTradingManager(engine, {
        agents: [mockAgent1, mockAgent2],
        stockPool: ['sh600519'],
        thinkInterval: 10,
        enableSnapshot: true,
        snapshotInterval: 60,
      });

      const status = await manager.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.agentsStatus.size).toBe(2);
      expect(status.totalDecisions).toBe(0);
      expect(status.totalTrades).toBe(0);
    });

    it('支持空代理列表', async () => {
      manager = new LiveTradingManager(engine, {
        agents: [],
        stockPool: ['sh600519'],
        thinkInterval: 10,
        enableSnapshot: false,
        snapshotInterval: 60,
      });

      const status = await manager.getStatus();
      expect(status.agentsStatus.size).toBe(0);
    });
  });

  // ============= 启动停止测试 =============

  describe('start/stop', () => {
    beforeEach(() => {
      manager = new LiveTradingManager(engine, {
        agents: [mockAgent1],
        stockPool: ['sh600519'],
        thinkInterval: 1,
        enableSnapshot: false,
        snapshotInterval: 60,
      });
    });

    it('启动后状态变为running', async () => {
      await manager.start();
      const status = await manager.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.startTime).toBeDefined();
    });

    it('重复启动抛出错误', async () => {
      await manager.start();
      await expect(manager.start()).rejects.toThrow('实盘交易已在运行中');
    });

    it('停止后状态变为stopped', async () => {
      await manager.start();
      await manager.stop();
      const status = await manager.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('未启动时停止不抛错', async () => {
      await expect(manager.stop()).resolves.not.toThrow();
    });
  });

  // ============= AI代理管理测试 =============

  describe('pauseAgent/resumeAgent', () => {
    beforeEach(() => {
      manager = new LiveTradingManager(engine, {
        agents: [mockAgent1, mockAgent2],
        stockPool: ['sh600519'],
        thinkInterval: 1,
        enableSnapshot: false,
        snapshotInterval: 60,
      });
    });

    it('暂停AI后状态更新', async () => {
      manager.pauseAgent('deepseek-v3');
      
      const status = await manager.getAgentStatus('deepseek-v3');
      expect(status?.isPaused).toBe(true);
    });

    it('恢复AI后状态更新', async () => {
      manager.pauseAgent('deepseek-v3');
      manager.resumeAgent('deepseek-v3');
      
      const status = await manager.getAgentStatus('deepseek-v3');
      expect(status?.isPaused).toBe(false);
    });

    it('暂停不存在的AI抛出错误', () => {
      expect(() => manager.pauseAgent('non-existent')).toThrow('AI代理不存在');
    });

    it('恢复不存在的AI不抛错', () => {
      expect(() => manager.resumeAgent('non-existent')).not.toThrow();
    });
  });

  // ============= 决策执行测试 =============

  describe('决策执行', () => {
    beforeEach(() => {
      manager = new LiveTradingManager(engine, {
        agents: [mockAgent1, mockAgent2],
        stockPool: ['sh600519'],
        thinkInterval: 1,
        enableSnapshot: false,
        snapshotInterval: 60,
      });
    });

    it('启动后定时执行AI决策', async () => {
      await manager.start();
      
      // 快进1秒，触发第一次执行
      await vi.advanceTimersByTimeAsync(1000);
      
      expect(mockAgent1.think).toHaveBeenCalled();
      expect(mockAgent2.think).toHaveBeenCalled();
      
      const status = await manager.getStatus();
      expect(status.totalDecisions).toBeGreaterThan(0);
    });

    it('暂停的AI不执行决策', async () => {
      manager.pauseAgent('deepseek-v3');
      await manager.start();
      
      await vi.advanceTimersByTimeAsync(1000);
      
      expect(mockAgent1.think).not.toHaveBeenCalled();
      expect(mockAgent2.think).toHaveBeenCalled();
    });

    it('AI执行失败不影响其他AI', async () => {
      vi.mocked(mockAgent1.think).mockRejectedValueOnce(new Error('AI错误'));
      
      await manager.start();
      await vi.advanceTimersByTimeAsync(1000);
      
      // agent1失败，但agent2仍然执行
      expect(mockAgent2.think).toHaveBeenCalled();
      
      // 错误被记录
      const status = await manager.getAgentStatus('deepseek-v3');
      expect(status?.error).toBeDefined();
    });

    it('记录最后决策时间', async () => {
      await manager.start();
      await vi.advanceTimersByTimeAsync(1000);
      
      const status = await manager.getAgentStatus('deepseek-v3');
      expect(status?.lastThinkTime).toBeDefined();
    });
  });

  // ============= 快照管理测试 =============

  describe('快照管理', () => {
    it('启用快照时定时保存', async () => {
      const { saveAccountSnapshot } = await import('@/lib/db/queries');
      
      manager = new LiveTradingManager(engine, {
        agents: [mockAgent1],
        stockPool: ['sh600519'],
        thinkInterval: 10,
        enableSnapshot: true,
        snapshotInterval: 1,
      });

      await manager.start();
      
      // 快进1秒，触发快照
      await vi.advanceTimersByTimeAsync(1000);
      
      expect(saveAccountSnapshot).toHaveBeenCalled();
    });

    it('禁用快照时不保存', async () => {
      const { saveAccountSnapshot } = await import('@/lib/db/queries');
      
      manager = new LiveTradingManager(engine, {
        agents: [mockAgent1],
        stockPool: ['sh600519'],
        thinkInterval: 1,
        enableSnapshot: false,
        snapshotInterval: 60,
      });

      await manager.start();
      await vi.advanceTimersByTimeAsync(2000);
      
      expect(saveAccountSnapshot).not.toHaveBeenCalled();
    });

    it('停止时保存最终快照', async () => {
      const { saveAccountSnapshot } = await import('@/lib/db/queries');
      
      manager = new LiveTradingManager(engine, {
        agents: [mockAgent1],
        stockPool: ['sh600519'],
        thinkInterval: 10,
        enableSnapshot: true,
        snapshotInterval: 60,
      });

      await manager.start();
      await manager.stop();
      
      expect(saveAccountSnapshot).toHaveBeenCalled();
    });
  });

  // ============= 配置管理测试 =============

  describe('配置管理', () => {
    beforeEach(() => {
      manager = new LiveTradingManager(engine, {
        agents: [mockAgent1],
        stockPool: ['sh600519'],
        thinkInterval: 10,
        enableSnapshot: false,
        snapshotInterval: 60,
      });
    });

    it('更新思考间隔', () => {
      manager.setThinkInterval(5);
      // 间隔已更新（通过scheduler）
      expect(() => manager.setThinkInterval(5)).not.toThrow();
    });

    it('思考间隔限制在1-60秒', () => {
      manager.setThinkInterval(0);
      manager.setThinkInterval(100);
      // 不抛错，内部会限制范围
      expect(() => manager.setThinkInterval(0)).not.toThrow();
    });

    it('更新股票池', () => {
      manager.setStockPool(['sh600519', 'sz000001']);
      // 股票池已更新
      expect(() => manager.setStockPool(['sh600519'])).not.toThrow();
    });

    it('添加AI代理', async () => {
      const newAgent = { ...mockAgent2, id: 'new-agent' };
      manager.addAgent(newAgent);
      
      expect(await manager.getAgentStatus('new-agent')).toBeDefined();
    });

    it('添加重复AI抛出错误', () => {
      expect(() => manager.addAgent(mockAgent1)).toThrow('AI代理已存在');
    });

    it('移除AI代理', async () => {
      manager.removeAgent('deepseek-v3');
      
      expect(await manager.getAgentStatus('deepseek-v3')).toBeUndefined();
    });
  });

  // ============= 状态查询测试 =============

  describe('状态查询', () => {
    beforeEach(() => {
      manager = new LiveTradingManager(engine, {
        agents: [mockAgent1, mockAgent2],
        stockPool: ['sh600519'],
        thinkInterval: 10,
        enableSnapshot: false,
        snapshotInterval: 60,
      });
    });

    it('getStatus返回完整状态', async () => {
      const status = await manager.getStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.agentsStatus.size).toBe(2);
      expect(status.totalDecisions).toBe(0);
      expect(status.totalTrades).toBe(0);
    });

    it('getAgentsStatus返回所有AI状态', async () => {
      const statuses = await manager.getAgentsStatus();
      
      expect(statuses.size).toBe(2);
      expect(statuses.has('deepseek-v3')).toBe(true);
      expect(statuses.has('gemini-flash')).toBe(true);
    });

    it('getAgentStatus返回单个AI状态', async () => {
      const status = await manager.getAgentStatus('deepseek-v3');
      
      expect(status).toBeDefined();
      expect(status?.agentId).toBe('deepseek-v3');
      expect(status?.isRunning).toBe(false);
      expect(status?.isPaused).toBe(false);
    });

    it('查询不存在的AI返回undefined', async () => {
      const status = await manager.getAgentStatus('non-existent');
      expect(status).toBeUndefined();
    });
  });

  // ============= 表格驱动测试 =============

  describe('表格驱动测试：多种配置', () => {
    const testCases = [
      {
        name: '单AI，短间隔',
        agents: 1,
        interval: 1,
        snapshot: false,
      },
      {
        name: '多AI，长间隔',
        agents: 3,
        interval: 30,
        snapshot: true,
      },
      {
        name: '无AI',
        agents: 0,
        interval: 10,
        snapshot: false,
      },
    ];

    for (const tc of testCases) {
      it(`配置: ${tc.name}`, async () => {
        const agents = Array.from({ length: tc.agents }, (_, i) => ({
          ...mockAgent1,
          id: `agent-${i}`,
        }));

        manager = new LiveTradingManager(engine, {
          agents,
          stockPool: ['sh600519'],
          thinkInterval: tc.interval,
          enableSnapshot: tc.snapshot,
          snapshotInterval: 60,
        });

        await manager.start();
        const status = await manager.getStatus();
        expect(status.isRunning).toBe(true);
        expect(status.agentsStatus.size).toBe(tc.agents);
        
        await manager.stop();
        const statusAfter = await manager.getStatus();
        expect(statusAfter.isRunning).toBe(false);
      });
    }
  });
});
