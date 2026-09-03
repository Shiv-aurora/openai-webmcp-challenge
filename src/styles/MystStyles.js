import styled from "styled-components";

export const MystCSSVars = styled.div`
  --gray-900: #1a1a1a;
  --gray-800: #2d3748;
  --gray-700: #4a5568;
  --gray-600: #718096;
  --gray-500: #a0aec0;
  --gray-400: #cbd5e0;
  --gray-300: #e2e8f0;
  --gray-200: #edf2f7;
  --gray-100: #f7fafc;
  --blue-500: #3182ce;
  --blue-200: #bee3f8;
  --blue-100: #ebf8ff;
  --red-500: #e53e3e;
  --red-400: #fc8181;
  --orange-500: #dd6b20;
  --green-500: #38a169;
  --green-400: #68d391;
  --green-300: #c6f6d5;
  --brown-500: #8b4513;

  --accent: #6366f1;
  --accent-light: #e0e7ff;
  --accent-dark: #4f46e5;
  --ink: #1a202c;
  --canvas: #fafafa;
  --paper: #ffffff;

  --border-2: 2px;
  --border-radius: 6px;
  --border: #e2e8f0;

  --navbar-bg: #ffffff;
  --button-bg: #ffffff;
  --button-bg-hover: #f8f9fa;
  --modal-bg: #ffffff;
  --switch-bg: var(--gray-400);
  --switch-active-bg: var(--accent);
  --panel-bg: #ffffff;
  --box-shadow: rgba(0, 0, 0, 0.1);
  --icon-invert: 0;
  --string-fg: var(--brown-500);
  --deleted-bg: var(--red-400);
  --inserted-bg: var(--green-300);

  --editor-bg: #ffffff;
  --editor-gutter-fg: var(--gray-600);
  --editor-selection-bg: rgba(99, 102, 241, 0.1);
  --editor-active-line-bg: rgba(99, 102, 241, 0.03);
  --error-bg: var(--red-500);
`;

export const MystContainer = styled(MystCSSVars)`
  all: initial;
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 14px;
  line-height: 1.5;
  height: 100%;

  @media print {
    @page {
      margin: 1.5cm !important;
    }
  }

  .todo {
    background-color: yellow;
  }

  .file-link {
    color: var(--accent-dark);

    &:hover {
      cursor: pointer;
      text-decoration: underline;
    }
  }

  input,
  select,
  dialog,
  textarea {
    color: inherit;
    font-family: inherit;
  }

  * {
    scrollbar-color: var(--gray-600) transparent;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }

  ins {
    background: var(--inserted-bg);
  }

  del {
    background: var(--deleted-bg);
  }
`;

export const darkTheme = new CSSStyleSheet();
darkTheme.replaceSync(`
  #myst-css-namespace {
    color: #f1f5f9;
    --ink: #f1f5f9;
    --canvas: #0f172a;
    --navbar-bg: #1e293b;
    --border: #334155;
    --button-bg: #1e293b;
    --button-bg-hover: #334155;
    --switch-bg: #475569;
    --modal-bg: #1e293b;
    --panel-bg: #1e293b;
    --paper: #0f172a;
    --box-shadow: rgba(0, 0, 0, 0.5);
    --icon-invert: 1;
    --string-fg: #fbbf24;

    --accent: #818cf8;
    --accent-light: #312e81;
    --accent-dark: #a5b4fc;

    --editor-bg: #0f172a;
    --editor-gutter-fg: #64748b;
    --editor-selection-bg: rgba(129, 140, 248, 0.1);
    --editor-active-line-bg: rgba(129, 140, 248, 0.03);
    --error-bg: #ef4444;
    --deleted-bg: rgba(239, 68, 68, 0.2);
    --inserted-bg: rgba(34, 197, 94, 0.2);
    
    color-scheme: dark;
  }
`);
