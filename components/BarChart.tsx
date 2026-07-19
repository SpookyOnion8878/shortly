"use client";

import { useEffect, useRef, useState } from "react";

interface BarChartProps {
  /** Series of { date, count }. */
  data: { date: string; count: number }[];
  /** Height in pixels. */
  height?: number;
}

/**
 * A dependency-free SVG bar chart for the click time series. No chart library
 * keeps the bundle small and the rendering fully under our control.
 */
export default function BarChart({ data, height = 160 }: BarChartProps) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(1, ...data.map((d) => d.count));
  const gap = 4;
  const barW = data.length ? Math.max(2, (width - gap * (data.length - 1)) / data.length) : 0;

  return (
    <svg
      ref={ref}
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Daily clicks chart"
    >
      {data.map((d, i) => {
        const h = (d.count / max) * (height - 24);
        const x = i * (barW + gap);
        const y = height - h - 20;
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
              className="fill-brand-500"
            >
              <title>{`${d.date}: ${d.count} clicks`}</title>
            </rect>
          </g>
        );
      })}
      <text x={4} y={height - 4} className="fill-slate-500 text-[10px]">
        {data[0]?.date ?? ""}
      </text>
      <text
        x={width - 4}
        y={height - 4}
        textAnchor="end"
        className="fill-slate-500 text-[10px]"
      >
        {data[data.length - 1]?.date ?? ""}
      </text>
    </svg>
  );
}
