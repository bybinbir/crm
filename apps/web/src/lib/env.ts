/**
 * Environment variable validation and configuration
 * Ensures required env vars are set in production
 */

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;

/**
 * Validate required environment variables
 * Called at build time to prevent deployment with missing config
 */
export function validateEnv(): void {
  if (env.isProduction && !env.apiUrl) {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be set in production. ' +
        'Add it to your environment or .env.production file.'
    );
  }

  // Only warn about localhost in production, don't block build
  // This allows local production builds for testing
  if (env.isProduction && env.apiUrl?.includes('localhost')) {
    // eslint-disable-next-line no-console
    console.warn(
      '⚠️  WARNING: NEXT_PUBLIC_API_URL contains "localhost" in production build. ' +
        'This is OK for local testing, but DO NOT deploy to production with this configuration.'
    );
  }
}

// Run validation in production builds (server-side only)
if (typeof window === 'undefined' && env.isProduction) {
  validateEnv();
}
