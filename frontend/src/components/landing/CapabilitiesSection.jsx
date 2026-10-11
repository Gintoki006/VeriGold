"use client";

import { motion } from "framer-motion";

export function InstantDeploymentGraphic() {
  return (
    <div className="swiss-illustration-wrap" aria-hidden="true">
      <svg
        viewBox="0 0 280 220"
        className="swiss-feature-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Minimalist Browser Frame with rounded corners */}
        <rect
          x="30"
          y="20"
          width="210"
          height="150"
          rx="12"
          className="swiss-svg-stroke-main"
          strokeWidth="2.5"
        />

        {/* Stack of horizontal gray loading bars of varying lengths */}
        <motion.rect
          x="52"
          y="42"
          width="135"
          height="11"
          rx="5.5"
          className="fill-neutral-600 dark:fill-neutral-300"
          initial={{ scaleX: 0.8, opacity: 0.6 }}
          animate={{ scaleX: [0.8, 1, 0.8], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.rect
          x="52"
          y="62"
          width="110"
          height="11"
          rx="5.5"
          className="fill-neutral-500 dark:fill-neutral-400"
          initial={{ scaleX: 0.9, opacity: 0.6 }}
          animate={{ scaleX: [0.9, 1, 0.9], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        <motion.rect
          x="52"
          y="82"
          width="75"
          height="11"
          rx="5.5"
          className="fill-neutral-400 dark:fill-neutral-500"
          initial={{ scaleX: 0.7, opacity: 0.5 }}
          animate={{ scaleX: [0.7, 1, 0.7], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
        <motion.rect
          x="52"
          y="102"
          width="55"
          height="11"
          rx="5.5"
          className="fill-neutral-400 dark:fill-neutral-500"
          initial={{ scaleX: 0.85 }}
          animate={{ scaleX: [0.85, 1, 0.85] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
        />
        <motion.rect
          x="52"
          y="122"
          width="75"
          height="11"
          rx="5.5"
          className="fill-neutral-400 dark:fill-neutral-500"
          initial={{ scaleX: 0.95 }}
          animate={{ scaleX: [0.95, 1, 0.95] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        />

        {/* Small solid dot underneath bottom right of frame */}
        <circle cx="190" cy="190" r="4.5" className="fill-current swiss-svg-fill-main" />
      </svg>
    </div>
  );
}

export function AINativeWorkflowsGraphic() {
  const nodeCount = 6;
  const radius = 64;
  const cx = 140;
  const cy = 110;

  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    // Hexagonal symmetrical angles: 30°, 90°, 150°, 210°, 270°, 330°
    const angle = ((i * 60 + 30) * Math.PI) / 180;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  return (
    <div className="swiss-illustration-wrap" aria-hidden="true">
      <svg
        viewBox="0 0 280 220"
        className="swiss-feature-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Concentric faint orbital guide circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          className="stroke-neutral-300 dark:stroke-neutral-700"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Thin radial connector lines from center to nodes */}
        {nodes.map((n, i) => (
          <line
            key={`l-${i}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            className="stroke-neutral-400 dark:stroke-neutral-600"
            strokeWidth="1.5"
          />
        ))}

        {/* Central solid black circle */}
        <motion.circle
          cx={cx}
          cy={cy}
          r="16"
          className="swiss-svg-fill-main"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* 6 circular outlined peripheral nodes */}
        {nodes.map((n, i) => (
          <motion.circle
            key={`n-${i}`}
            cx={n.x}
            cy={n.y}
            r="8.5"
            className="swiss-svg-stroke-main fill-[#FFF3E8] dark:fill-[#140C03]"
            strokeWidth="2"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.35,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function SecurityByDesignGraphic() {
  const cx = 140;
  const cy = 110;

  return (
    <div className="swiss-illustration-wrap" aria-hidden="true">
      <svg
        viewBox="0 0 280 220"
        className="swiss-feature-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer dotted cryptographic verification boundary */}
        <circle
          cx={cx}
          cy={cy}
          r="68"
          className="stroke-neutral-300 dark:stroke-neutral-700"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Middle continuous verification shield ring */}
        <motion.circle
          cx={cx}
          cy={cy}
          r="48"
          className="swiss-svg-stroke-main"
          strokeWidth="2"
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />

        {/* 4 cardinal proof pins */}
        <circle cx={cx} cy={cy - 68} r="4" className="swiss-svg-fill-main" />
        <circle cx={cx} cy={cy + 68} r="4" className="swiss-svg-fill-main" />
        <circle cx={cx - 68} cy={cy} r="4" className="swiss-svg-fill-main" />
        <circle cx={cx + 68} cy={cy} r="4" className="swiss-svg-fill-main" />

        {/* Center lock / ZK proof token */}
        <rect
          x={cx - 14}
          y={cy - 10}
          width="28"
          height="24"
          rx="6"
          className="swiss-svg-fill-main"
        />
        <path
          d={`M${cx - 8} ${cy - 10} V${cy - 18} A8 8 0 0 1 ${cx + 8} ${cy - 18} V${cy - 10}`}
          className="swiss-svg-stroke-main"
          strokeWidth="2.5"
          fill="none"
        />
        <circle cx={cx} cy={cy + 2} r="2.5" className="fill-[#FFF3E8] dark:fill-[#140C03]" />
      </svg>
    </div>
  );
}

export function InfrastructureScalesGraphic() {
  return (
    <div className="swiss-illustration-wrap" aria-hidden="true">
      <svg
        viewBox="0 0 280 220"
        className="swiss-feature-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Minimalist 3-tier distributed block consensus */}
        {/* Node A (Muthoot) */}
        <rect
          x="45"
          y="65"
          width="50"
          height="45"
          rx="6"
          className="swiss-svg-stroke-main fill-[#FFF3E8] dark:fill-[#140C03]"
          strokeWidth="2"
        />
        {/* Node B (Manappuram) */}
        <rect
          x="185"
          y="65"
          width="50"
          height="45"
          rx="6"
          className="swiss-svg-stroke-main fill-[#FFF3E8] dark:fill-[#140C03]"
          strokeWidth="2"
        />
        {/* Node C (Consortium Orderer) */}
        <rect
          x="115"
          y="135"
          width="50"
          height="45"
          rx="6"
          className="swiss-svg-stroke-main fill-neutral-900 dark:fill-neutral-100"
          strokeWidth="2"
        />

        {/* Connecting peer channels */}
        <line
          x1="95"
          y1="87"
          x2="185"
          y2="87"
          className="stroke-neutral-400 dark:stroke-neutral-600"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <line
          x1="70"
          y1="110"
          x2="125"
          y2="135"
          className="stroke-neutral-400 dark:stroke-neutral-600"
          strokeWidth="1.5"
        />
        <line
          x1="210"
          y1="110"
          x2="155"
          y2="135"
          className="stroke-neutral-400 dark:stroke-neutral-600"
          strokeWidth="1.5"
        />

        {/* Consensus ping dot */}
        <motion.circle
          r="4"
          className="swiss-svg-fill-main"
          animate={{
            cx: [95, 140, 185, 140, 95],
            cy: [87, 87, 87, 135, 87],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}

export default function CapabilitiesSection() {
  const features = [
    {
      index: "01",
      title: "Instant Cross-Lender Verification",
      desc: "Query the consortium registry in milliseconds before loan sanction. Edge-distributed verification queries verify active borrower exposure and prevent multi-pledge fraud across institutional borders.",
      graphic: <InstantDeploymentGraphic />,
    },
    {
      index: "02",
      title: "AI-Native Risk Workflows",
      desc: "Deterministic rule-based scoring combined with Gemini LLM risk synthesis. The AI provides structured narrative reasoning and can escalate risk, but cannot override immutable rule boundaries.",
      graphic: <AINativeWorkflowsGraphic />,
    },
    {
      index: "03",
      title: "Security by Design",
      desc: "Zero-Knowledge proofs and irreversible HMAC-SHA256 identity masking. Lenders verify whether borrower aggregate exposure crosses policy thresholds with mathematical certainty and zero plaintext data leakage.",
      graphic: <SecurityByDesignGraphic />,
    },
    {
      index: "04",
      title: "Infrastructure that Scales",
      desc: "Built on permissioned Hyperledger Fabric consensus. A tamper-evident, multi-institution state machine that detects duplicate gold pledges across all participating lenders in real time.",
      graphic: <InfrastructureScalesGraphic />,
    },
  ];

  return (
    <section className="swiss-capabilities-section" id="capabilities">
      <div className="swiss-container">
        {/* Capabilities Section Header (Screenshot 1) */}
        <div className="swiss-capabilities-header">
          <div className="swiss-eyebrow">
            <span className="swiss-eyebrow-dash" aria-hidden="true" />
            <span className="swiss-eyebrow-text">Capabilities</span>
          </div>

          <h2 className="swiss-capabilities-title">
            <span className="block swiss-title-dark">Everything you need.</span>
            <span className="block swiss-title-muted">Nothing you don&apos;t.</span>
          </h2>
        </div>

        {/* Spacious Feature Rows (Screenshot 2) */}
        <div className="swiss-features-list" id="features">
          {features.map((feature) => (
            <div key={feature.index} className="swiss-feature-row">
              {/* Left Column: Numbered label + Headings + Description */}
              <div className="swiss-feature-meta">
                <span className="swiss-feature-number">{feature.index}</span>
                <div className="swiss-feature-body">
                  <h3 className="swiss-feature-title">{feature.title}</h3>
                  <p className="swiss-feature-desc">{feature.desc}</p>
                </div>
              </div>

              {/* Right Column: Minimalist SVG Illustration */}
              <div className="swiss-feature-visual">{feature.graphic}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
