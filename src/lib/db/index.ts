import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

// 从环境变量读取数据库连接字符串
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// 创建 postgres 客户端
const client = postgres(connectionString, {
  prepare: false,
});

// 创建 Drizzle 实例
export const db = drizzle(client, { schema });

// 数据库连接类型
export type Database = typeof db;

// 健康检查函数
export async function checkConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// 关闭连接
export async function closeConnection(): Promise<void> {
  await client.end();
}
