"use client";

import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import AboutSection from "@/components/landing/AboutSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import StatsSection from "@/components/landing/StatsSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";
import ScrollReveal from "@/components/landing/ScrollReveal";

export default function HomePage() {
  return (
    <>
      <ScrollReveal />
      <Header />
      <main>
        <Hero animate={true} />
        <AboutSection />
        <BenefitsSection />
        <HowItWorksSection />
        <ComparisonSection />
        <StatsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
