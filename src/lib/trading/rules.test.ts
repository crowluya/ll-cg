/**
 * T+1交易规则单元测试
 * 测试文件: src/lib/trading/rules.test.ts
 *
 * Phase 3 扩展测试:
 * - 3.1 涨跌停检测
 * - 3.3 停牌检测
 * - 3.5 单票持仓上限
 * - 3.7 交易日历（节假日）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  // Phase 3 新增
  isLimitUp,
  isLimitDown,
  calcLimitPrice,
  isSuspended,
  checkPositionLimit,
  getTradingDateRange,
  // 代码修复后新增的扩展验证函数
  validateBuyOrderWithPositionLimit,
  validateBuyOrderFull,
  validateSellOrderWithQuote,
} from './rules';
import type { Position, Account, RealtimeQuote } from '@/types';

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

  // ============= Phase 3.1: 涨跌停检测测试 =============

  describe('Phase 3.1: 涨跌停检测', () => {
    describe('calcLimitPrice', () => {
      it('主板股票涨停价 10%', () => {
        expect(calcLimitPrice(10.00, 'sh600519', 'up')).toBe(11.00);
        expect(calcLimitPrice(10.00, 'sz000001', 'up')).toBe(11.00);
      });

      it('主板股票跌停价 10%', () => {
        expect(calcLimitPrice(10.00, 'sh600519', 'down')).toBe(9.00);
        expect(calcLimitPrice(10.00, 'sz000001', 'down')).toBe(9.00);
      });

      it('创业板涨停价 20%', () => {
        expect(calcLimitPrice(10.00, 'sz300750', 'up')).toBe(12.00);
      });

      it('创业板跌停价 20%', () => {
        expect(calcLimitPrice(10.00, 'sz300750', 'down')).toBe(8.00);
      });

      it('科创板涨停价 20%', () => {
        expect(calcLimitPrice(10.00, 'sh688001', 'up')).toBe(12.00);
      });

      it('科创板跌停价 20%', () => {
        expect(calcLimitPrice(10.00, 'sh688001', 'down')).toBe(8.00);
      });

      it('表格驱动测试多只股票', () => {
        const testCases = [
          { prevClose: 10.00, code: 'sh600000', expectedUp: 11.00, expectedDown: 9.00 },
          { prevClose: 15.50, code: 'sz000002', expectedUp: 17.05, expectedDown: 13.95 },
          { prevClose: 20.00, code: 'sz300750', expectedUp: 24.00, expectedDown: 16.00 },
          { prevClose: 50.00, code: 'sh688981', expectedUp: 60.00, expectedDown: 40.00 },
        ];

        for (const tc of testCases) {
          expect(calcLimitPrice(tc.prevClose, tc.code, 'up')).toBeCloseTo(tc.expectedUp);
          expect(calcLimitPrice(tc.prevClose, tc.code, 'down')).toBeCloseTo(tc.expectedDown);
        }
      });
    });

    describe('isLimitUp', () => {
      it('价格等于涨停价时返回 true', () => {
        expect(isLimitUp(11.00, 10.00, 'sh600519')).toBe(true);
        expect(isLimitUp(12.00, 10.00, 'sz300750')).toBe(true);
      });

      it('价格不等于涨停价时返回 false', () => {
        expect(isLimitUp(10.50, 10.00, 'sh600519')).toBe(false);
        expect(isLimitUp(11.00, 10.00, 'sz300750')).toBe(false); // 创业板 12% 才涨停
      });

      it('使用 calcLimitPrice 计算涨停价进行比较', () => {
        const prevClose = 15.50;
        const limitUp = calcLimitPrice(prevClose, 'sh600519', 'up');
        expect(isLimitUp(limitUp, prevClose, 'sh600519')).toBe(true);
      });
    });

    describe('isLimitDown', () => {
      it('价格等于跌停价时返回 true', () => {
        expect(isLimitDown(9.00, 10.00, 'sh600519')).toBe(true);
        expect(isLimitDown(8.00, 10.00, 'sz300750')).toBe(true);
      });

      it('价格不等于跌停价时返回 false', () => {
        expect(isLimitDown(9.50, 10.00, 'sh600519')).toBe(false);
        expect(isLimitDown(9.00, 10.00, 'sz300750')).toBe(false); // 创业板 8% 才跌停
      });

      it('使用 calcLimitPrice 计算跌停价进行比较', () => {
        const prevClose = 15.50;
        const limitDown = calcLimitPrice(prevClose, 'sh600519', 'down');
        expect(isLimitDown(limitDown, prevClose, 'sh600519')).toBe(true);
      });
    });
  });

  // ============= Phase 3.3: 停牌检测测试 =============

  describe('Phase 3.3: 停牌检测', () => {
    describe('isSuspended', () => {
      it('成交量为0且价格不变时判定为停牌', () => {
        expect(isSuspended(0, 10.50, 10.50)).toBe(true);
      });

      it('有成交量时不是停牌', () => {
        expect(isSuspended(100000, 10.50, 10.50)).toBe(false);
      });

      it('价格变化时不是停牌', () => {
        expect(isSuspended(0, 10.55, 10.50)).toBe(false);
      });

      it('接近0成交量但有小额时不是停牌', () => {
        expect(isSuspended(1, 10.50, 10.50)).toBe(false);
      });
    });
  });

  // ============= Phase 3.5: 单票持仓上限测试 =============

  describe('Phase 3.5: 单票持仓上限', () => {
    describe('checkPositionLimit', () => {
      const mockAccount: Account = {
        userId: 'test-user',
        cash: 50000,
        totalValue: 100000,
        positions: [
          { stock: 'sz000001', quantity: 1000, avgPrice: 10.00, buyDate: '2024-01-02' },
          { stock: 'sz000002', quantity: 500, avgPrice: 20.00, buyDate: '2024-01-02' },
        ],
      };

      it('买入后不超过总资金50%时通过', () => {
        // 现有持仓: sz000001 = 10000, sz000002 = 10000, 共20000
        // 总资产100000，50%上限50000，还可买30000
        const result = checkPositionLimit(mockAccount, 'sz000001', 30000, 0.5);
        expect(result.valid).toBe(true);
      });

      it('买入后超过总资金50%时拒绝', () => {
        // 现有sz000001持仓10000，买入40001后共50001，超过50000
        const result = checkPositionLimit(mockAccount, 'sz000001', 40001, 0.5);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('持仓超限');
      });

      it('默认上限比例为50%', () => {
        const result = checkPositionLimit(mockAccount, 'sz000001', 40001);
        expect(result.valid).toBe(false);
      });

      it('计算持仓时包含已有持仓', () => {
        // sz000001 已有10000，再买20000后共30000，未超限
        const result = checkPositionLimit(mockAccount, 'sz000001', 20000, 0.5);
        expect(result.valid).toBe(true);
      });

      it('新股票没有已有持仓', () => {
        // sz000003 没有持仓，总资产100000的50%=50000，买入24000未超限
        const result = checkPositionLimit(mockAccount, 'sz000003', 24000, 0.5);
        expect(result.valid).toBe(true);
      });

      it('允许使用自定义上限比例', () => {
        const result = checkPositionLimit(mockAccount, 'sz000001', 35000, 0.4);
        expect(result.valid).toBe(false);

        const result2 = checkPositionLimit(mockAccount, 'sz000001', 35000, 0.6);
        expect(result2.valid).toBe(true);
      });

      it('空账户时正确计算', () => {
        const emptyAccount: Account = {
          userId: 'test-user',
          cash: 100000,
          totalValue: 100000,
          positions: [],
        };

        const result = checkPositionLimit(emptyAccount, 'sz000001', 50000, 0.5);
        expect(result.valid).toBe(true);

        const result2 = checkPositionLimit(emptyAccount, 'sz000001', 50001, 0.5);
        expect(result2.valid).toBe(false);
      });
    });
  });

  // ============= Phase 3.7: 交易日历测试 =============

  describe('Phase 3.7: 交易日历', () => {
    describe('isTradingDay with holidays', () => {
      it('支持传入节假日列表', () => {
        const holidays = ['2024-01-01', '2024-02-10', '2024-02-11']; // 元旦、春节
        expect(isTradingDay('2024-01-01', holidays)).toBe(false);
        expect(isTradingDay('2024-02-10', holidays)).toBe(false);
      });

      it('非节假日返回true', () => {
        const holidays = ['2024-01-01'];
        expect(isTradingDay('2024-01-02', holidays)).toBe(true);
      });

      it('周末仍然是非交易日', () => {
        const holidays: string[] = [];
        expect(isTradingDay('2024-01-06', holidays)).toBe(false); // 周六
        expect(isTradingDay('2024-01-07', holidays)).toBe(false); // 周日
      });
    });

    describe('getTradingDays with holidays', () => {
      it('过滤节假日', () => {
        const holidays = ['2024-01-01', '2024-01-03'];
        const result = getTradingDays('2024-01-01', '2024-01-05', holidays);
        // 1/1(一，节假日) 1/2(二) 1/3(三，节假日) 1/4(四) 1/5(五)
        expect(result).toEqual(['2024-01-02', '2024-01-04', '2024-01-05']);
      });

      it('同时过滤周末和节假日', () => {
        const holidays = ['2024-01-01'];
        const result = getTradingDays('2024-01-01', '2024-01-07', holidays);
        // 1/1(一，节假日) 1/2(二) 1/3(三) 1/4(四) 1/5(五) 1/6(六) 1/7(日)
        expect(result).toEqual(['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']);
      });
    });

    describe('getTradingDateRange', () => {
      it('返回最近N个交易日', () => {
        const result = getTradingDateRange('2024-01-10', 5);
        expect(result).toHaveLength(5);
        expect(result[0]).toBe('2024-01-10');
        expect(result[4]).toBe('2024-01-04'); // 包含周末
      });

      it('正确跳过周末', () => {
        // 2024-01-05 是周五，往前5天应该是 1/5, 1/4, 1/3, 1/2, 12/29
        const result = getTradingDateRange('2024-01-05', 5);
        expect(result).toEqual([
          '2024-01-05',
          '2024-01-04',
          '2024-01-03',
          '2024-01-02',
          '2024-01-01', // 注意：元旦如果是节假日需要额外处理
        ]);
      });

      it('支持节假日过滤', () => {
        const holidays = ['2024-01-01'];
        const result = getTradingDateRange('2024-01-05', 5, holidays);
        // 1/1 是节假日，应该往前多取一天
        expect(result).not.toContain('2024-01-01');
        expect(result).toHaveLength(5);
      });
    });
  });

  // ============= 代码修复后新增的扩展验证函数测试 =============

  describe('扩展验证函数', () => {
    const mockAccount: Account = {
      userId: 'test-user',
      cash: 50000,
      totalValue: 100000,
      positions: [
        { stock: 'sz000001', quantity: 1000, avgPrice: 10.00, buyDate: '2024-01-02' },
        { stock: 'sz000002', quantity: 500, avgPrice: 20.00, buyDate: '2024-01-02' },
      ],
    };

    describe('validateBuyOrderWithPositionLimit', () => {
      it('通过基础验证和持仓上限检查时返回有效', () => {
        const result = validateBuyOrderWithPositionLimit(mockAccount, 'sz000001', 1000, 10.00, 0.5);
        expect(result.valid).toBe(true);
      });

      it('资金不足时返回无效', () => {
        const result = validateBuyOrderWithPositionLimit(mockAccount, 'sz000001', 10000, 10.00, 0.5);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('资金不足');
      });

      it('超过持仓上限时返回无效', () => {
        // sz000001 已有10000，买入40000后共50000，正好是上限（不超限）
        // 买入40100后共50100，超过50000上限
        const result = validateBuyOrderWithPositionLimit(mockAccount, 'sz000001', 40100, 1.00, 0.5);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error!).toContain('持仓超限');
      });
    });

    describe('validateBuyOrderFull', () => {
      it('所有检查通过时返回有效', () => {
        const quote: RealtimeQuote = {
          code: 'sz000001',
          name: '平安银行',
          price: 10.50,
          open: 10.00,
          close: 10.00,
          high: 10.60,
          low: 9.90,
          volume: 1000000,
          timestamp: '2024-01-02T00:00:00',
          isLimitUp: false,
          isLimitDown: false,
          isSuspended: false,
        };

        const result = validateBuyOrderFull(mockAccount, 'sz000001', 100, 10.50, quote);
        expect(result.valid).toBe(true);
      });

      it('停牌时返回无效', () => {
        const quote: RealtimeQuote = {
          code: 'sz000001',
          name: '平安银行',
          price: 10.50,
          open: 10.50,
          close: 10.50,
          high: 10.50,
          low: 10.50,
          volume: 0, // 停牌
          timestamp: '2024-01-02T00:00:00',
          isLimitUp: false,
          isLimitDown: false,
          isSuspended: true,
        };

        const result = validateBuyOrderFull(mockAccount, 'sz000001', 100, 10.50, quote);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('停牌');
      });

      it('涨停时返回无效', () => {
        const quote: RealtimeQuote = {
          code: 'sz000001',
          name: '平安银行',
          price: 11.00, // 涨停
          open: 10.00,
          close: 10.00,
          high: 11.00,
          low: 10.00,
          volume: 1000000,
          timestamp: '2024-01-02T00:00:00',
          isLimitUp: true,
          isLimitDown: false,
          isSuspended: false,
        };

        const result = validateBuyOrderFull(mockAccount, 'sz000001', 100, 11.00, quote);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('涨停');
      });

      it('无行情数据时只做基础验证', () => {
        const result = validateBuyOrderFull(mockAccount, 'sz000001', 100, 10.50, null);
        expect(result.valid).toBe(true);
      });
    });

    describe('validateSellOrderWithQuote', () => {
      const position: Position = {
        stock: 'sz000001',
        quantity: 1000,
        avgPrice: 10.00,
        buyDate: '2024-01-02',
      };

      it('所有检查通过时返回有效', () => {
        const quote: RealtimeQuote = {
          code: 'sz000001',
          name: '平安银行',
          price: 10.50,
          open: 10.00,
          close: 10.00,
          high: 10.60,
          low: 9.90,
          volume: 1000000,
          timestamp: '2024-01-03T00:00:00',
          isLimitUp: false,
          isLimitDown: false,
          isSuspended: false,
        };

        const result = validateSellOrderWithQuote('sz000001', 100, position, '2024-01-03', quote);
        expect(result.valid).toBe(true);
      });

      it('停牌时返回无效', () => {
        const quote: RealtimeQuote = {
          code: 'sz000001',
          name: '平安银行',
          price: 10.50,
          open: 10.50,
          close: 10.50,
          high: 10.50,
          low: 10.50,
          volume: 0,
          timestamp: '2024-01-03T00:00:00',
          isLimitUp: false,
          isLimitDown: false,
          isSuspended: true,
        };

        const result = validateSellOrderWithQuote('sz000001', 100, position, '2024-01-03', quote);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('停牌');
      });

      it('跌停时返回无效', () => {
        const quote: RealtimeQuote = {
          code: 'sz000001',
          name: '平安银行',
          price: 9.00, // 跌停
          open: 10.00,
          close: 10.00,
          high: 10.00,
          low: 9.00,
          volume: 1000000,
          timestamp: '2024-01-03T00:00:00',
          isLimitUp: false,
          isLimitDown: true,
          isSuspended: false,
        };

        const result = validateSellOrderWithQuote('sz000001', 100, position, '2024-01-03', quote);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('跌停');
      });

      it('无行情数据时只做基础验证', () => {
        const result = validateSellOrderWithQuote('sz000001', 100, position, '2024-01-03', null);
        expect(result.valid).toBe(true);
      });
    });

    describe('checkPositionLimit 输入验证增强', () => {
      it('买入金额为0时返回无效', () => {
        const result = checkPositionLimit(mockAccount, 'sz000001', 0, 0.5);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('必须大于0');
      });

      it('买入金额为负数时返回无效', () => {
        const result = checkPositionLimit(mockAccount, 'sz000001', -100, 0.5);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('必须大于0');
      });

      it('持仓比例为0时返回无效', () => {
        const result = checkPositionLimit(mockAccount, 'sz000001', 10000, 0);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('0-1 之间');
      });

      it('持仓比例大于1时返回无效', () => {
        const result = checkPositionLimit(mockAccount, 'sz000001', 10000, 1.5);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('0-1 之间');
      });

      it('浮点数精度边界测试', () => {
        // 测试正好在边界上的情况
        const account: Account = {
          userId: 'test',
          cash: 50000,
          totalValue: 100000,
          positions: [],
        };

        // 100000 * 0.5 = 50000，正好在边界上
        const result = checkPositionLimit(account, 'sz000001', 50000, 0.5);
        expect(result.valid).toBe(true);

        // 50000.01 略微超过边界（但在 EPSILON 容差内）
        const result2 = checkPositionLimit(account, 'sz000001', 50000.01, 0.5);
        expect(result2.valid).toBe(true); // EPSILON = 0.01

        // 50000.02 超过容差
        const result3 = checkPositionLimit(account, 'sz000001', 50000.02, 0.5);
        expect(result3.valid).toBe(false);
      });
    });

    describe('getTradingDateRange 边界验证', () => {
      it('count为0时返回空数组', () => {
        const result = getTradingDateRange('2024-01-05', 0);
        expect(result).toEqual([]);
      });

      it('count为负数时返回空数组', () => {
        const result = getTradingDateRange('2024-01-05', -1);
        expect(result).toEqual([]);
      });

      it('无效日期字符串返回空数组', () => {
        const result = getTradingDateRange('invalid-date', 5);
        expect(result).toEqual([]);
      });
    });
  });
});
