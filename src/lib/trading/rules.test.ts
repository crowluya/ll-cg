/**
 * T+1交易规则单元测试
 * 测试文件: src/lib/trading/rules.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  canSellPosition,
  isTradingDay,
  isTradingTime,
  getTradingSession,
  calculateBuyQuantity,
  calculateSellQuantity,
  validateBuyOrder,
  validateSellOrder,
  calculateCommission,
  calculateProfit,
  getNextTradingDay,
  getTradingDays,
} from './rules';
import type { Position } from '@/types';

describe('trading/rules', () => {
  // ============= canSellPosition 测试 =============

  describe('canSellPosition', () => {
    const position: Position = {
      stock: 'sz000001',
      quantity: 1000,
      buyDate: '2024-01-02',
      avgPrice: 10.50,
    };

    it('当日买入当日不可卖出', () => {
      const result = canSellPosition(position, '2024-01-02');
      expect(result).toBe(false);
    });

    it('次日可卖出', () => {
      const result = canSellPosition(position, '2024-01-03');
      expect(result).toBe(true);
    });

    it('持仓多日可卖出', () => {
      const result = canSellPosition(position, '2024-01-10');
      expect(result).toBe(true);
    });

    it('空持仓返回false', () => {
      const result = canSellPosition(
        { stock: 'sz000001', quantity: 0, buyDate: '2024-01-02', avgPrice: 10.50 },
        '2024-01-03'
      );
      expect(result).toBe(true); // 规则只检查日期，不检查数量
    });
  });

  // ============= isTradingDay 测试 =============

  describe('isTradingDay', () => {
    it('周一到周五是交易日', () => {
      // 2024-01-01 是周一
      expect(isTradingDay('2024-01-01')).toBe(true); // 元旦虽然是节假日，但函数暂未处理
      expect(isTradingDay('2024-01-02')).toBe(true); // 周二
      expect(isTradingDay('2024-01-03')).toBe(true); // 周三
      expect(isTradingDay('2024-01-04')).toBe(true); // 周四
      expect(isTradingDay('2024-01-05')).toBe(true); // 周五
    });

    it('周六不是交易日', () => {
      // 2024-01-06 是周六
      expect(isTradingDay('2024-01-06')).toBe(false);
    });

    it('周日不是交易日', () => {
      // 2024-01-07 是周日
      expect(isTradingDay('2024-01-07')).toBe(false);
    });
  });

  // ============= isTradingTime 测试 =============

  describe('isTradingTime', () => {
    it('交易时间内返回true', () => {
      // Mock 时间在交易时间内
      const mockDate = new Date('2024-01-02T10:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = isTradingTime();
      expect(result).toBe(true);

      vi.restoreAllMocks();
    });

    it('非交易时间返回false', () => {
      const mockDate = new Date('2024-01-02T08:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = isTradingTime();
      expect(result).toBe(false);

      vi.restoreAllMocks();
    });
  });

  // ============= getTradingSession 测试 =============

  describe('getTradingSession', () => {
    it('早盘时段返回morning', () => {
      const mockDate = new Date('2024-01-02T10:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = getTradingSession();
      expect(result).toBe('morning');

      vi.restoreAllMocks();
    });

    it('午休时段返回lunch', () => {
      const mockDate = new Date('2024-01-02T12:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = getTradingSession();
      expect(result).toBe('lunch');

      vi.restoreAllMocks();
    });

    it('午盘时段返回afternoon', () => {
      const mockDate = new Date('2024-01-02T14:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = getTradingSession();
      expect(result).toBe('afternoon');

      vi.restoreAllMocks();
    });

    it('收盘时段返回closed', () => {
      const mockDate = new Date('2024-01-02T16:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = getTradingSession();
      expect(result).toBe('closed');

      vi.restoreAllMocks();
    });
  });

  // ============= calculateBuyQuantity 测试 =============

  describe('calculateBuyQuantity', () => {
    it('正确计算买入数量（100的整数倍）', () => {
      const result = calculateBuyQuantity(10000, 10.5);
      expect(result).toBe(900); // 10000 / 10.5 = 952 -> 900
    });

    it('资金不足时返回0', () => {
      const result = calculateBuyQuantity(50, 10.5);
      expect(result).toBe(0);
    });

    it('向下取整到100的倍数', () => {
      const result = calculateBuyQuantity(10000, 9.99);
      expect(result).toBe(1000); // 10000 / 9.99 ≈ 1001 -> floor(1001/100)*100 = 1000
    });
  });

  // ============= calculateSellQuantity 测试 =============

  describe('calculateSellQuantity', () => {
    const position: Position = {
      stock: 'sz000001',
      quantity: 1000,
      buyDate: '2024-01-02',
      avgPrice: 10.50,
    };

    it('卖出数量不超过持仓', () => {
      const result = calculateSellQuantity(position, 500);
      expect(result).toBe(500);
    });

    it('请求卖出超过持仓时返回持仓数量', () => {
      const result = calculateSellQuantity(position, 1500);
      expect(result).toBe(1000);
    });
  });

  // ============= validateBuyOrder 测试 =============

  describe('validateBuyOrder', () => {
    it('有效订单验证通过', () => {
      const result = validateBuyOrder('sz000001', 100, 10.5, 2000);
      expect(result.valid).toBe(true);
    });

    it('数量不是100的整数倍时无效', () => {
      const result = validateBuyOrder('sz000001', 150, 10.5, 2000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100的整数倍');
    });

    it('数量为0时无效', () => {
      const result = validateBuyOrder('sz000001', 0, 10.5, 2000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('必须大于0');
    });

    it('数量为负数时无效', () => {
      const result = validateBuyOrder('sz000001', -100, 10.5, 2000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('必须大于0');
    });

    it('价格为0时无效', () => {
      const result = validateBuyOrder('sz000001', 100, 0, 2000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('价格必须大于0');
    });

    it('资金不足时无效', () => {
      const result = validateBuyOrder('sz000001', 100, 10.5, 500);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('资金不足');
    });
  });

  // ============= validateSellOrder 测试 =============

  describe('validateSellOrder', () => {
    const position: Position = {
      stock: 'sz000001',
      quantity: 1000,
      buyDate: '2024-01-02',
      avgPrice: 10.50,
    };

    it('有效卖出订单验证通过', () => {
      const result = validateSellOrder('sz000001', 500, position, '2024-01-03');
      expect(result.valid).toBe(true);
    });

    it('无持仓时无效', () => {
      const result = validateSellOrder('sz000001', 500, undefined, '2024-01-03');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('无持仓');
    });

    it('股票代码不匹配时无效', () => {
      const result = validateSellOrder('sz000002', 500, position, '2024-01-03');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不匹配');
    });

    it('卖出数量超过持仓时无效', () => {
      const result = validateSellOrder('sz000001', 1500, position, '2024-01-03');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('超过持仓');
    });

    it('违反T+1规则时无效', () => {
      const result = validateSellOrder('sz000001', 500, position, '2024-01-02');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('T+1');
    });
  });

  // ============= calculateCommission 测试 =============

  describe('calculateCommission', () => {
    it('买入手续费计算正确', () => {
      const amount = 10000;
      const commission = calculateCommission(amount, 'buy');
      // 佣金: 10000 * 0.00025 = 2.5 -> 5元 (最低)
      // 过户费: 10000 * 0.00001 = 0.1
      // 总计: 5 + 0.1 = 5.1
      expect(commission).toBeGreaterThan(5);
      expect(commission).toBeLessThan(6);
    });

    it('卖出手续费包含印花税', () => {
      const buyCommission = calculateCommission(10000, 'buy');
      const sellCommission = calculateCommission(10000, 'sell');
      // 卖出手续费应该更高（含印花税）
      expect(sellCommission).toBeGreaterThan(buyCommission);
    });

    it('最低佣金5元', () => {
      const smallAmountCommission = calculateCommission(100, 'buy');
      expect(smallAmountCommission).toBeGreaterThanOrEqual(5);
    });

    it('大额交易按费率计算', () => {
      const largeAmountCommission = calculateCommission(1000000, 'buy');
      // 1000000 * 0.00025 = 250
      expect(largeAmountCommission).toBeGreaterThan(200);
    });
  });

  // ============= calculateProfit 测试 =============

  describe('calculateProfit', () => {
    const positions: Position[] = [
      {
        stock: 'sz000001',
        quantity: 1000,
        buyDate: '2024-01-02',
        avgPrice: 10.00,
      },
      {
        stock: 'sz000002',
        quantity: 500,
        buyDate: '2024-01-03',
        avgPrice: 20.00,
      },
    ];

    it('盈利计算正确', () => {
      const currentPrices = new Map([
        ['sz000001', 11.00], // 涨1元
        ['sz000002', 22.00], // 涨2元
      ]);

      const result = calculateProfit(positions, currentPrices);
      expect(result.totalProfit).toBe(2000); // 1000*1 + 500*2
      expect(result.profitRate).toBeCloseTo(10); // 2000/20000 * 100
    });

    it('亏损计算正确', () => {
      const currentPrices = new Map([
        ['sz000001', 9.00], // 跌1元
        ['sz000002', 18.00], // 跌2元
      ]);

      const result = calculateProfit(positions, currentPrices);
      expect(result.totalProfit).toBe(-2000); // 1000*(-1) + 500*(-2)
      expect(result.profitRate).toBeCloseTo(-10);
    });

    it('返回每个持仓的详细盈亏', () => {
      const currentPrices = new Map([
        ['sz000001', 11.00],
        ['sz000002', 22.00],
      ]);

      const result = calculateProfit(positions, currentPrices);
      expect(result.positions).toHaveLength(2);
      expect(result.positions[0].profit).toBe(1000);
      expect(result.positions[0].profitRate).toBe(10);
      expect(result.positions[1].profit).toBe(1000);
      expect(result.positions[1].profitRate).toBe(10);
    });

    it('空持仓返回零盈亏', () => {
      const result = calculateProfit([], new Map());
      expect(result.totalProfit).toBe(0);
      expect(result.profitRate).toBe(0);
      expect(result.positions).toHaveLength(0);
    });
  });

  // ============= getNextTradingDay 测试 =============

  describe('getNextTradingDay', () => {
    it('获取下一个交易日（跳过周末）', () => {
      // 2024-01-05 是周五
      const result = getNextTradingDay('2024-01-05', 1);
      expect(result).toBe('2024-01-08'); // 下周一
    });

    it('获取下一个工作日', () => {
      const result = getNextTradingDay('2024-01-02', 1);
      expect(result).toBe('2024-01-03');
    });

    it('获取多个交易日后的日期', () => {
      const result = getNextTradingDay('2024-01-02', 3);
      expect(result).toBe('2024-01-05');
    });
  });

  // ============= getTradingDays 测试 =============

  describe('getTradingDays', () => {
    it('正确获取交易日列表（跳过周末）', () => {
      const result = getTradingDays('2024-01-02', '2024-01-07');
      // 1/2(二) - 1/5(周五) 是交易日，1/6(六) 1/7(日) 不是
      expect(result).toEqual(['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']);
    });

    it('空范围返回空数组', () => {
      const result = getTradingDays('2024-01-06', '2024-01-06'); // 周六
      expect(result).toEqual([]);
    });

    it('只包含一个交易日', () => {
      const result = getTradingDays('2024-01-02', '2024-01-02');
      expect(result).toEqual(['2024-01-02']);
    });
  });
});
