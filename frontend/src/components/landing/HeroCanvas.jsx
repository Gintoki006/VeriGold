"use client";

import { useEffect, useRef } from "react";

export default function HeroCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];
    let isVisible = true;

    // Accessibility: Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (prefersReducedMotion) {
        drawStaticGlow();
      }
    };

    const drawStaticGlow = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const grd = ctx.createRadialGradient(
        canvas.width * 0.72,
        canvas.height * 0.38,
        0,
        canvas.width * 0.72,
        canvas.height * 0.38,
        canvas.width * 0.52
      );
      grd.addColorStop(0, "rgba(198, 137, 28, 0.08)");
      grd.addColorStop(1, "rgba(198, 137, 28, 0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    resize();

    // Debounced resize with passive listener
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    };
    window.addEventListener("resize", handleResize, { passive: true });

    if (prefersReducedMotion) {
      drawStaticGlow();
      return () => {
        window.removeEventListener("resize", handleResize);
        clearTimeout(resizeTimer);
      };
    }

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.2 + 0.6;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.45 + 0.1;
        this.hue = 36 + Math.random() * 14;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (
          this.x < 0 ||
          this.x > canvas.width ||
          this.y < 0 ||
          this.y > canvas.height
        ) {
          this.reset();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 75%, 55%, ${this.opacity})`;
        ctx.fill();
      }
    }

    const count = Math.min(32, Math.floor(window.innerWidth / 35));
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      if (!isVisible || document.hidden) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawStaticGlow();

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animId = requestAnimationFrame(animate);
    };

    // Performance: Pause animation when off-screen
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
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

    // Performance: Pause animation when browser tab is hidden
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
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero__bg-canvas" aria-hidden="true" />;
}
