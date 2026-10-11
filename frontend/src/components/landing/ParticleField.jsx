"use client";

import { useEffect, useRef } from "react";

/**
 * Minimalist Swiss Modernist Generative Particle Field
 * Recreates the subtle elliptical torus of geometric marks, tick marks,
 * and typographic glyphs centered on the right half of the hero section.
 */
export default function ParticleField({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let isVisible = true;
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Technical typographic glyphs from reference
    const GLYPHS = [
      "T", "┴", "┬", "|", "—", "⊣", "⊢", "+", "·", "[", "]", "▫",
      "·", "|", "T", "┴", "::", "·", "—", "|"
    ];

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      width = parent ? parent.offsetWidth : (canvas.offsetWidth || window.innerWidth);
      height = parent ? parent.offsetHeight : (canvas.offsetHeight || 750);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        initParticles();
        if (prefersReducedMotion) {
          drawFrame(0);
        }
      }, 100);
    };
    window.addEventListener("resize", handleResize, { passive: true });

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / width - 0.5;
      const relY = (e.clientY - rect.top) / height - 0.5;
      mouse.targetX = relX * 24;
      mouse.targetY = relY * 24;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Particle class for elliptical toroidal field
    class GlyphParticle {
      constructor(index, total) {
        this.index = index;
        this.reset(total);
      }

      reset(total) {
        // Distribute in a flowing elliptical ring
        const angleBase = (this.index / total) * Math.PI * 2;
        this.angle = angleBase + (Math.random() - 0.5) * 0.4;
        
        // Distribution concentrated between 0.45 and 0.90 of radius
        const rNorm = 0.35 + Math.random() * 0.55 + (Math.random() > 0.8 ? (Math.random() - 0.5) * 0.3 : 0);
        this.baseR = Math.max(0.2, Math.min(1.15, rNorm));
        
        this.glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        this.isRect = Math.random() < 0.22; // Tiny geometric rectangles
        this.rectWidth = Math.random() * 2.5 + 1.2;
        this.rectHeight = Math.random() * 6 + 3;

        this.fontSize = Math.floor(9 + Math.random() * 4); // 9px to 13px
        this.baseOpacity = 0.08 + Math.random() * 0.26;
        this.opacity = this.baseOpacity;
        this.pulseSpeed = 0.01 + Math.random() * 0.02;
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        // Orbital drift speed
        this.orbitSpeed = (0.0003 + Math.random() * 0.0005) * (Math.random() < 0.3 ? -1 : 1);
        this.radialWobble = 0.02 + Math.random() * 0.04;
      }

      update(time) {
        this.angle += this.orbitSpeed;
        this.pulsePhase += this.pulseSpeed;
        
        const edgeFade = Math.sin(Math.min(Math.PI, (this.baseR / 1.15) * Math.PI));
        this.opacity = (this.baseOpacity + Math.sin(this.pulsePhase) * 0.06) * Math.max(0.2, edgeFade);
      }

      draw(ctx, centerX, centerY, radiusX, radiusY, isDark) {
        const currentR = this.baseR + Math.sin(this.pulsePhase * 0.7) * this.radialWobble;
        const x = centerX + Math.cos(this.angle) * radiusX * currentR;
        const y = centerY + Math.sin(this.angle) * radiusY * currentR;

        if (x < -20 || x > width + 20 || y < -20 || y > height + 20) return;

        const alpha = Math.max(0.04, Math.min(0.42, this.opacity));
        const color = isDark
          ? `rgba(245, 216, 154, ${alpha * 0.95})`
          : `rgba(45, 26, 2, ${alpha})`;

        ctx.save();
        ctx.translate(x, y);

        if (this.isRect) {
          ctx.fillStyle = color;
          ctx.fillRect(-this.rectWidth / 2, -this.rectHeight / 2, this.rectWidth, this.rectHeight);
        } else {
          ctx.fillStyle = color;
          ctx.font = `${this.fontSize}px 'JetBrains Mono', 'DM Sans', monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(this.glyph, 0, 0);
        }

        ctx.restore();
      }
    }

    let particles = [];
    const initParticles = () => {
      const count = Math.min(320, Math.max(150, Math.floor((width * height) / 3200)));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(new GlyphParticle(i, count));
      }
    };

    initParticles();

    const drawFrame = (time) => {
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";

      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // Position elliptical field on the right half of the hero
      const isMobile = width < 900;
      const centerX = (isMobile ? width * 0.6 : width * 0.72) + mouse.x;
      const centerY = (isMobile ? height * 0.45 : height * 0.48) + mouse.y;
      const radiusX = isMobile ? width * 0.38 : width * 0.28;
      const radiusY = isMobile ? height * 0.36 : height * 0.38;

      // Subtle radial ambient glow behind the particles
      const grad = ctx.createRadialGradient(
        centerX, centerY, radiusX * 0.1,
        centerX, centerY, radiusX * 1.15
      );
      if (isDark) {
        grad.addColorStop(0, "rgba(245, 216, 154, 0.04)");
        grad.addColorStop(1, "rgba(245, 216, 154, 0)");
      } else {
        grad.addColorStop(0, "rgba(198, 137, 28, 0.035)");
        grad.addColorStop(1, "rgba(198, 137, 28, 0)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!prefersReducedMotion) {
          p.update(time);
        }
        p.draw(ctx, centerX, centerY, radiusX, radiusY, isDark);
      }
    };

    if (prefersReducedMotion) {
      drawFrame(0);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("mousemove", handleMouseMove);
        clearTimeout(resizeTimer);
      };
    }

    const animate = (time) => {
      if (!isVisible || document.hidden) return;
      drawFrame(time);
      animId = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !document.hidden) {
          cancelAnimationFrame(animId);
          animId = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animId);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else if (isVisible) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    animId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`swiss-hero-canvas ${className}`}
      aria-hidden="true"
    />
  );
}
