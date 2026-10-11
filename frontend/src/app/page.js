"use client";

import { useState } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import MetricsStrip from "@/components/landing/MetricsStrip";
import CapabilitiesSection from "@/components/landing/CapabilitiesSection";
import AboutSection from "@/components/landing/AboutSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";
import DemoModal from "@/components/landing/DemoModal";

export default function HomePage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="swiss-page-wrapper swiss-grid-bg">
      <Header />
      <main>
        <Hero onOpenDemo={() => setDemoOpen(true)} />
        <MetricsStrip />
        <CapabilitiesSection />
        <AboutSection />
        <HowItWorksSection onOpenDemo={() => setDemoOpen(true)} />
        <ComparisonSection />
        <FaqSection />
        <CtaSection onOpenDemo={() => setDemoOpen(true)} />
      </main>
      <Footer />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
