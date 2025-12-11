import { useRef, useEffect } from "react";

interface StaticWaveformProps {
  width: number;
  height: number;
}

export const StaticWaveform = ({ width, height }: StaticWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const barCount = 60;
    const barWidth = width / barCount;
    const centerY = height / 2;
    let x = 0;

    for (let i = 0; i < barCount; i++) {
      const pattern = Math.sin((i / barCount) * Math.PI * 4) * 0.5 + 0.5;
      const variation = Math.random() * 0.3;
      const amplitude = pattern + variation;
      const barHeight = amplitude * height * 0.6;

      const gradient = ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.7)');
      gradient.addColorStop(1, 'rgba(147, 197, 253, 0.5)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 2), barHeight);
      
      x += barWidth;
    }
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
    />
  );
};