export type HealthResponse = {
  status: 'healthy' | 'ok' | 'degraded' | 'down';
  version?: string;
};

export type ApiError = {
  message: string;
  status?: number;
};
