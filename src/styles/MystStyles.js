import styled from "styled-components";

/** Design tokens.
 *
 * The palette is a warm neutral ramp rather than a blue-tinted one: text sits at #37352f and
 * surfaces at #f7f7f5/#ffffff, so large reading surfaces stay soft under long editing sessions.
 * Provenance states borrow the six-hue tag set below, which is the only place saturated color
 * appears — everything structural is a neutral or a hairline. */
export const MystCSSVars = styled.div`
  --gray-900: #37352f;
  --gray-800: #4b4a45;
  --gray-700: #6b6a67;
  --gray-600: #87867f;
  --gray-500: #9b9a97;
  --gray-400: #c7c6c2;
  --gray-300: #e0dfdc;
  --gray-200: #ededec;
  --gray-100: #f7f7f5;

  --blue-500: #2383e2;
  --blue-200: #d3e5ef;
  --blue-100: #e7f3f8;
  --red-500: #d44c47;
  --red-400: #ffe2dd;
  --orange-500: #d9730d;
  --green-500: #448361;
  --green-400: #a8d5ba;
  --green-300: #dbeddb;
  --brown-500: #9f6b53;

  /* Status tags. Saturated foreground on a low-chroma wash, so a row of them reads as
     text with emphasis instead of a row of buttons. */
  --tag-gray-fg: #6b6a67;
  --tag-gray-bg: #e9e9e7;
  --tag-blue-fg: #2b6d9e;
  --tag-blue-bg: #ddebf1;
  --tag-green-fg: #3d7f5d;
  --tag-green-bg: #dbeddb;
  --tag-orange-fg: #b8620b;
  --tag-orange-bg: #fbecdd;
  --tag-red-fg: #c4453f;
  --tag-red-bg: #ffe6e2;
  --tag-purple-fg: #8258a6;
  --tag-purple-bg: #eae3f0;

  --accent: #2383e2;
  --accent-dark: #1a73c7;
  --accent-light: #e7f3f8;

  --ink: #37352f;
  --ink-secondary: #6b6a67;
  --ink-tertiary: #87867f;
  --ink-faint: #9b9a97;

  /* Surface ladder. Everything used to be #ffffff, which left the manuscript, the source pane and
     the chrome reading as one continuous sheet. These are deliberately ~1-2% steps of the same
     warm hue rather than distinct colors: enough to separate the planes, not enough to become
     decoration. Only the document and things that float above it are pure white. */
  --canvas: #f7f6f3;
  --paper: #ffffff;
  --sidebar-bg: #f4f3f0;
  --panel-bg: #faf9f7;
  --navbar-bg: #fdfcfb;
  --modal-bg: #ffffff;

  --border: #e9e9e7;
  --hairline: rgba(55, 53, 47, 0.09);
  --border-2: 2px;

  --hover: rgba(55, 53, 47, 0.055);
  --active: rgba(55, 53, 47, 0.09);
  --selected: rgba(35, 131, 226, 0.09);

  --radius-sm: 3px;
  --radius: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --border-radius: var(--radius);

  --button-bg: transparent;
  --button-bg-hover: var(--hover);
  --switch-bg: var(--gray-400);
  --switch-active-bg: var(--accent);

  --box-shadow: rgba(15, 15, 15, 0.06);
  --shadow-raised: 0 1px 2px rgba(15, 15, 15, 0.06);
  --shadow-menu: rgba(15, 15, 15, 0.05) 0 0 0 1px, rgba(15, 15, 15, 0.1) 0 3px 6px, rgba(15, 15, 15, 0.2) 0 9px 24px;
  --icon-invert: 0;

  --font-sans:
    ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji",
    "Segoe UI Symbol";
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

  --string-fg: var(--brown-500);
  --deleted-bg: #ffe6e2;
  --inserted-bg: #dbeddb;

  /* The source pane sits one step below the rendered manuscript, so "what I typed" and "what it
     becomes" are distinguishable at a glance in dual-pane mode. */
  --editor-bg: #f7f6f3;
  --editor-gutter-fg: var(--ink-faint);
  --editor-selection-bg: rgba(35, 131, 226, 0.14);
  --editor-active-line-bg: rgba(55, 53, 47, 0.03);
  --error-bg: var(--red-500);
`;

export const MystContainer = styled(MystCSSVars)`
  all: initial;
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;

  @media print {
    @page {
      margin: 1.5cm !important;
    }
  }

  .todo {
    background-color: #fbf3db;
    box-shadow: 0 0 0 2px #fbf3db;
    border-radius: 2px;
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
  textarea,
  button {
    color: inherit;
    font-family: inherit;
  }

  ::placeholder {
    color: var(--ink-faint);
  }

  * {
    scrollbar-color: var(--gray-400) transparent;
    scrollbar-width: thin;
  }

  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  *::-webkit-scrollbar-track {
    background: transparent;
  }

  *::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border: 3px solid transparent;
    border-radius: 6px;
    background-color: var(--gray-400);
  }

  *::-webkit-scrollbar-thumb:hover {
    background-color: var(--gray-500);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }

  ins {
    background: var(--inserted-bg);
    text-decoration: none;
    border-radius: 2px;
  }

  del {
    background: var(--deleted-bg);
    border-radius: 2px;
  }
`;

export const darkTheme = new CSSStyleSheet();
darkTheme.replaceSync(`
  #myst-css-namespace {
    color: #e6e5e2;

    --gray-900: #e6e5e2;
    --gray-800: #d2d1cd;
    --gray-700: #a5a29c;
    --gray-600: #8f8c86;
    --gray-500: #7a776f;
    --gray-400: #5a5751;
    --gray-300: #3f3d39;
    --gray-200: #333130;
    --gray-100: #262523;

    --tag-gray-fg: #b0aca4;
    --tag-gray-bg: rgba(255, 255, 255, 0.075);
    --tag-blue-fg: #7cb4dd;
    --tag-blue-bg: rgba(124, 180, 221, 0.14);
    --tag-green-fg: #7fbf9a;
    --tag-green-bg: rgba(127, 191, 154, 0.14);
    --tag-orange-fg: #e2a05f;
    --tag-orange-bg: rgba(226, 160, 95, 0.14);
    --tag-red-fg: #e08c86;
    --tag-red-bg: rgba(224, 140, 134, 0.14);
    --tag-purple-fg: #b795d6;
    --tag-purple-bg: rgba(183, 149, 214, 0.14);

    --accent: #529cca;
    --accent-dark: #6cb2e0;
    --accent-light: rgba(82, 156, 202, 0.16);

    --ink: #e6e5e2;
    --ink-secondary: #a5a29c;
    --ink-tertiary: #8f8c86;
    --ink-faint: #7a776f;

    /* Same ladder inverted: the manuscript is the lightest plane and navigation recedes furthest,
       so depth reads the same way in either theme. */
    --canvas: #171716;
    --paper: #201f1e;
    --sidebar-bg: #131312;
    --panel-bg: #1b1a19;
    --navbar-bg: #1d1c1b;
    --modal-bg: #252525;

    --border: #2f2e2c;
    --hairline: rgba(255, 255, 255, 0.094);

    --hover: rgba(255, 255, 255, 0.055);
    --active: rgba(255, 255, 255, 0.1);
    --selected: rgba(82, 156, 202, 0.16);

    --button-bg: transparent;
    --button-bg-hover: var(--hover);
    --switch-bg: #5a5751;

    --box-shadow: rgba(0, 0, 0, 0.3);
    --shadow-raised: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-menu:
      rgba(15, 15, 15, 0.2) 0 0 0 1px, rgba(15, 15, 15, 0.4) 0 3px 6px, rgba(15, 15, 15, 0.6) 0 9px 24px;
    --icon-invert: 1;

    --string-fg: #c98f6d;
    --deleted-bg: rgba(224, 140, 134, 0.22);
    --inserted-bg: rgba(127, 191, 154, 0.22);

    --editor-bg: #171716;
    --editor-gutter-fg: #7a776f;
    --editor-selection-bg: rgba(82, 156, 202, 0.22);
    --editor-active-line-bg: rgba(255, 255, 255, 0.03);
    --error-bg: #e08c86;

    color-scheme: dark;
  }
`);
