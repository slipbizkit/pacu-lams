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

// Faint wash of a rating's colour, so the 1→5 buttons read as a red→green ramp
// before anything is selected — the direction of the scale is visible at a glance.
// Translucent, so it adapts to whichever theme is behind it.
function tint(color: string, pct: number) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

// The selected fill carries white text. Fixed dark ramp colours (not the theme
// accent vars) so white clears WCAG AA (≈5:1) regardless of theme — the light-theme
// amber/green are too pale for white text, and deriving a darkened shade from the
// theme var is fragile across the light/dark switch.
const SELECTED_COLORS: Record<number, string> = {
  1: '#b91c1c', // red-700
  2: '#b91c1c',
  3: '#b45309', // amber-700
  4: '#15803d', // green-700
  5: '#15803d',
};

function ScaleControl({ value, allowNA, onSelect }: ScaleControlProps) {
  return (
    <div>
      <div className="btn-group w-100" role="group" aria-label="Rating from 1 to 5">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          const color = RATING_COLORS[n];
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              aria-pressed={selected}
              aria-label={`${n} — ${SCALE_LABELS[n]}`}
              title={SCALE_LABELS[n]}
              className="btn"
              style={{
                // 46px keeps each target above the ~44px touch-target guideline —
                // this form is often filled on a phone by elderly clients.
                flex: '1 1 0',
                minHeight: 46,
                fontWeight: 700,
                fontSize: '1rem',
                border: `1px solid ${selected ? SELECTED_COLORS[n] : tint(color, 32)}`,
                backgroundColor: selected ? SELECTED_COLORS[n] : tint(color, 12),
                color: selected ? '#fff' : 'var(--pacu-text)',
                transition: 'background-color 0.12s, color 0.12s, border-color 0.12s',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* End anchors, repeated on every row so the client never has to scroll back
          to the legend to remember which way the scale runs. */}
      <div
        className="d-flex justify-content-between mt-1"
        style={{ fontSize: '0.72rem', color: 'var(--pacu-text-muted)' }}
      >
        <span>Disagree</span>
        <span>Agree</span>
      </div>

      {allowNA && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={value === null}
          className="btn w-100 mt-2"
          style={{
            minHeight: 42,
            fontWeight: 600,
            fontSize: '0.85rem',
            border: `1px solid ${value === null ? 'var(--pacu-accent)' : 'var(--pacu-border)'}`,
            backgroundColor: value === null ? 'var(--pacu-accent)' : 'transparent',
            color: value === null ? 'var(--pacu-accent-contrast)' : 'var(--pacu-text-secondary)',
            transition: 'background-color 0.12s, color 0.12s, border-color 0.12s',
          }}
        >
          Not Applicable
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
  // When true, a slim progress bar pins to the top of the viewport as the client
  // scrolls the 10 questions, so their progress stays visible the whole way down.
  stickyProgress?: boolean;
}

export function FeedbackQuestions({ answers, onAnswer, comments, onCommentsChange, grouped = false, stickyProgress = false }: FeedbackQuestionsProps) {
  const answeredCount = SQD_KEYS.filter((k) => answers[k] !== undefined).length;
  const progressPct = Math.round((answeredCount / SQD_KEYS.length) * 100);

  return (
    <div>
      {stickyProgress && (
        <div
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={SQD_KEYS.length}
          aria-label="Feedback progress"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            // Opaque page colour so the questions scroll cleanly underneath it.
            backgroundColor: 'var(--pacu-bg)',
            padding: '0.6rem 0 0.7rem',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--pacu-border)',
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.78rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--pacu-text-secondary)' }}>Your progress</span>
            <span style={{ color: 'var(--pacu-text-secondary)' }}>{answeredCount} of {SQD_KEYS.length} answered</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, backgroundColor: 'var(--pacu-border)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                borderRadius: 999,
                backgroundColor: 'var(--pacu-accent)',
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Scale legend + progress. Uses the surface colour (not the page bg) so the
          card separates from the page in dark mode, where the two are otherwise
          identical. */}
      <div
        className="mb-4 p-3"
        style={{
          backgroundColor: 'var(--pacu-surface)',
          borderRadius: 'var(--pacu-radius)',
          border: '1px solid var(--pacu-border)',
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <p className="pacu-eyebrow mb-0">Rating Scale</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--pacu-text-secondary)' }}>{answeredCount} of {SQD_KEYS.length} answered</span>
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
            <span key={n} className="d-flex align-items-center gap-1" style={{ color: 'var(--pacu-text-secondary)' }}>
              <span
                className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  // Fixed dark ramp (not the theme accent, which is a pale pastel in
                  // dark mode that white text can't sit on) so the chip is legible
                  // in both themes and matches a selected button.
                  width: 18, height: 18, borderRadius: 4, color: '#fff',
                  fontSize: '0.7rem', fontWeight: 700, backgroundColor: SELECTED_COLORS[n],
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
