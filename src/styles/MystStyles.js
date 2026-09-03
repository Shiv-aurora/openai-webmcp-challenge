import styled from "styled-components";

export const MystCSSVars = styled.div`
  --gray-900: #17201e;
  --gray-800: #4f5a57;
  --gray-700: #7b8582;
  --gray-600: #c9cfcc;
  --gray-500: #d9ddda;
  --gray-400: #e8ebe8;
  --gray-300: #eef0ed;
  --gray-200: #f5f6f3;
  --gray-100: #fafaf7;
  --blue-500: #286b60;
  --blue-200: #a9cec5;
  --blue-100: #dcece7;
  --red-500: #b8473d;
  --red-400: #f5dfdc;
  --orange-500: #b7791f;
  --green-500: #2e7568;
  --green-400: #4e9487;
  --green-300: #e1efe9;
  --brown-500: #8a5a35;

  --accent: #8bbcaf;
  --accent-light: #dcece7;
  --accent-dark: #24695d;
  --ink: #17201e;
  --canvas: #efefeb;
  --paper: #fffefa;

  --border-2: 3px;
  --border-radius: 8px;
  --border: #d7dbd7;

  --navbar-bg: #fbfbf8;
  --button-bg: #fffefa;
  --button-bg-hover: #e9efeb;
  --modal-bg: #fffefa;
  --switch-bg: var(--gray-500);
  --switch-active-bg: var(--blue-500);
  --panel-bg: #fffefa;
  --box-shadow: rgba(35, 49, 45, 0.14);
  --icon-invert: 0;
  --string-fg: var(--brown-500);
  --deleted-bg: var(--red-400);
  --inserted-bg: var(--green-300);

  --editor-bg: #f8f8f5;
  --editor-gutter-fg: var(--gray-800);
  --editor-selection-bg: rgb(215, 212, 240);
  --editor-active-line-bg: #cceeff44;
  --error-bg: var(--red-500);
`;

export const MystContainer = styled(MystCSSVars)`
  all: initial;
  color: var(--ink);
  font-family:
    Inter,
    ui-sans-serif,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
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
    color: #eef3f0;
    --ink: #eef3f0;
    --canvas: #131a18;
    --navbar-bg: #18201e;
    --border: #34423e;
    --button-bg: #202a27;
    --button-bg-hover: #2b3935;
    --switch-bg: #394743;
    --modal-bg: #18201e;
    --panel-bg: #18201e;
    --paper: #1d2724;
    --box-shadow: rgba(0, 0, 0, 0.4);
    --icon-invert: 1;
    --string-fg: #ffa657;

    --accent: #69a99a;
    --accent-light: #274a42;
    --accent-dark: #85c7b7;

    --editor-bg: #2a2a2a;
    --editor-gutter-fg: #ddd;
    --editor-selection-bg: #d7d4f020;
    --editor-active-line-bg: #cceeff10;
    --error-bg: #f5766e;
    --deleted-bg: #e74a3cb2;
    --inserted-bg: #00af91b2;
    
    color-scheme: dark;
  }
`);
