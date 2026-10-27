export type HealthResponse = {
  status: 'healthy' | 'ok' | 'degraded' | 'down';
  version?: string;
};

export type ApiErrorCode =
  | 'unauthorized'
  | 'rate_limited'
  | 'server_error'
  | 'offline'
  | 'timeout'
  | 'unknown';

export type ApiError = {
  message: string;
  status?: number;
  code?: ApiErrorCode;
};

export type MessageFeedbackRating = 'up' | 'down';

export type ReportReason =
  | 'harmful'
  | 'illegal'
  | 'sexual_minors'
  | 'misinformation'
  | 'other';
