export interface FeedbackStatus {
  first_name: string;
  status: string;
  already_submitted: boolean;
}

export interface SubmitFeedbackBody {
  rating: number;
  comments?: string;
}
