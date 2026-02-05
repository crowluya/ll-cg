/**
 * 测试新浪 API 实际调用
 * 运行: node tests/sina-api-integration.ts
 */

import axios from 'axios';
import iconv from 'iconv-lite';

const SINA_API_BASE = 'https://hq.sinajs.cn';
const SINA_HEADERS = {
  Referer: 'https://finance.sina.com.cn/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: '*/*',
};

async function testRealtimeFetch() {
  console.log('\n=== 测试实时行情获取 ===');

  const codes = ['sh600519', 'sz000001'];
  const url = `${SINA_API_BASE}/list=${codes.join(',')}`;

  console.log(`请求 URL: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: SINA_HEADERS,
      timeout: 10000,
      responseType: 'arraybuffer',
    });

    // 新浪 API 返回 GBK 编码，需要解码
    const data = iconv.decode(Buffer.from(response.data), 'GBK');

    console.log('\n原始响应（前500字符）:');
    console.log(data.substring(0, 500));

    // 解析数据
    const lines = data.split('\n').filter((line: string) => line.trim());
    console.log(`\n解析到 ${lines.length} 行数据`);

    for (const line of lines) {
      const match = line.match(/hq_str_(.+?)="([^"]*)"/);
      if (match) {
        const code = match[1];
        const stockData = match[2];
        const parts = stockData.split(',');
        console.log(`\n股票: ${code}`);
        console.log(`  数据字段数: ${parts.length}`);
        console.log(`  名称: ${parts[0]}`);
        console.log(`  开盘: ${parts[1]}`);
        console.log(`  昨收: ${parts[2]}`);
        console.log(`  现价: ${parts[3]}`);
        console.log(`  买一: ${parts[6]}`);
        console.log(`  卖一: ${parts[7]}`);
        console.log(`  买一量: ${parts[8]}`);
        console.log(`  卖一量: ${parts[9]}`);

        // 检查是否有足够的字段
        if (parts.length >= 32) {
          console.log('  ✓ 有足够字段解析买卖五档');
        } else {
          console.log(`  ✗ 字段不足 (需要32+，实际${parts.length})`);
        }
      }
    }

  } catch (error: any) {
    console.error('请求失败:', error.message);
  }
}

async function testKLineFetch() {
  console.log('\n=== 测试 K 线数据获取 ===');

  const code = 'sh600519';
  const url = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData';

  console.log(`请求 URL: ${url}`);

  try {
    const response = await axios.get(url, {
      params: {
        symbol: code,
        scale: 240, // 日线
        ma: 'no',
        datalen: 5,
      },
      headers: SINA_HEADERS,
      timeout: 10000,
    });

    console.log('\nK线数据:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('请求失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应头:', JSON.stringify(error.response.headers));
    }
  }
}

async function testSearchStock() {
  console.log('\n=== 测试股票搜索 ===');

  const COMMON_STOCKS = {
    sh000001: '上证指数',
    sh600000: '浦发银行',
    sh600519: '贵州茅台',
    sz000001: '平安银行',
  };

  const query = '茅台';
  console.log(`搜索关键词: ${query}`);

  const results: Array<{ code: string; name: string }> = [];
  for (const [code, name] of Object.entries(COMMON_STOCKS)) {
    if (code.includes(query.toLowerCase()) || name.includes(query)) {
      results.push({ code, name });
    }
  }

  console.log('搜索结果:');
  console.table(results);
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('新浪 API 集成测试');
  console.log('========================================');

  await testSearchStock();
  await testRealtimeFetch();
  await testKLineFetch();

  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================\n');
}

main().catch(console.error);
