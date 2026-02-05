/**
 * 交易调度器
 * Phase 5.2: 调度器实现
 * 
 * 负责定时触发AI决策，支持暂停/恢复，检查交易时间
 */

import { isTradingTime, getTradingSession } from '@/lib/trading/rules';

export type SchedulerStatus = 'stopped' | 'running' | 'paused';

export interface SchedulerConfig {
  interval: number; // 思考间隔（秒）1-60
  checkTradingTime: boolean; // 是否检查交易时间
}

/**
 * 交易调度器类
 * 遵循constitution.md：无全局变量，通过依赖注入
 */
export class TradingScheduler {
  private status: SchedulerStatus = 'stopped';
  private intervalId: NodeJS.Timeout | null = null;
  private readonly config: Required<SchedulerConfig>;
  private readonly onTick: () => Promise<void>;

  /**
   * 创建调度器实例
   * @param onTick 每次触发时执行的回调函数
   * @param config 调度器配置
   */
  constructor(
    onTick: () => Promise<void>,
    config: SchedulerConfig = { interval: 10, checkTradingTime: true }
  ) {
    this.onTick = onTick;
    this.config = {
      interval: Math.max(1, Math.min(60, config.interval)), // 限制在1-60秒
      checkTradingTime: config.checkTradingTime ?? true,
    };
  }

  /**
   * 启动调度器
   * @param interval 可选的新间隔时间
   */
  start(interval?: number): void {
    if (this.status === 'running') {
      return; // 已经在运行
    }

    if (interval !== undefined) {
      this.config.interval = Math.max(1, Math.min(60, interval));
    }

    this.status = 'running';
    this.scheduleNext();
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.status = 'stopped';
  }

  /**
   * 暂停调度器
   */
  pause(): void {
    if (this.status === 'running') {
      if (this.intervalId) {
        clearTimeout(this.intervalId);
        this.intervalId = null;
      }
      this.status = 'paused';
    }
  }

  /**
   * 恢复调度器
   */
  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.scheduleNext();
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): SchedulerStatus {
    return this.status;
  }

  /**
   * 获取配置
   */
  getConfig(): Required<SchedulerConfig> {
    return { ...this.config };
  }

  /**
   * 更新间隔时间
   */
  setInterval(interval: number): void {
    this.config.interval = Math.max(1, Math.min(60, interval));
    
    // 如果正在运行，重新调度
    if (this.status === 'running') {
      this.stop();
      this.start();
    }
  }

  /**
   * 调度下一次执行
   */
  private scheduleNext(): void {
    if (this.status !== 'running') {
      return;
    }

    this.intervalId = setTimeout(async () => {
      try {
        // 检查交易时间
        if (this.config.checkTradingTime && !this.shouldExecute()) {
          console.log('[TradingScheduler] 非交易时间，跳过执行');
          this.scheduleNext(); // 继续调度下一次
          return;
        }

        // 执行回调
        await this.onTick();
      } catch (error) {
        console.error('[TradingScheduler] 执行回调时出错:', error);
        // 继续调度，不因单次错误停止
      }

      // 调度下一次执行
      this.scheduleNext();
    }, this.config.interval * 1000);
  }

  /**
   * 判断是否应该执行（检查交易时间）
   */
  private shouldExecute(): boolean {
    if (!this.config.checkTradingTime) {
      return true;
    }

    // 检查是否在交易时间内
    if (!isTradingTime()) {
      return false;
    }

    // 检查具体时段（可以排除午休时间）
    const session = getTradingSession();
    return session === 'morning' || session === 'afternoon';
  }

  /**
   * 立即执行一次（手动触发）
   */
  async executeOnce(): Promise<void> {
    try {
      await this.onTick();
    } catch (error) {
      console.error('[TradingScheduler] 手动执行时出错:', error);
      throw error;
    }
  }

  /**
   * 获取下次执行时间（毫秒）
   */
  getNextExecutionTime(): number | null {
    if (this.status !== 'running' || !this.intervalId) {
      return null;
    }
    return Date.now() + (this.config.interval * 1000);
  }
}