import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'bi-sun' },
  { value: 'soft-light', label: 'Soft Light', icon: 'bi-file-earmark-text' },
  { value: 'dark', label: 'Dark', icon: 'bi-moon-stars' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="pacu-theme-switch" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={theme === opt.value}
          aria-label={opt.label}
          title={opt.label}
          className={theme === opt.value ? 'active' : ''}
          onClick={() => setTheme(opt.value)}
        >
          <i className={`bi ${opt.icon}`} />
        </button>
      ))}
    </div>
  );
}
