import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

// Single-button cycling toggle, used on the authenticated navbar plus the login
// and feedback screens. The full 3-way segmented ThemeSwitcher is kept for the
// intake kiosk, where the options are laid out explicitly for walk-in clients.
const ORDER: Theme[] = ['light', 'soft-light', 'dark'];
const META: Record<Theme, { label: string; icon: string }> = {
  light: { label: 'Light', icon: 'bi-sun' },
  'soft-light': { label: 'Soft Light', icon: 'bi-file-earmark-text' },
  dark: { label: 'Dark', icon: 'bi-moon-stars' },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function handleClick() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
  }

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center"
      onClick={handleClick}
      title={`Theme: ${META[theme].label} (click for ${META[next].label})`}
      aria-label={`Current theme: ${META[theme].label}. Click to switch to ${META[next].label}.`}
    >
      <i className={`bi ${META[theme].icon}`} />
    </button>
  );
}
