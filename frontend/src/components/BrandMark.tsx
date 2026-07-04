interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 34 }: BrandMarkProps) {
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: 'var(--pacu-accent)',
        color: 'var(--pacu-accent-contrast)',
        fontFamily: 'var(--pacu-font-display)',
        fontWeight: 600,
        fontSize: size * 0.48,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      P
    </span>
  );
}
