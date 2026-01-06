/**
 * Design System Theme - "Tactical Command Interface"
 *
 * A military spacecraft CIC aesthetic with amber warning displays,
 * scan lines, angular panels, and holographic elements.
 */

/** Color palette - Amber/Cyan tactical display */
export const colors = {
  // Primary amber (cockpit instrument style)
  primary: '#FF9F1C',
  primaryBright: '#FFBF00',
  primaryDim: '#CC7A00',
  primaryGlow: 'rgba(255, 159, 28, 0.4)',

  // Secondary cyan (holographic accents)
  secondary: '#00F5FF',
  secondaryDim: '#00B4B4',
  secondaryGlow: 'rgba(0, 245, 255, 0.3)',

  // Status colors
  success: '#00FF88',
  successDim: '#00CC6A',
  successGlow: 'rgba(0, 255, 136, 0.3)',

  warning: '#FFD93D',
  warningDim: '#CCAD00',

  danger: '#FF3366',
  dangerDim: '#CC2952',
  dangerGlow: 'rgba(255, 51, 102, 0.4)',

  // Backgrounds
  bgDeep: '#050508',
  bgPanel: 'rgba(10, 15, 25, 0.95)',
  bgPanelHover: 'rgba(20, 30, 50, 0.95)',
  bgPanelActive: 'rgba(30, 45, 70, 0.95)',
  bgOverlay: 'rgba(0, 0, 0, 0.85)',

  // Borders
  border: '#1a2a3a',
  borderLight: '#2a4a6a',
  borderAccent: '#FF9F1C',
  borderCyan: '#00F5FF',

  // Text
  textPrimary: '#E8E8E8',
  textSecondary: '#8899AA',
  textDim: '#556677',
  textHighlight: '#FFFFFF',

  // Special
  scanline: 'rgba(0, 245, 255, 0.03)',
  noise: 'rgba(255, 255, 255, 0.02)',
};

/** Typography - Military/Technical fonts */
export const fonts = {
  // Display font for headers (futuristic, angular)
  display: "'Orbitron', 'Rajdhani', 'Exo 2', sans-serif",
  // Body font (clean monospace for data)
  body: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
  // UI font (readable sans-serif)
  ui: "'Rajdhani', 'Exo 2', 'Titillium Web', sans-serif",
};

/** Spacing scale */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

/** Border styles */
export const borders = {
  panel: `1px solid ${colors.border}`,
  panelLight: `1px solid ${colors.borderLight}`,
  accent: `1px solid ${colors.borderAccent}`,
  glow: `0 0 10px ${colors.primaryGlow}`,
  glowCyan: `0 0 10px ${colors.secondaryGlow}`,
};

/** Animation timings */
export const transitions = {
  fast: '0.15s ease',
  normal: '0.25s ease',
  slow: '0.4s ease',
};

/** Generate Google Fonts import URL */
export function getFontImport(): string {
  return `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500&family=Rajdhani:wght@400;500;600;700&display=swap');`;
}

/** CSS custom properties for runtime theming */
export function getCSSVariables(): string {
  return `
    :root {
      /* Colors */
      --color-primary: ${colors.primary};
      --color-primary-bright: ${colors.primaryBright};
      --color-primary-dim: ${colors.primaryDim};
      --color-primary-glow: ${colors.primaryGlow};

      --color-secondary: ${colors.secondary};
      --color-secondary-dim: ${colors.secondaryDim};
      --color-secondary-glow: ${colors.secondaryGlow};

      --color-success: ${colors.success};
      --color-success-dim: ${colors.successDim};
      --color-warning: ${colors.warning};
      --color-danger: ${colors.danger};
      --color-danger-glow: ${colors.dangerGlow};

      --bg-deep: ${colors.bgDeep};
      --bg-panel: ${colors.bgPanel};
      --bg-panel-hover: ${colors.bgPanelHover};
      --bg-panel-active: ${colors.bgPanelActive};

      --border-color: ${colors.border};
      --border-light: ${colors.borderLight};
      --border-accent: ${colors.borderAccent};

      --text-primary: ${colors.textPrimary};
      --text-secondary: ${colors.textSecondary};
      --text-dim: ${colors.textDim};

      /* Fonts */
      --font-display: ${fonts.display};
      --font-body: ${fonts.body};
      --font-ui: ${fonts.ui};

      /* Spacing */
      --space-xs: ${spacing.xs};
      --space-sm: ${spacing.sm};
      --space-md: ${spacing.md};
      --space-lg: ${spacing.lg};
      --space-xl: ${spacing.xl};
    }
  `;
}
