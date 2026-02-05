/**
 * 交易调度器单元测试
 * Phase 5.1: 调度器基础测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TradingScheduler } from './scheduler';

// Mock trading rules
vi.mock('@/lib/trading/rules', () => ({
  isTradingTime: vi.fn(() => true),
  getTradingSession: vi.fn(() => 'morning'),
}));

import { isTradingTime, getTradingSession } from '@/lib/trading/rules';

describe('TradingScheduler', () => {
  let mockOnTick: vi.MockedFunction<() => Promise<void>>;
  let scheduler: TradingScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockOnTick = vi.fn().mockResolvedValue(undefined);
    
    // 默认mock为交易时间
    vi.mocked(isTradingTime).mockReturnValue(true);
    vi.mocked(getTradingSession).mockReturnValue('morning');
  });

  afterEach(() => {
    scheduler?.stop();
    vi.useRealTimers();
  });

  // ============= 构造函数测试 =============

  describe('constructor', () => {
    it('使用默认配置创建调度器', () => {
      scheduler = new TradingScheduler(mockOnTick);
      
      expect(scheduler.getStatus()).toBe('stopped');
      expect(scheduler.getConfig().interval).toBe(10);
      expect(scheduler.getConfig().checkTradingTime).toBe(true);
    });

    it('使用自定义配置创建调度器', () => {
      scheduler = new TradingScheduler(mockOnTick, {
        interval: 5,
        checkTradingTime: false,
      });
      
      expect(scheduler.getConfig().interval).toBe(5);
      expect(scheduler.getConfig().checkTradingTime).toBe(false);
    });

    it('间隔时间限制在1-60秒范围内', () => {
      // 测试下限
      scheduler = new TradingScheduler(mockOnTick, { interval: 0, checkTradingTime: true });
      expect(scheduler.getConfig().interval).toBe(1);

      // 测试上限
      scheduler = new TradingScheduler(mockOnTick, { interval: 100, checkTradingTime: true });
      expect(scheduler.getConfig().interval).toBe(60);
    });
  });

  // ============= 启动停止测试 =============

  describe('start/stop', () => {
    beforeEach(() => {
      scheduler = new TradingScheduler(mockOnTick, { interval: 1, checkTradingTime: true });
    });

    it('启动调度器改变状态为running', () => {
      scheduler.start();
      expect(scheduler.getStatus()).toBe('running');
    });

    it('重复启动不会创建多个定时器', () => {
      scheduler.start();
      scheduler.start();
      expect(scheduler.getStatus()).toBe('running');
      
      // 快进1秒，应该只执行一次
      vi.advanceTimersByTime(1000);
      expect(mockOnTick).toHaveBeenCalledTimes(1);
    });

    it('停止调度器改变状态为stopped', () => {
      scheduler.start();
      scheduler.stop();
      expect(scheduler.getStatus()).toBe('stopped');
      
      // 快进时间，不应该执行
      vi.advanceTimersByTime(2000);
      expect(mockOnTick).not.toHaveBeenCalled();
    });

    it('启动时可以指定新的间隔时间', () => {
      scheduler.start(3);
      expect(scheduler.getConfig().interval).toBe(3);
    });
  });

  // ============= 暂停恢复测试 =============

  describe('pause/resume', () => {
    beforeEach(() => {
      scheduler = new TradingScheduler(mockOnTick, { interval: 1, checkTradingTime: true });
    });

    it('暂停调度器改变状态为paused', () => {
      scheduler.start();
      scheduler.pause();
      expect(scheduler.getStatus()).toBe('paused');
      
      // 快进时间，不应该执行
      vi.advanceTimersByTime(2000);
      expect(mockOnTick).not.toHaveBeenCalled();
    });

    it('恢复调度器改变状态为running并继续执行', () => {
      scheduler.start();
      scheduler.pause();
      scheduler.resume();
      expect(scheduler.getStatus()).toBe('running');
      
      // 快进时间，应该执行
      vi.advanceTimersByTime(1000);
      expect(mockOnTick).toHaveBeenCalledTimes(1);
    });

    it('只有running状态才能暂停', () => {
      // stopped状态暂停无效
      scheduler.pause();
      expect(scheduler.getStatus()).toBe('stopped');
    });

    it('只有paused状态才能恢复', () => {
      // stopped状态恢复无效
      scheduler.resume();
      expect(scheduler.getStatus()).toBe('stopped');
    });
  });

  // ============= 定时执行测试 =============

  describe('定时执行', () => {
    beforeEach(() => {
      scheduler = new TradingScheduler(mockOnTick, { interval: 1, checkTradingTime: true });
    });

    it('按指定间隔执行回调函数', async () => {
      scheduler.start();
      
      // 快进1秒，执行第一次
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockOnTick).toHaveBeenCalledTimes(1);
      
      // 再快进1秒，执行第二次
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockOnTick).toHaveBeenCalledTimes(2);
    });

    it('回调函数抛错不会停止调度', async () => {
      mockOnTick.mockRejectedValueOnce(new Error('测试错误'));
      
      scheduler.start();
      
      // 第一次执行出错
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockOnTick).toHaveBeenCalledTimes(1);
      
      // 继续执行第二次
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockOnTick).toHaveBeenCalledTimes(2);
    });

    it('setInterval 更新间隔时间', () => {
      scheduler.start();
      scheduler.setInterval(2);
      
      expect(scheduler.getConfig().interval).toBe(2);
    });

    it('运行中setInterval会重新调度', () => {
      scheduler.start();
      
      // 快进0.5秒，还没到执行时间
      vi.advanceTimersByTime(500);
      expect(mockOnTick).not.toHaveBeenCalled();
      
      // 更新间隔为2秒，会重新调度
      scheduler.setInterval(2);
      
      // 再快进1秒（总共1.5秒），仍然没到新的执行时间
      vi.advanceTimersByTime(1000);
      expect(mockOnTick).not.toHaveBeenCalled();
      
      // 再快进1秒（总共2.5秒），超过新间隔，应该执行
      vi.advanceTimersByTime(1000);
      expect(mockOnTick).toHaveBeenCalledTimes(1);
    });
  });

  // ============= 交易时间检查测试 =============

  describe('交易时间检查', () => {
    it('非交易时间跳过执行', () => {
      vi.mocked(isTradingTime).mockReturnValue(false);
      
      scheduler = new TradingScheduler(mockOnTick, { interval: 1, checkTradingTime: true });
      scheduler.start();
      
      vi.advanceTimersByTime(1000);
      expect(mockOnTick).not.toHaveBeenCalled();
    });

    it('午休时间跳过执行', () => {
      vi.mocked(isTradingTime).mockReturnValue(true);
      vi.mocked(getTradingSession).mockReturnValue('lunch');
      
      scheduler = new TradingScheduler(mockOnTick, { interval: 1, checkTradingTime: true });
      scheduler.start();
      
      vi.advanceTimersByTime(1000);
      expect(mockOnTick).not.toHaveBeenCalled();
    });

    it('关闭交易时间检查时总是执行', () => {
      vi.mocked(isTradingTime).mockReturnValue(false);
      
      scheduler = new TradingScheduler(mockOnTick, { interval: 1, checkTradingTime: false });
      scheduler.start();
      
      vi.advanceTimersByTime(1000);
      expect(mockOnTick).toHaveBeenCalledTimes(1);
    });

    it('表格驱动测试：不同交易时段', () => {
      const testCases = [
        { session: 'morning', shouldExecute: true },
        { session: 'afternoon', shouldExecute: true },
        { session: 'lunch', shouldExecute: false },
        { session: 'closed', shouldExecute: false },
      ] as const;

      for (const tc of testCases) {
        // 重置mock
        mockOnTick.mockClear();
        vi.mocked(isTradingTime).mockReturnValue(tc.session !== 'closed');
        vi.mocked(getTradingSession).mockReturnValue(tc.session);
        
        scheduler = new TradingScheduler(mockOnTick, { interval: 1, checkTradingTime: true });
        scheduler.start();
        
        vi.advanceTimersByTime(1000);
        
        if (tc.shouldExecute) {
          expect(mockOnTick).toHaveBeenCalledTimes(1);
        } else {
          expect(mockOnTick).not.toHaveBeenCalled();
        }
        
        scheduler.stop();
      }
    });
  });

  // ============= 手动执行测试 =============

  describe('executeOnce', () => {
    beforeEach(() => {
      scheduler = new TradingScheduler(mockOnTick, { interval: 1, checkTradingTime: true });
    });

    it('手动执行一次', async () => {
      await scheduler.executeOnce();
      expect(mockOnTick).toHaveBeenCalledTimes(1);
    });

    it('手动执行时抛错会向上传播', async () => {
      mockOnTick.mockRejectedValueOnce(new Error('测试错误'));
      
      await expect(scheduler.executeOnce()).rejects.toThrow('测试错误');
    });

    it('手动执行不受交易时间限制', async () => {
      vi.mocked(isTradingTime).mockReturnValue(false);
      
      await scheduler.executeOnce();
      expect(mockOnTick).toHaveBeenCalledTimes(1);
    });
  });

  // ============= 工具方法测试 =============

  describe('工具方法', () => {
    beforeEach(() => {
      scheduler = new TradingScheduler(mockOnTick, { interval: 5, checkTradingTime: true });
    });

    it('getNextExecutionTime 返回下次执行时间', () => {
      scheduler.start();
      
      const nextTime = scheduler.getNextExecutionTime();
      expect(nextTime).toBeGreaterThan(Date.now());
      expect(nextTime).toBeLessThanOrEqual(Date.now() + 5000);
    });

    it('未运行时 getNextExecutionTime 返回null', () => {
      expect(scheduler.getNextExecutionTime()).toBeNull();
    });

    it('暂停时 getNextExecutionTime 返回null', () => {
      scheduler.start();
      scheduler.pause();
      expect(scheduler.getNextExecutionTime()).toBeNull();
    });
  });
});