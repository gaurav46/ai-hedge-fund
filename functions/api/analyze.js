/**
 * Cloudflare Pages Function: /api/analyze
 * Wraps /api/market-data for single-ticker analysis (backward compatibility).
 */
export { onRequestPost, onRequestGet } from './market-data.js';
