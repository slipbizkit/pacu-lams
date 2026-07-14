import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import type { ClientFeedback, SqdKey } from '../types/client';
import {
  FeedbackQuestions,
  EMPTY_FEEDBACK_ANSWERS,
  toSubmitAnswers,
  SQD_STATEMENTS,
  type FeedbackFormAnswers,
} from './FeedbackQuestions';

interface EncodeFeedbackModalProps {
  clientId: number;
  clientName: string;
  referenceNo: string;
  onClose: () => void;
  onSaved: (feedback: ClientFeedback) => void;
}

export function EncodeFeedbackModal({ clientId, clientName, referenceNo, onClose, onSaved }: EncodeFeedbackModalProps) {
  const [answers, setAnswers] = useState<FeedbackFormAnswers>({ ...EMPTY_FEEDBACK_ANSWERS });
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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
      title: 'Save this feedback?',
      text: `The encoded feedback will be recorded for ${clientName}. This cannot be changed afterwards.`,
      showCancelButton: true,
      confirmButtonText: 'Save Feedback',
      cancelButtonText: 'Keep Editing',
      confirmButtonColor: 'var(--pacu-accent)',
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    try {
      const { feedback } = await clientService.encodeFeedback(clientId, {
        answers: parsed.answers,
        comments: comments.trim() || undefined,
      });
      Swal.fire({
        icon: 'success',
        title: 'Feedback recorded',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      });
      onSaved(feedback);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not save feedback', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
          {/* The form IS the .modal-content so .modal-dialog-scrollable can bound and
              scroll the .modal-body (a wrapper element in between breaks that layout). */}
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <div>
                <h5 className="modal-title pacu-display">Encode Client Feedback</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  {clientName} &middot; <span className="pacu-mono">{referenceNo}</span>
                </p>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body">
              <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                Encode the client's paper feedback form. Select a rating for each statement.
              </p>
              <FeedbackQuestions
                answers={answers}
                onAnswer={handleAnswer}
                comments={comments}
                onCommentsChange={setComments}
                grouped
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Save Feedback
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
