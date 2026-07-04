import { useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import type { FeedbackStatus } from '../types/client';
import { BrandMark } from '../components/BrandMark';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

type Step = 'lookup' | 'rate' | 'done';

export default function FeedbackPage() {
  const [step, setStep] = useState<Step>('lookup');
  const [referenceNo, setReferenceNo] = useState('');
  const [status, setStatus] = useState<FeedbackStatus | null>(null);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await clientService.feedbackStatus(referenceNo.trim());
      setStatus(data);
      if (data.already_submitted) {
        Swal.fire({ icon: 'info', title: "You've already given feedback", text: 'Thank you — no further action is needed.' });
        return;
      }
      if (data.status !== 'completed') {
        Swal.fire({ icon: 'info', title: 'Not ready yet', text: "This transaction isn't completed yet. Please check back after your case is closed." });
        return;
      }
      setStep('rate');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Reference number not found', text: err instanceof Error ? err.message : 'Please check and try again' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      Swal.fire({ icon: 'warning', title: 'Please select a rating' });
      return;
    }
    setLoading(true);
    try {
      await clientService.submitFeedback(referenceNo.trim(), { rating, comments: comments.trim() || undefined });
      setStep('done');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not submit feedback', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
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
        <div style={{ width: '100%', maxWidth: 480 }}>
          {step === 'lookup' && (
            <form onSubmit={handleLookup}>
              <h1 className="pacu-display mb-1">How was your visit?</h1>
              <p className="text-muted mb-4">
                Enter the reference number from your intake confirmation to leave feedback.
              </p>
              <div className="mb-4">
                <label className="form-label">Reference number</label>
                <input
                  className="form-control pacu-mono"
                  placeholder="PACU-20260704-0007"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Continue
              </button>
            </form>
          )}

          {step === 'rate' && status && (
            <form onSubmit={handleSubmit}>
              <h1 className="pacu-display mb-1">Thanks, {status.first_name}</h1>
              <p className="text-muted mb-4">How would you rate your visit today?</p>

              <div className="d-flex gap-2 justify-content-center mb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="btn p-0 border-0 bg-transparent"
                    style={{ fontSize: '2rem', lineHeight: 1, color: n <= rating ? 'var(--pacu-accent)' : 'var(--pacu-border)' }}
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  >
                    <i className={`bi ${n <= rating ? 'bi-star-fill' : 'bi-star'}`} />
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="form-label">Anything you'd like to add? (optional)</label>
                <textarea className="form-control" rows={4} value={comments} onChange={(e) => setComments(e.target.value)} />
              </div>

              <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Submit Feedback
              </button>
            </form>
          )}

          {step === 'done' && (
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
