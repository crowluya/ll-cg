/**
 * 日期工具函数
 */

/**
 * 格式化日期为 YYYY-MM-DD 格式（本地时间）
 * @param date Date 对象
 * @returns YYYY-MM-DD 字符串
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取当前日期的 YYYY-MM-DD 格式
 * @returns 当前日期字符串
 */
export function getCurrentDate(): string {
  return formatDate(new Date());
}
