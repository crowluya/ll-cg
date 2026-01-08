'use client';

import React, { useMemo } from 'react';

export function Sparkline(props: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  const {
    values,
    width = 120,
    height = 36,
    stroke = '#ef4444',
    strokeWidth = 2,
    fill = 'transparent',
  } = props;

  const path = useMemo(() => {
    if (!values.length) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const dx = width / Math.max(1, values.length - 1);

    return values
      .map((v, i) => {
        const x = i * dx;
        const y = height - ((v - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [values, width, height]);

  if (!path) {
    return <div style={{ width, height }} />;
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
