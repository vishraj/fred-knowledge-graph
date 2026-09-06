// graphData.js
// This file acts as our "Offline Dataset". Instead of calling the FRED API,
// we define the known economic indicators (nodes) and their relationships (edges).

export const nodes = [
  { id: 'cpi', label: 'CPI Inflation', category: 'inflation', description: 'Consumer Price Index - measures average change in prices paid by consumers.' },
  { id: 'wages', label: 'Real Wages', category: 'labor', description: 'Wages adjusted for inflation.' },
  { id: 'housing_affordability', label: 'Housing Affordability', category: 'housing', description: 'Measure of whether housing is affordable for median income earners.' },
  { id: 'regional_demand', label: 'Regional Demand', category: 'regional', description: 'Demand for housing in specific geographic regions.' },
  { id: 'price_changes', label: 'Housing Price Changes', category: 'housing', description: 'Fluctuations in home prices.' },
  { id: 'mortgage_rates', label: 'Mortgage Rates', category: 'finance', description: 'Interest rates for home loans, driven by Fed policy.' },
  { id: 'employment', label: 'Employment Levels', category: 'labor', description: 'Overall employment figures.' }
];

export const edges = [
  { source: 'cpi', target: 'wages', type: 'impacts', weight: 0.8, description: 'High CPI directly reduces real wages.' },
  { source: 'wages', target: 'housing_affordability', type: 'impacts', weight: 0.9, description: 'Lower real wages reduce housing affordability.' },
  { source: 'mortgage_rates', target: 'housing_affordability', type: 'impacts', weight: 0.95, description: 'Higher rates drastically reduce affordability.' },
  { source: 'housing_affordability', target: 'regional_demand', type: 'impacts', weight: 0.75, description: 'Affordability shifts drive regional demand changes.' },
  { source: 'regional_demand', target: 'price_changes', type: 'impacts', weight: 0.85, description: 'Demand fluctuations lead to housing price changes.' },
  { source: 'employment', target: 'regional_demand', type: 'correlates', weight: 0.6, description: 'Employment levels support regional housing demand.' }
];

// We can also simulate the "raw data" that an agent might retrieve for a specific node
export const rawData = {
  'cpi': { current: '3.2%', trend: 'increasing', historical_avg: '2.0%' },
  'wages': { current_growth: '4.0%', real_growth: '0.8%', trend: 'stagnant' },
  'housing_affordability': { index: '95', trend: 'decreasing', historical_avg: '120' }
};
