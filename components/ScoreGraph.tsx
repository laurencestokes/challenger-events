'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { calculateGaussianScore } from 'utils/scoring';

interface ScoreGraphProps {
  userWeight: number; // The actual weight lifted
  benchmark: number; // The elite benchmark for their category
  p95: number; // The 95th percentile value
  p50: number; // The median (50th percentile)
  liftType: 'squat' | 'bench' | 'deadlift'; // Type of lift being displayed
}

const ScoreGraph: React.FC<ScoreGraphProps> = ({ userWeight, benchmark, p95, p50, liftType }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const height = width * 0.6; // Maintain 3:2 aspect ratio
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Calculate margins and inner dimensions
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    // Create the SVG group with margins
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate standard deviation based on p95 and p50
    const stdDev = (p95 - p50) / 1.645;

    // Generate data points for the Gaussian curve (clamped at 500kg)
    const points = Array.from({ length: 100 }, (_, i) => {
      const x = (i * 500) / 100; // Scale points up to 500kg instead of 2x benchmark
      const y = calculateGaussianScore(x, p50, stdDev);
      return { x, y };
    });

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, 500]) // Fixed domain up to 500kg
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    // Line generator
    const line = d3
      .line<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

    // Area generator for shading
    const area = d3
      .area<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y0(innerHeight) // Bottom of the area (x-axis)
      .y1((d) => yScale(d.y)); // Top of the area (curve)

    // Filter points for shaded area (from 0 to user's weight)
    const shadedPoints = points.filter((point) => point.x <= userWeight);

    // Draw shaded area under the curve
    g.append('path')
      .datum(shadedPoints)
      .attr('fill', '#10B981')
      .attr('fill-opacity', 0.2) // Slightly increased opacity
      .attr('d', area);

    // Draw the curve
    g.append('path')
      .datum(points)
      .attr('fill', 'none')
      .attr('stroke', '#4299e1')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Draw user's score marker
    g.append('line')
      .attr('x1', xScale(userWeight))
      .attr('x2', xScale(userWeight))
      .attr('y1', innerHeight)
      .attr('y2', 0)
      .attr('stroke', '#f56565')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4');

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(xAxis);

    g.append('g').call(yAxis);

    // Add axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-sm')
      .text(`${liftType.charAt(0).toUpperCase() + liftType.slice(1)} Weight (kg)`);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-sm')
      .text('Distribution Density');
  }, [userWeight, benchmark, p95, p50, dimensions, liftType]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
};

export default ScoreGraph;
