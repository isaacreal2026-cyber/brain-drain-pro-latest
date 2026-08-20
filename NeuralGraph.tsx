import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useToast } from '@/hooks/use-toast';

interface NeuralGraphProps {
  nodes: { id: string; name: string }[];
  links: { source: string; target: string }[];
}

export const NeuralGraph: React.FC<NeuralGraphProps> = ({ nodes, links }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 600;
    const height = 400;

    let simulation: d3.Simulation<any, undefined> | null = null;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // d3 mutates the datum objects it is given (it rewrites link.source /
      // link.target into node references and adds x/y). Copy first so the
      // caller's memoized props stay intact across re-renders.
      const simNodes = nodes.map((n) => ({ ...n }));
      const simLinks = links.map((l) => ({ ...l }));

      simulation = d3.forceSimulation(simNodes as any)
        .force('link', d3.forceLink(simLinks).id((d: any) => d.id))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2));

      const link = svg.append('g')
        .selectAll('line')
        .data(simLinks)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6);

      const node = svg.append('g')
        .selectAll('circle')
        .data(simNodes)
        .enter().append('circle')
        .attr('r', 10)
        .attr('fill', '#69b3a2');

      const label = svg.append('g')
        .selectAll('text')
        .data(simNodes)
        .enter().append('text')
        .text((d: any) => d.name)
        .attr('font-size', '10px')
        .attr('dx', 12)
        .attr('dy', 4);

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y);

        label
          .attr('x', (d: any) => d.x)
          .attr('y', (d: any) => d.y);
      });
    } catch (e: any) {
      console.error("NeuralGraph error:", e);
      toast({ title: "Graph Render Error", description: e.message || "Failed to render graph", variant: "destructive" });
    }

    // Stop the force simulation when the graph unmounts or its data changes,
    // otherwise the old ticker keeps running against a detached SVG.
    return () => {
      simulation?.stop();
    };
  }, [nodes, links, toast]);

  return <svg ref={svgRef} width="100%" height="400" viewBox="0 0 600 400" />;
};
