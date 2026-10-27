import { apiFetch } from '@/lib/api/client';
import type { MessageFeedbackRating, ReportReason } from '@/lib/api/types';

export type SubmitFeedbackPayload = {
  messageId: string;
  conversationId: string;
  rating: MessageFeedbackRating;
};

export type SubmitReportPayload = {
  messageId: string;
  conversationId: string;
  reason: ReportReason;
  note?: string;
};

/** Thumbs up/down for an assistant message — stored server-side for Play AI policy. */
export async function submitMessageFeedback(payload: SubmitFeedbackPayload): Promise<void> {
  await apiFetch('/chat/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Report an assistant response — stored server-side for abuse review. */
export async function submitMessageReport(payload: SubmitReportPayload): Promise<void> {
  await apiFetch('/chat/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
