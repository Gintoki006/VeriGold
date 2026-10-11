"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";

export default function DemoModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <DemoModalDialog onClose={onClose} />;
}

function DemoModalDialog({ onClose }) {
  const [step, setStep] = useState("running"); // "running" | "done"
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStep("done");
          return 100;
        }
        return prev + 25;
      });
    }, 450);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="swiss-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="demo-title">
      <div className="swiss-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="swiss-modal-header">
          <div className="flex items-center gap-3">
            <span className="swiss-status-dot active" />
            <h3 id="demo-title" className="swiss-modal-title">Live Verification Simulation</h3>
          </div>
          <button onClick={onClose} className="swiss-modal-close-btn" aria-label="Close demo">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="swiss-modal-body">
          <div className="swiss-demo-console">
            <div className="swiss-demo-console-header">
              <span className="font-mono text-xs opacity-60">HYPERLEDGER FABRIC CONSORTIUM CHANNEL [TESTNET]</span>
              <span className="font-mono text-xs opacity-60">PEER NODES: 4/4 ONLINE</span>
            </div>

            <div className="swiss-demo-step-row">
              <div className="swiss-demo-step-label font-mono">01. HMAC Identity Masking</div>
              <div className="swiss-demo-step-value font-mono text-xs text-neutral-600 dark:text-neutral-400">
                HMAC_SHA256(Aadhaar: •••• •••• 8912) → <span className="text-neutral-900 dark:text-neutral-100 font-semibold">a8f9c1...3b7e</span>
              </div>
            </div>

            <div className="swiss-demo-step-row">
              <div className="swiss-demo-step-label font-mono">02. Cross-Lender Query</div>
              <div className="space-y-1.5 mt-1 font-mono text-xs">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Node A (HDFC Bank):</span>
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">✓ No Active Exposure</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Node B (Muthoot Finance):</span>
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">⚠ Active Pledge Detected (₹2.4L)</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Node C (Manappuram):</span>
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">✓ No Active Exposure</span>
                </div>
              </div>
            </div>

            <div className="swiss-demo-step-row border-none pb-0">
              <div className="swiss-demo-step-label font-mono">03. Consensus & Risk Outcome</div>
              {step === "running" ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span>Evaluating Deterministic Risk Rules...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-neutral-900 dark:bg-neutral-100 h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3.5 rounded-xl border border-amber-300/60 bg-amber-500/10 text-neutral-900 dark:text-neutral-100 font-mono text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span>DECISION: HIGH RISK — MULTI-PLEDGE DETECTED</span>
                  </div>
                  <p className="opacity-80">
                    Borrower pledged identical collateral category at Muthoot Finance 14 hours ago. LTV limit breached.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="swiss-modal-footer">
          <button
            type="button"
            onClick={() => {
              setStep("running");
              setProgress(0);
            }}
            className="swiss-btn-secondary text-xs py-2 px-4"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rerun Simulation</span>
          </button>

          <Link href="/auth" className="swiss-btn-primary text-xs py-2 px-5" onClick={onClose}>
            <span>Access Lender Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
