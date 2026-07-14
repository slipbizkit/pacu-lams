// Client Satisfaction Measurement (CSM) survey. Fixed set of 10 Service Quality
// Dimension statements, each rated 1-5. sqd6 (online/communication support) may be
// null, meaning the client selected "Not Applicable".
export const SQD_KEYS = [
  'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5',
  'sqd6', 'sqd7', 'sqd8', 'sqd9', 'sqd10',
] as const;

export type SqdKey = (typeof SQD_KEYS)[number];

// Only sqd6 is allowed to be null (Not Applicable); every other item is required 1-5.
export const NA_ALLOWED_KEYS: SqdKey[] = ['sqd6'];

export type FeedbackAnswers = Record<SqdKey, number | null>;

export interface SubmitFeedbackBody {
  answers: FeedbackAnswers;
  comments?: string;
}

export interface FeedbackStatus {
  first_name: string;
  status: string;
  already_submitted: boolean;
}

export interface ClientFeedback {
  feedback_id: number;
  client_id: number;
  sqd1: number;
  sqd2: number;
  sqd3: number;
  sqd4: number;
  sqd5: number;
  sqd6: number | null;
  sqd7: number;
  sqd8: number;
  sqd9: number;
  sqd10: number;
  comments: string | null;
  submitted_via: 'online' | 'manual';
  encoded_by: number | null;
  submitted_at: string;
}
