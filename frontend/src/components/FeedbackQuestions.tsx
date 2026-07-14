import { NA_ALLOWED_KEYS, SQD_KEYS } from '../types/client';
import type { FeedbackAnswers, SqdKey } from '../types/client';

// The 10 fixed ARTA Client Satisfaction Measurement statements, in sqd1..sqd10 order.
export const SQD_STATEMENTS: string[] = [
  'I am satisfied with the legal assistance/service that I received.',
  'I spent a reasonable amount of time completing my transaction.',
  'The office followed the required procedures and clearly explained the process.',
  'The steps required for my transaction were easy to understand and follow.',
  'I was able to easily find information about my transaction through the DOLE website or other official channels.',
  'The office’s online or communication support responded promptly to my inquiries.',
  'I received the assistance or information that I needed, or if my request could not be granted, the reason was clearly explained to me.',
  'The personnel who assisted me were courteous, respectful, and professional throughout my transaction.',
  'The legal advice, guidance, or information provided was clear, accurate, and easy to understand.',
  'I am confident that the assistance I received helped me understand my rights, obligations, and available courses of action.',
];

export const SCALE_LABELS: Record<number, string> = {
  5: 'Strongly Agree',
  4: 'Agree',
  3: 'Neither Agree nor Disagree',
  2: 'Disagree',
  1: 'Strongly Disagree',
};

// Thematic grouping of the 10 statements, used when the form is rendered grouped.
export const SQD_GROUPS: { title: string; keys: SqdKey[] }[] = [
  { title: 'Service Delivery', keys: ['sqd1', 'sqd2', 'sqd3', 'sqd4'] },
  { title: 'Information & Communication', keys: ['sqd5', 'sqd6'] },
  { title: 'Service Outcome', keys: ['sqd7'] },
  { title: 'Staff Professionalism', keys: ['sqd8'] },
  { title: 'Clarity of Advice', keys: ['sqd9'] },
  { title: 'Confidence', keys: ['sqd10'] },
];

// While filling out the form an item can be: unanswered (undefined), rated (1-5),
// or explicitly Not Applicable (null, sqd6 only). The submit type collapses this to
// number | null once every item is answered.
export type FeedbackFormAnswers = Record<SqdKey, number | null | undefined>;

export const EMPTY_FEEDBACK_ANSWERS: FeedbackFormAnswers = SQD_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: undefined }),
  {} as FeedbackFormAnswers
);

// Returns the clean answer set to submit, or the index of the first unanswered item.
export function toSubmitAnswers(
  answers: FeedbackFormAnswers
): { answers: FeedbackAnswers } | { missingIndex: number } {
  const result = {} as FeedbackAnswers;
  for (let i = 0; i < SQD_KEYS.length; i++) {
    const value = answers[SQD_KEYS[i]];
    if (value === undefined) return { missingIndex: i };
    result[SQD_KEYS[i]] = value;
  }
  return { answers: result };
}

// Colour ramp from disagree (muted red) to agree (green), so a filled row reads at a
// glance. Falls back to the accent for the neutral midpoint.
const RATING_COLORS: Record<number, string> = {
  1: 'var(--pacu-danger)',
  2: 'var(--pacu-danger)',
  3: 'var(--pacu-warning)',
  4: 'var(--pacu-success)',
  5: 'var(--pacu-success)',
};

interface ScaleControlProps {
  value: number | null | undefined;
  allowNA: boolean;
  onSelect: (value: number | null) => void;
}

function ScaleControl({ value, allowNA, onSelect }: ScaleControlProps) {
  return (
    <div className="d-flex gap-2 align-items-stretch">
      <div className="btn-group flex-grow-1" role="group" aria-label="Rating from 1 to 5">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              aria-pressed={selected}
              title={SCALE_LABELS[n]}
              className="btn btn-sm"
              style={{
                flex: '1 1 0',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '0.4rem 0',
                border: `1px solid ${selected ? RATING_COLORS[n] : 'var(--pacu-border)'}`,
                backgroundColor: selected ? RATING_COLORS[n] : 'transparent',
                color: selected ? '#fff' : 'var(--pacu-text-secondary)',
                transition: 'background-color 0.1s, color 0.1s, border-color 0.1s',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {allowNA && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={value === null}
          className="btn btn-sm"
          style={{
            minWidth: 52,
            fontWeight: 600,
            fontSize: '0.8rem',
            borderRadius: 'var(--pacu-radius-sm)',
            border: `1px solid ${value === null ? 'var(--pacu-accent)' : 'var(--pacu-border)'}`,
            backgroundColor: value === null ? 'var(--pacu-accent)' : 'transparent',
            color: value === null ? 'var(--pacu-accent-contrast)' : 'var(--pacu-text-secondary)',
            transition: 'background-color 0.1s, color 0.1s, border-color 0.1s',
          }}
        >
          N/A
        </button>
      )}
    </div>
  );
}

interface QuestionRowProps {
  sqdKey: SqdKey;
  value: number | null | undefined;
  first: boolean;
  onAnswer: (key: SqdKey, value: number | null) => void;
}

function QuestionRow({ sqdKey, value, first, onAnswer }: QuestionRowProps) {
  const index = SQD_KEYS.indexOf(sqdKey);
  const answered = value !== undefined;
  return (
    <div
      className="p-3"
      style={{
        borderTop: first ? undefined : '1px solid var(--pacu-border)',
        backgroundColor: answered ? 'transparent' : 'var(--pacu-accent-soft)',
        transition: 'background-color 0.15s',
      }}
    >
      <div className="d-flex gap-2 mb-2">
        <span
          className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: 22, height: 22, borderRadius: '50%', fontSize: '0.72rem', fontWeight: 700,
            backgroundColor: 'var(--pacu-accent-soft)', color: 'var(--pacu-accent)',
          }}
        >
          {index + 1}
        </span>
        <span style={{ fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.45 }}>{SQD_STATEMENTS[index]}</span>
      </div>
      <div className="ps-4">
        <ScaleControl value={value} allowNA={NA_ALLOWED_KEYS.includes(sqdKey)} onSelect={(v) => onAnswer(sqdKey, v)} />
      </div>
    </div>
  );
}

interface FeedbackQuestionsProps {
  answers: FeedbackFormAnswers;
  onAnswer: (key: SqdKey, value: number | null) => void;
  comments: string;
  onCommentsChange: (value: string) => void;
  // When true, questions are shown under thematic section headers (see SQD_GROUPS).
  grouped?: boolean;
}

export function FeedbackQuestions({ answers, onAnswer, comments, onCommentsChange, grouped = false }: FeedbackQuestionsProps) {
  const answeredCount = SQD_KEYS.filter((k) => answers[k] !== undefined).length;

  return (
    <div>
      {/* Scale legend + progress */}
      <div
        className="mb-4 p-3"
        style={{
          backgroundColor: 'var(--pacu-bg)',
          borderRadius: 'var(--pacu-radius)',
          border: '1px solid var(--pacu-border)',
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <p className="pacu-eyebrow mb-0">Rating Scale</p>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{answeredCount} of {SQD_KEYS.length} answered</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '0.4rem 0.75rem',
            fontSize: '0.78rem',
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="d-flex align-items-center gap-1 text-muted">
              <span
                className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: 18, height: 18, borderRadius: 4, color: '#fff',
                  fontSize: '0.7rem', fontWeight: 700, backgroundColor: RATING_COLORS[n],
                }}
              >
                {n}
              </span>
              <span style={{ lineHeight: 1.2 }}>{SCALE_LABELS[n]}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Questions */}
      {grouped ? (
        SQD_GROUPS.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? 'mt-4' : undefined}>
            <p className="pacu-eyebrow mb-2">{group.title}</p>
            <div style={{ border: '1px solid var(--pacu-border)', borderRadius: 'var(--pacu-radius)', overflow: 'hidden' }}>
              {group.keys.map((key, ki) => (
                <QuestionRow key={key} sqdKey={key} value={answers[key]} first={ki === 0} onAnswer={onAnswer} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={{ border: '1px solid var(--pacu-border)', borderRadius: 'var(--pacu-radius)', overflow: 'hidden' }}>
          {SQD_KEYS.map((key, i) => (
            <QuestionRow key={key} sqdKey={key} value={answers[key]} first={i === 0} onAnswer={onAnswer} />
          ))}
        </div>
      )}

      <div className="mt-4">
        <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
          Comments or suggestions <span className="text-muted fw-normal">(optional)</span>
        </label>
        <textarea
          className="form-control"
          rows={4}
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          placeholder="Any additional feedback from the client…"
        />
      </div>
    </div>
  );
}
