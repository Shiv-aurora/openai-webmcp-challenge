from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f"Expected block not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


Path("src/integrity/xray.js").write_text(r'''import { Compartment, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";

export const xrayCompartment = new Compartment();
export const setXrayDecorations = StateEffect.define();

export const xrayField = StateField.define({
  create: () => Decoration.set([]),
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(setXrayDecorations)) next = effect.value;
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const statusClasses = {
  verified: "cm-xray-verified",
  "needs-review": "cm-xray-needs-review",
  stale: "cm-xray-stale",
  contradicted: "cm-xray-contradicted",
  unlinked: "cm-xray-unlinked",
};

export function resolveXrayRange(doc, object) {
  if (!doc || !object?.anchor) return null;
  const from = Math.max(0, Math.min(object.anchor.from ?? 0, doc.length));
  const to = Math.max(from, Math.min(object.anchor.to ?? from, doc.length));
  const snippet = object.anchor.snippet?.trim();

  if (to > from) {
    const current = doc.sliceString(from, to);
    if (!snippet || current.includes(snippet) || snippet.includes(current.trim())) return { from, to };
  }

  if (snippet) {
    const found = doc.toString().indexOf(snippet);
    if (found >= 0) return { from: found, to: found + snippet.length };
  }

  return to > from ? { from, to } : null;
}

export function buildXrayDecorations(objects, doc) {
  if (!doc || !objects?.length) return Decoration.set([]);

  const ranges = objects
    .map((object) => {
      const range = resolveXrayRange(doc, object);
      const statusClass = statusClasses[object.verificationState];
      if (!range || !statusClass) return null;
      return Decoration.mark({
        class: `cm-xray-object ${statusClass}`,
        attributes: {
          "data-xray-object-id": object.id,
          "data-xray-state": object.verificationState,
          title: `Research X-Ray: ${object.verificationState.replaceAll("-", " ")}`,
        },
      }).range(range.from, range.to);
    })
    .filter(Boolean)
    .sort((left, right) => left.from - right.from || left.to - right.to);

  return Decoration.set(ranges, true);
}

export function refreshXray(view, active, objects) {
  if (!view?.dispatch) return;
  const decorations = active ? buildXrayDecorations(objects, view.state.doc) : Decoration.set([]);
  view.dispatch({ effects: setXrayDecorations.of(decorations) });
}
''')

replace_once(
    "src/components/CodeMirror.jsx",
    'import { createXrayExtension, xrayCompartment } from "../integrity/xray";',
    'import { refreshXray, xrayCompartment, xrayField } from "../integrity/xray";',
)
replace_once(
    "src/components/CodeMirror.jsx",
    '''    if (!view?.dispatch) return;
    view.dispatch({ effects: xrayCompartment.reconfigure(createXrayExtension(active, objects, view.state.doc)) });''',
    '''    if (!view?.dispatch) return;
    refreshXray(view, active, objects);''',
)
replace_once(
    "src/components/CodeMirror.jsx",
    '.useCompartment(xrayCompartment, [])',
    '.useCompartment(xrayCompartment, xrayField)',
)

replace_once(
    "src/integrity/ResearchIntegrityPanel.jsx",
    'import { resolveXrayRange } from "./xray";',
    'import { refreshXray, resolveXrayRange } from "./xray";',
)
replace_once(
    "src/integrity/ResearchIntegrityPanel.jsx",
    'onClick={() => (provenance.xrayActive.value = !provenance.xrayActive.peek())}',
    '''onClick={() => {
            const next = !provenance.xrayActive.peek();
            provenance.xrayActive.value = next;
            refreshXray(editorState.editorView.value, next, provenance.data.peek().objects);
          }}''',
)

replace_once(
    "tests/research-integrity.spec.ts",
    'await expect(page.getByText("Research X-Ray", { exact: true })).toBeVisible();',
    'await expect(page.getByRole("heading", { name: "Research X-Ray", exact: true })).toBeVisible();',
)

Path("scripts/fix_phase3.py").unlink(missing_ok=True)
Path(".github/workflows/fix-phase3.yml").unlink(missing_ok=True)
