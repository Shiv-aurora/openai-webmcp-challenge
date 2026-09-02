from pathlib import Path


def replace_exact(text: str, old: str, new: str, expected: int, label: str) -> str:
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f"Expected {expected} occurrence(s) of {label}; found {count}")
    return text.replace(old, new)


def update_entrypoint() -> None:
    path = Path("src/index.html")
    source = path.read_text()
    source = replace_exact(
        source,
        'console.log("Welcome to the MyST editor demo. The right hand side should auto update.");',
        'console.log("Research Integrity Editor foundation loaded.");',
        1,
        "upstream demo console message",
    )
    source = replace_exact(
        source,
        'id: "research-integrity-editor",',
        'id: "demo",',
        1,
        "product editor id",
    )
    path.write_text(source)


def update_browser_contract() -> None:
    path = Path("tests/myst-editor.spec.ts")
    source = path.read_text()
    source = replace_exact(
        source,
        r"expect(editorContent).toMatch(/^# This is MyST Editor/);",
        r"expect(editorContent).toMatch(/^---\ntitle: Regime-Aware Volatility Forecasting/);",
        2,
        "old initial manuscript expectation",
    )
    source = replace_exact(
        source,
        r'expect(editorContent).not.toContain("# This is MyST Editor");',
        r'expect(editorContent).not.toContain("# Regime-Aware Volatility Forecasting");',
        1,
        "old collaborative manuscript expectation",
    )
    source = replace_exact(
        source,
        'await expect(page.locator("#topbar .side:last-child .btns button")).toHaveCount(2);',
        'await expect(page.locator("#topbar .side:last-child .btns button")).toHaveCount(1);',
        1,
        "demo-only toolbar button expectation",
    )
    path.write_text(source)


def update_ci() -> None:
    Path(".github/workflows/ci.yml").write_text(
        """name: CI

on:
  push:
    branches: [main]
    paths:
      - src/**
      - tests/**
      - bin/**
      - package.json
      - package-lock.json
      - vite.config.js
      - .eslintrc.cjs
      - .eslintignore
      - .github/workflows/ci.yml
  pull_request:
    paths:
      - src/**
      - tests/**
      - bin/**
      - package.json
      - package-lock.json
      - vite.config.js
      - .eslintrc.cjs
      - .eslintignore
      - .github/workflows/ci.yml

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      NODE_OPTIONS: --max-old-space-size=4096

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Check formatting
        run: npm run check-format

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Install Chromium
        run: npx playwright install --with-deps chromium

      - name: Install collaboration server dependencies
        run: npm ci --prefix bin

      - name: Run browser tests
        run: |
          npm run preview -- --host 127.0.0.1 > /tmp/vite-preview.log 2>&1 &
          preview_pid=$!
          YPERSISTENCE=/tmp/myst-docs PORT=4455 node bin/server.js > /tmp/collaboration.log 2>&1 &
          collaboration_pid=$!

          cleanup() {
            kill "$preview_pid" "$collaboration_pid" 2>/dev/null || true
          }
          trap cleanup EXIT

          for attempt in {1..30}; do
            if curl --fail --silent http://127.0.0.1:4173/ > /dev/null; then
              break
            fi
            if [ "$attempt" -eq 30 ]; then
              cat /tmp/vite-preview.log
              exit 1
            fi
            sleep 1
          done

          sleep 2
          if ! npm run test; then
            echo "--- Vite preview log ---"
            cat /tmp/vite-preview.log
            echo "--- Collaboration server log ---"
            cat /tmp/collaboration.log
            exit 1
          fi

      - name: Upload browser test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report
            test-results
          if-no-files-found: ignore
          retention-days: 7
"""
    )


def main() -> None:
    update_entrypoint()
    update_browser_contract()
    update_ci()


if __name__ == "__main__":
    main()
