"use client";

export default function Sparkline({ data, width = 120, height = 36 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-40">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#f9a8d4" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - 4 - ((v - min) / range) * (height - 8)).toFixed(1)}`)
    .join(" ");
  const up = data[data.length - 1] >= data[0];
  const color = up ? "#10B981" : "#F43F5E";
  const last = data[data.length - 1];
  const lastX = (data.length - 1) * stepX;
  const lastY = height - 4 - ((last - min) / range) * (height - 8);
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
    </svg>
  );
}
