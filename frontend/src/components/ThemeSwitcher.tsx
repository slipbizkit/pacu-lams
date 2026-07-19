import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'bi-sun' },
  { value: 'soft-light', label: 'Soft Light', icon: 'bi-file-earmark-text' },
  { value: 'dark', label: 'Dark', icon: 'bi-moon-stars' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[0];

  function cycle() {
    const idx = OPTIONS.findIndex((o) => o.value === theme);
    const next = OPTIONS[(idx + 1) % OPTIONS.length];
    setTheme(next.value);
  }

  return (
    <button
      type="button"
      className="pacu-theme-switch active"
      onClick={cycle}
      aria-label={`Theme: ${current.label}`}
      title={current.label}
    >
      <i className={`bi ${current.icon}`} />
    </button>
  );
}
