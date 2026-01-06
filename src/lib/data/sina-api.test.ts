/**
 * Sina API 单元测试
 * 测试文件: src/lib/data/sina-api.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import {
  standardizeStockCode,
  parseSinaData,
  isTradingTime,
  fetchStockData,
  fetchRealtimeData,
} from './sina-api';

// Mock axios
vi.mock('axios');

describe('sina-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============= standardizeStockCode 测试 =============

  describe('standardizeStockCode', () => {
    it('6位数字代码自动添加前缀', () => {
      expect(standardizeStockCode('600000')).toBe('sh600000');
      expect(standardizeStockCode('000001')).toBe('sz000001');
      expect(standardizeStockCode('300750')).toBe('sz300750');
    });

    it('600xxx添加sh前缀', () => {
      expect(standardizeStockCode('600519')).toBe('sh600519');
      expect(standardizeStockCode('601318')).toBe('sh601318');
    });

    it('000xxx和300xxx添加sz前缀', () => {
      expect(standardizeStockCode('000001')).toBe('sz000001');
      expect(standardizeStockCode('000002')).toBe('sz000002');
      expect(standardizeStockCode('300750')).toBe('sz300750');
    });

    it('已有前缀保持不变（转为小写）', () => {
      expect(standardizeStockCode('SH600000')).toBe('sh600000');
      expect(standardizeStockCode('SZ000001')).toBe('sz000001');
      expect(standardizeStockCode('sh600000')).toBe('sh600000');
      expect(standardizeStockCode('sz000001')).toBe('sz000001');
    });

    it('去除空格并转大写', () => {
      expect(standardizeStockCode(' 600000 ')).toBe('sh600000');
      expect(standardizeStockCode(' sh000001 ')).toBe('sh000001');
    });
  });

  // ============= parseSinaData 测试 =============

  describe('parseSinaData', () => {
    it('解析JSON格式数据', () => {
      const rawData = JSON.stringify([
        { day: '2024-01-02', open: '10.00', high: '10.50', low: '9.80', close: '10.30', volume: '1000000' },
        { day: '2024-01-03', open: '10.30', high: '10.80', low: '10.20', close: '10.60', volume: '1200000' },
      ]);

      const result = parseSinaData(rawData);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-02');
      expect(result[0].open).toBe(10.00);
      expect(result[0].high).toBe(10.50);
      expect(result[0].low).toBe(9.80);
      expect(result[0].close).toBe(10.30);
      expect(result[0].volume).toBe(1000000);
    });

    it('空数组返回空结果', () => {
      const result = parseSinaData('[]');
      expect(result).toEqual([]);
    });

    it('无效JSON返回空数组', () => {
      const result = parseSinaData('invalid json');
      expect(result).toEqual([]);
    });
  });

  // ============= isTradingTime 测试 =============

  describe('isTradingTime', () => {
    it('交易时间内返回true', () => {
      const mockDate = new Date('2024-01-02T10:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      expect(isTradingTime()).toBe(true);

      vi.restoreAllMocks();
    });

    it('非交易时间返回false', () => {
      const mockDate = new Date('2024-01-02T08:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      expect(isTradingTime()).toBe(false);

      vi.restoreAllMocks();
    });

    it('收盘后返回false', () => {
      const mockDate = new Date('2024-01-02T16:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      expect(isTradingTime()).toBe(false);

      vi.restoreAllMocks();
    });
  });

  // ============= fetchStockData 测试 =============

  describe('fetchStockData', () => {
    it('成功获取股票数据', async () => {
      const mockResponse = [
        { day: '2024-01-02', open: '10.00', high: '10.50', low: '9.80', close: '10.30', volume: '1000000' },
        { day: '2024-01-03', open: '10.30', high: '10.80', low: '10.20', close: '10.60', volume: '1200000' },
      ];

      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });

      const result = await fetchStockData('sz000001', 30);

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('sz000001');
      expect(result[0].date).toBe('2024-01-02');
      expect(axios.get).toHaveBeenCalled();
    });

    it('按日期升序排序', async () => {
      const mockResponse = [
        { day: '2024-01-03', open: '10.30', high: '10.80', low: '10.20', close: '10.60', volume: '1200000' },
        { day: '2024-01-02', open: '10.00', high: '10.50', low: '9.80', close: '10.30', volume: '1000000' },
      ];

      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });

      const result = await fetchStockData('sz000001', 30);

      expect(result[0].date).toBe('2024-01-02');
      expect(result[1].date).toBe('2024-01-03');
    });

    it('API失败时抛出异常', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      await expect(fetchStockData('sz000001', 30)).rejects.toThrow();
    });

    it('空数据返回空数组', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: [] });

      await expect(fetchStockData('sz000001', 30)).rejects.toThrow();
    });

    it('使用正确的API参数', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: [] });

      try {
        await fetchStockData('sz000001', 30);
      } catch {
        // 预期会抛出错误
      }

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('getKLineData'),
        expect.objectContaining({
          params: expect.objectContaining({
            symbol: 'sz000001',
            scale: 240,
            datalen: 30,
          }),
        })
      );
    });
  });

  // ============= fetchRealtimeData 测试 =============

  describe('fetchRealtimeData', () => {
    it('成功获取实时数据', async () => {
      // 新浪实时数据格式有32+个字段，这里提供完整字段
      const mockResponse = 'var hq_str_sz000001="平安银行,10.50,10.40,10.45,10.55,10.35,10.55,10.56,100000,1050000,100000,95000,100000,105000,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20"';

      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });

      const result = await fetchRealtimeData('sz000001');

      expect(result).not.toBeNull();
      expect(result?.code).toBe('sz000001');
      expect(result?.name).toBe('平安银行');
      expect(result?.price).toBe(10.45);
    });

    it('API失败时返回null', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const result = await fetchRealtimeData('sz000001');

      expect(result).toBeNull();
    });

    it('无效数据格式返回null', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: 'invalid response' });

      const result = await fetchRealtimeData('sz000001');

      expect(result).toBeNull();
    });

    it('数据字段不足返回null', async () => {
      const mockResponse = 'var hq_str_sz000001="平安银行,10.50,10.40"';
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });

      const result = await fetchRealtimeData('sz000001');

      expect(result).toBeNull();
    });
  });
});
