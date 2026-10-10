// frontend/src/constants/index.js
// Platform-wide UI constants — never scatter magic strings across components.

export const AMOUNT_RANGES = {
  0: '₹0 – ₹50K',
  1: '₹50K – ₹1L',
  2: '₹1L – ₹2L',
  3: '₹2L – ₹5L',
  4: '₹5L+',
};

export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

export const RISK_BADGE_STYLES = {
  LOW: { bg: 'bg-green-100', text: 'text-green-800', label: 'Low Risk' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium Risk' },
  HIGH: { bg: 'bg-red-100', text: 'text-red-800', label: 'High Risk' },
};

export const RECOMMENDATIONS = {
  APPROVE: 'APPROVE',
  REDUCE_AMOUNT: 'REDUCE_AMOUNT',
  REJECT: 'REJECT',
};

export const ALERT_TYPES = {
  VELOCITY: 'VELOCITY',
  GOLD_MATCH: 'GOLD_MATCH',
  HIGH_EXPOSURE: 'HIGH_EXPOSURE',
};
