"use client";

import { useEffect, useRef } from "react";

type AntigravityProps = {
  count?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  color?: string;
  autoAnimate?: boolean;
  particleVariance?: number;
  rotationSpeed?: number;
  depthFactor?: number;
  pulseSpeed?: number;
  particleShape?: "circle" | "capsule";
  fieldStrength?: number;
};

type Particle = {
  angle: number;
  radius: number;
  height: number;
  phase: number;
  size: number;
};

const createParticles = (count: number, ringRadius: number, variance: number): Particle[] =>
  Array.from({ length: count }, (_, index) => {
    const layer = index / Math.max(count - 1, 1);
    return {
      angle: index * 2.399963 + (Math.random() - 0.5) * 0.2,
      radius: ringRadius * (0.18 + Math.sqrt(layer) * 0.82),
      height: (Math.random() - 0.5) * ringRadius * 0.55,
      phase: Math.random() * Math.PI * 2,
      size: 1 + Math.random() * variance,
    };
  });

export const Antigravity = ({
  count = 300,
  magnetRadius = 10,
  ringRadius = 10,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 2,
  lerpSpeed = 0.1,
  color = "#FF9FFC",
  autoAnimate = false,
  particleVariance = 1,
  rotationSpeed = 0,
  depthFactor = 1,
  pulseSpeed = 3,
  particleShape = "capsule",
  fieldStrength = 10,
}: AntigravityProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    particlesRef.current = createParticles(count, ringRadius, particleVariance);
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const move = (event: PointerEvent) => {
      pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
      pointer.active = true;
    };
    const leave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
      pointer.active = false;
    };

    const draw = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const scale = Math.min(width, height) / (ringRadius * 2.7);
      const seconds = time / 1000;
      pointer.x += (pointer.targetX - pointer.x) * lerpSpeed;
      pointer.y += (pointer.targetY - pointer.y) * lerpSpeed;
      context.clearRect(0, 0, width, height);

      const projected = particlesRef.current.map((particle) => {
        const rotation = particle.angle + seconds * (autoAnimate ? 0.18 : rotationSpeed);
        const wave = Math.sin(rotation * 2.4 - seconds * waveSpeed * 4 + particle.phase) * waveAmplitude;
        let x = Math.cos(rotation) * particle.radius;
        let z = Math.sin(rotation) * particle.radius;
        let y = particle.height + wave;
        const cursorDistance = Math.hypot(x / ringRadius - pointer.x, y / ringRadius + pointer.y);
        const influence = pointer.active ? Math.max(0, 1 - cursorDistance / Math.max(magnetRadius / ringRadius, 0.01)) : 0;
        x += pointer.x * influence * fieldStrength;
        y -= pointer.y * influence * fieldStrength;
        z += influence * fieldStrength * 0.45;
        const perspective = 1 / Math.max(0.45, 1 + (z * depthFactor) / (ringRadius * 2.2));
        return {
          x: width / 2 + x * scale * perspective,
          y: height / 2 + y * scale * perspective,
          z,
          size: particleSize * particle.size * perspective,
          alpha: Math.max(0.18, Math.min(0.95, 0.5 - z / (ringRadius * 3))),
          pulse: 0.82 + Math.sin(seconds * pulseSpeed + particle.phase) * 0.18,
        };
      }).sort((a, b) => b.z - a.z);

      context.fillStyle = color;
      for (const particle of projected) {
        context.globalAlpha = particle.alpha * particle.pulse;
        context.beginPath();
        if (particleShape === "capsule") {
          context.roundRect(particle.x - particle.size * 1.7, particle.y - particle.size / 2, particle.size * 3.4, particle.size, particle.size);
        } else {
          context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        }
        context.fill();
      }
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [autoAnimate, color, count, depthFactor, fieldStrength, lerpSpeed, magnetRadius, particleShape, particleSize, particleVariance, pulseSpeed, ringRadius, rotationSpeed, waveAmplitude, waveSpeed]);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
};
