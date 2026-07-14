import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import type { SqdKey } from '../types/client';
import { BrandMark } from '../components/BrandMark';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import {
  FeedbackQuestions,
  EMPTY_FEEDBACK_ANSWERS,
  toSubmitAnswers,
  SQD_STATEMENTS,
  type FeedbackFormAnswers,
} from '../components/FeedbackQuestions';

type Phase = 'loading' | 'rate' | 'done' | 'notice';

interface Notice {
  icon: string;
  color: string;
  title: string;
  text: string;
}

export default function FeedbackPage() {
  const [searchParams] = useSearchParams();
  // The reference number is bound to the link in the email — never entered by hand.
  const referenceNo = (searchParams.get('ref') ?? '').trim();

  const [phase, setPhase] = useState<Phase>('loading');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [firstName, setFirstName] = useState('');
  const [answers, setAnswers] = useState<FeedbackFormAnswers>({ ...EMPTY_FEEDBACK_ANSWERS });
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!referenceNo) {
      setPhase('notice');
      setNotice({
        icon: 'bi-link-45deg',
        color: 'var(--pacu-accent)',
        title: 'Feedback link required',
        text: 'Please open the feedback survey using the link from your consultation summary email.',
      });
      return;
    }

    (async () => {
      try {
        const data = await clientService.feedbackStatus(referenceNo);
        if (data.already_submitted) {
          setPhase('notice');
          setNotice({
            icon: 'bi-check-circle',
            color: 'var(--pacu-success)',
            title: "You've already given feedback",
            text: 'Thank you — your response has been recorded and no further action is needed.',
          });
          return;
        }
        if (data.status !== 'completed') {
          setPhase('notice');
          setNotice({
            icon: 'bi-hourglass-split',
            color: 'var(--pacu-warning)',
            title: 'Not ready yet',
            text: "This transaction isn't completed yet. Please check back after your case is closed.",
          });
          return;
        }
        setFirstName(data.first_name);
        setPhase('rate');
      } catch {
        setPhase('notice');
        setNotice({
          icon: 'bi-exclamation-circle',
          color: 'var(--pacu-danger)',
          title: 'Feedback link invalid',
          text: 'We couldn’t find this transaction. Please use the exact link from your consultation summary email.',
        });
      }
    })();
  }, [referenceNo]);

  function handleAnswer(key: SqdKey, value: number | null) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = toSubmitAnswers(answers);
    if ('missingIndex' in parsed) {
      Swal.fire({
        icon: 'warning',
        title: 'Please answer every question',
        text: `Question ${parsed.missingIndex + 1} hasn't been answered yet: “${SQD_STATEMENTS[parsed.missingIndex]}”`,
      });
      return;
    }
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Submit your feedback?',
      text: 'Your responses will be recorded and cannot be changed afterwards.',
      showCancelButton: true,
      confirmButtonText: 'Submit Feedback',
      cancelButtonText: 'Keep Editing',
      confirmButtonColor: 'var(--pacu-accent)',
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      await clientService.submitFeedback(referenceNo, {
        answers: parsed.answers,
        comments: comments.trim() || undefined,
      });
      setPhase('done');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not submit feedback', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center p-4">
        <div className="d-flex align-items-center gap-2">
          <BrandMark size={30} />
          <span className="pacu-display fs-5">PACU Feedback</span>
        </div>
        <ThemeSwitcher />
      </div>

      <div className="d-flex justify-content-center px-3 pb-5">
        <div style={{ width: '100%', maxWidth: 640 }}>
          {phase === 'loading' && (
            <div className="card">
              <div className="card-body p-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status" />
                <p className="text-muted mb-0">Loading your feedback form…</p>
              </div>
            </div>
          )}

          {phase === 'notice' && notice && (
            <div className="card">
              <div className="card-body p-5 text-center">
                <i className={`bi ${notice.icon} mb-3`} style={{ fontSize: '3rem', color: notice.color }} />
                <h4 className="pacu-display mb-2">{notice.title}</h4>
                <p className="text-muted mb-0">{notice.text}</p>
              </div>
            </div>
          )}

          {phase === 'rate' && (
            <form onSubmit={handleSubmit}>
              <h1 className="pacu-display mb-1">Thanks, {firstName}</h1>
              <p className="text-muted mb-4">
                Please tell us how much you agree with each statement about your experience today.
              </p>

              <FeedbackQuestions
                answers={answers}
                onAnswer={handleAnswer}
                comments={comments}
                onCommentsChange={setComments}
                grouped
              />

              <button className="btn btn-primary w-100 mt-3" type="submit" disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Submit Feedback
              </button>
            </form>
          )}

          {phase === 'done' && (
            <div className="card">
              <div className="card-body p-5 text-center">
                <i className="bi bi-check-circle text-success mb-3" style={{ fontSize: '3rem' }} />
                <h4 className="pacu-display mb-2">Thank you</h4>
                <p className="text-muted mb-0">Your feedback has been recorded.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
