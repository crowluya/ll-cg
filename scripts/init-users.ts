import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { hashPassword } from '@/lib/auth';
import { users } from '@/db/schema';

// 加载环境变量
config({ path: '.env.local' });

async function initUsers() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  // 创建数据库连接
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client, { schema });

  console.log('开始初始化用户...\n');

  // 从环境变量读取账户信息
  const accounts = [
    {
      username: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASS || 'admin123',
      name: '管理员',
      role: 'admin' as const,
    },
    {
      username: process.env.TRADER_USER || 'trader',
      password: process.env.TRADER_PASS || 'trader123',
      name: '交易员',
      role: 'trader' as const,
    },
  ];

  for (const account of accounts) {
    try {
      // 检查用户是否已存在
      const existing = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, account.username),
      });

      if (existing) {
        console.log(`用户 "${account.username}" 已存在，跳过创建`);
        continue;
      }

      // 生成密码哈希
      const passwordHash = await hashPassword(account.password);

      // 插入用户
      await db.insert(users).values({
        id: `${account.username}-${Date.now()}`,
        username: account.username,
        password: passwordHash,
        name: account.name,
        role: account.role,
      });

      console.log(`✓ 创建用户 "${account.username}" 成功`);
      console.log(`  用户名: ${account.username}`);
      console.log(`  密码: ${account.password}`);
      console.log(`  角色: ${account.role}\n`);
    } catch (error) {
      console.error(`创建用户 "${account.username}" 失败:`, error);
    }
  }

  console.log('用户初始化完成！');

  await client.end();
}

initUsers().catch(console.error);
