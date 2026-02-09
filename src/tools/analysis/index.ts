// Re-export all analysis tools
export * from './performance.js';
export * from './champion.js';
export * from './comparison.js';

import { performanceTools } from './performance.js';
import { championTools } from './champion.js';
import { comparisonTools } from './comparison.js';

// Combined analysis tools
export const analysisTools = [
    ...performanceTools,
    ...championTools,
    ...comparisonTools,
];
