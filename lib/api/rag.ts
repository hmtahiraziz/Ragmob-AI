import { apiFetch } from '@/lib/api/client';
import type { HealthResponse } from '@/lib/api/types';
import { API_URL } from '@/lib/env';

/**
 * Health check for the shared FastAPI backend.
 */
export async function healthCheck(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health');
}

export { API_URL };
