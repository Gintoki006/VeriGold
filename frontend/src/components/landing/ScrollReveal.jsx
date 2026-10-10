"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    // Respect user motion preference immediately
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    let rAFId = null;
    const observeAll = () => {
      document.querySelectorAll(".reveal:not(.visible)").forEach((el) => observer.observe(el));
    };

    observeAll();

    // Watch for dynamically loaded / hydrated chunks with animation-frame debouncing
    const mutationObserver = new MutationObserver(() => {
      if (rAFId) cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(observeAll);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (rAFId) cancelAnimationFrame(rAFId);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
