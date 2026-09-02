from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f"Expected block not found in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


xray = r'''import { Compartment } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";

export const xrayCompartment = new Compartment();

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

export function createXrayExtension(active, objects, doc) {
  if (!active || !doc || !objects?.length) return [];

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

  return EditorView.decorations.of(Decoration.set(ranges, true));
}
'''
Path("src/integrity/xray.js").write_text(xray)

replace_once(
    "src/integrity/provenance.js",
    '  const data = signal(safeLoad(storageKey));\n  const persistenceCleanup = effect(() => safeSave(storageKey, data.value));',
    '  const data = signal(safeLoad(storageKey));\n  const xrayActive = signal(false);\n  const persistenceCleanup = effect(() => safeSave(storageKey, data.value));',
)
replace_once(
    "src/integrity/provenance.js",
    '''  const stats = () => {
    const current = data.value;
    const linkedObjectIds = new Set(current.links.map((link) => link.objectId));
    return {
      objectCount: current.objects.length,
      linkedObjectCount: linkedObjectIds.size,
      evidenceCount: current.evidence.length,
    };
  };''',
    '''  const stats = () => {
    const current = data.value;
    const linkedObjectIds = new Set(current.links.map((link) => link.objectId));
    const stateCounts = Object.fromEntries(VERIFICATION_STATES.map((state) => [state, 0]));
    current.objects.forEach((object) => {
      if (object.verificationState in stateCounts) stateCounts[object.verificationState] += 1;
    });
    return {
      objectCount: current.objects.length,
      linkedObjectCount: linkedObjectIds.size,
      evidenceCount: current.evidence.length,
      stateCounts,
    };
  };''',
)
replace_once(
    "src/integrity/provenance.js",
    '''  return {
    data,
    storageKey,''',
    '''  return {
    data,
    xrayActive,
    storageKey,''',
)

replace_once(
    "src/components/CodeMirror.jsx",
    'import { deriveManuscriptSelection } from "../integrity/selection";',
    'import { deriveManuscriptSelection } from "../integrity/selection";\nimport { ensureProvenanceStore } from "../integrity/provenance";\nimport { createXrayExtension, xrayCompartment } from "../integrity/xray";',
)
replace_once(
    "src/components/CodeMirror.jsx",
    '''  .cm-error {
    text-decoration: underline var(--error-bg) 2px;
  }
''',
    '''  .cm-error {
    text-decoration: underline var(--error-bg) 2px;
  }

  .cm-xray-object {
    border-radius: 3px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }

  .cm-xray-verified {
    background: color-mix(in srgb, var(--accent-dark) 12%, transparent);
    text-decoration: underline solid var(--accent-dark) 2px;
    text-underline-offset: 3px;
  }

  .cm-xray-needs-review {
    background: color-mix(in srgb, var(--orange-500) 12%, transparent);
    text-decoration: underline dashed var(--orange-500) 2px;
    text-underline-offset: 3px;
  }

  .cm-xray-stale {
    background: color-mix(in srgb, var(--orange-500) 20%, transparent);
    text-decoration: underline double var(--orange-500) 2px;
    text-underline-offset: 3px;
  }

  .cm-xray-contradicted {
    background: color-mix(in srgb, var(--error-bg) 18%, transparent);
    text-decoration: underline wavy var(--error-bg) 2px;
    text-underline-offset: 3px;
  }

  .cm-xray-unlinked {
    background: color-mix(in srgb, var(--border) 30%, transparent);
    text-decoration: underline dotted var(--editor-gutter-fg) 2px;
    text-underline-offset: 3px;
  }
''',
)
replace_once(
    "src/components/CodeMirror.jsx",
    '''const CodeMirror = () => {
  const { editorView, options, collab, userSettings, linter, text, headings, error, suggestMode, manuscriptSelection } = useContext(MystState);
  const logger = useContext(Logger);''',
    '''const CodeMirror = () => {
  const editorState = useContext(MystState);
  const { editorView, options, collab, userSettings, linter, text, headings, error, suggestMode, manuscriptSelection } = editorState;
  const provenance = ensureProvenanceStore(editorState);
  const logger = useContext(Logger);''',
)
replace_once(
    "src/components/CodeMirror.jsx",
    '''  const renderTimer = useRef(null);

  useSignalEffect(() => {''',
    '''  const renderTimer = useRef(null);

  useSignalEffect(() => {
    const view = editorView.value;
    const active = provenance.xrayActive.value;
    const objects = provenance.data.value.objects;
    if (!view?.dispatch) return;
    view.dispatch({ effects: xrayCompartment.reconfigure(createXrayExtension(active, objects, view.state.doc)) });
  });

  useSignalEffect(() => {''',
)
replace_once(
    "src/components/CodeMirror.jsx",
    '''        .useLineNumbers()
        .useCompartment(userExtensionsCompartment, [])
        .useSpellcheck(options.spellcheckOpts.value)''',
    '''        .useLineNumbers()
        .useCompartment(userExtensionsCompartment, [])
        .useCompartment(xrayCompartment, [])
        .useSpellcheck(options.spellcheckOpts.value)''',
)

replace_once(
    "src/integrity/ResearchIntegrityPanel.jsx",
    'import { EVIDENCE_TYPES, PROVENANCE_RELATIONS, VERIFICATION_STATES, ensureProvenanceStore } from "./provenance";',
    'import { EVIDENCE_TYPES, PROVENANCE_RELATIONS, VERIFICATION_STATES, ensureProvenanceStore } from "./provenance";\nimport { resolveXrayRange } from "./xray";',
)
replace_once(
    "src/integrity/ResearchIntegrityPanel.jsx",
    '''const EvidenceForm = styled.form`
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
`;
''',
    '''const EvidenceForm = styled.form`
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
`;

const XraySummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin-top: 14px;
`;

const XraySummaryItem = styled.div`
  min-width: 0;
  padding: 9px 5px;
  border: 1px solid ${(props) => statusTone(props.$status)};
  border-radius: var(--border-radius);
  background: color-mix(in srgb, ${(props) => statusTone(props.$status)} 9%, transparent);
  text-align: center;
`;

const XrayCount = styled.strong`
  display: block;
  font-size: 17px;
`;

const XrayLabel = styled.span`
  display: block;
  margin-top: 3px;
  font-size: 9px;
  line-height: 1.2;
  text-transform: uppercase;
  opacity: 0.72;
`;

const XrayList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`;

const XrayItem = styled.button`
  width: 100%;
  padding: 10px 11px;
  border: 1px solid var(--border);
  border-left: 4px solid ${(props) => statusTone(props.$status)};
  border-radius: var(--border-radius);
  background: var(--editor-bg);
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--button-bg-hover);
  }
`;

const XrayItemTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
`;

const XraySnippet = styled.div`
  margin-top: 5px;
  font-size: 10px;
  line-height: 1.35;
  opacity: 0.72;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
''',
)
replace_once(
    "src/integrity/ResearchIntegrityPanel.jsx",
    '''const statusLabels = {
  unlinked: "Unlinked",
  "context-only": "Context only",
  "needs-review": "Needs review",
  verified: "Verified",
  stale: "Stale",
  contradicted: "Contradicted",
};''',
    '''const statusLabels = {
  unlinked: "Unlinked",
  "context-only": "Context only",
  "needs-review": "Needs review",
  verified: "Verified",
  stale: "Stale",
  contradicted: "Contradicted",
};

const xrayStatuses = ["verified", "needs-review", "stale", "contradicted", "unlinked"];''',
)
replace_once(
    "src/integrity/ResearchIntegrityPanel.jsx",
    '''  const canTrack = Boolean(selection.snippet) && ["text", "claim", "method", "figure", "table"].includes(selection.kind);
  const requestedKind = selection.kind === "text" ? "claim" : selection.kind;
''',
    '''  const canTrack = Boolean(selection.snippet) && ["text", "claim", "method", "figure", "table"].includes(selection.kind);
  const requestedKind = selection.kind === "text" ? "claim" : selection.kind;
  const xrayActive = provenance.xrayActive.value;
  const xrayObjects = provenance.data.value.objects;
  const stateCounts = provenanceStats.stateCounts;
''',
)
replace_once(
    "src/integrity/ResearchIntegrityPanel.jsx",
    '''  const editEvidence = ({ evidence, link }) => {
    setEditing({ evidenceId: evidence.id, linkId: link.id });
    setEvidenceForm({
      type: evidence.type,
      label: evidence.label,
      artifactId: evidence.artifactId,
      experimentId: evidence.experimentId,
      commit: evidence.commit,
      metric: evidence.metric,
      uri: evidence.uri,
      relation: link.relation,
      notes: evidence.notes,
    });
  };
''',
    '''  const editEvidence = ({ evidence, link }) => {
    setEditing({ evidenceId: evidence.id, linkId: link.id });
    setEvidenceForm({
      type: evidence.type,
      label: evidence.label,
      artifactId: evidence.artifactId,
      experimentId: evidence.experimentId,
      commit: evidence.commit,
      metric: evidence.metric,
      uri: evidence.uri,
      relation: link.relation,
      notes: evidence.notes,
    });
  };

  const inspectXrayObject = (object) => {
    const view = editorState.editorView.value;
    if (!view) return;
    const range = resolveXrayRange(view.state.doc, object);
    if (!range) return;
    view.dispatch({ selection: { anchor: range.from, head: range.to }, scrollIntoView: true });
    view.focus();
  };
''',
)
replace_once(
    "src/integrity/ResearchIntegrityPanel.jsx",
    '''          <Kicker>Manuscript state</Kicker>
          <Title>Research integrity</Title>''',
    '''          <Kicker>{xrayActive ? "Global integrity map" : "Manuscript state"}</Kicker>
          <Title>{xrayActive ? "Research X-Ray" : "Research integrity"}</Title>''',
)
replace_once(
    "src/integrity/ResearchIntegrityPanel.jsx",
    '''      <Section>
        <SectionHeading>Provenance coverage</SectionHeading>''',
    '''      <Section>
        <SectionHeading>Research X-Ray</SectionHeading>
        <ActionButton
          $primary={!xrayActive}
          aria-pressed={xrayActive}
          data-testid="toggle-xray"
          type="button"
          onClick={() => (provenance.xrayActive.value = !provenance.xrayActive.peek())}
        >
          {xrayActive ? "Exit X-Ray" : "Enter X-Ray"}
        </ActionButton>
        <Muted>
          {xrayActive
            ? "The manuscript is showing provenance health directly on every tracked research object."
            : "Turn the manuscript into a visual integrity map without changing its content."}
        </Muted>
        {xrayActive && (
          <>
            <XraySummaryGrid data-testid="xray-summary">
              {xrayStatuses.map((status) => (
                <XraySummaryItem $status={status} key={status}>
                  <XrayCount data-testid={`xray-count-${status}`}>{stateCounts[status] || 0}</XrayCount>
                  <XrayLabel>{status === "needs-review" ? "Review" : statusLabels[status]}</XrayLabel>
                </XraySummaryItem>
              ))}
            </XraySummaryGrid>
            {xrayObjects.length ? (
              <XrayList data-testid="xray-list">
                {xrayObjects.map((object) => (
                  <XrayItem
                    $status={object.verificationState}
                    aria-label={`Inspect ${objectLabel(object)} ${statusLabels[object.verificationState]}`}
                    data-testid="xray-item"
                    key={object.id}
                    type="button"
                    onClick={() => inspectXrayObject(object)}
                  >
                    <XrayItemTop>
                      <span>{objectLabel(object)}</span>
                      <Status $status={object.verificationState}>{statusLabels[object.verificationState]}</Status>
                    </XrayItemTop>
                    <XraySnippet>{object.text}</XraySnippet>
                  </XrayItem>
                ))}
              </XrayList>
            ) : (
              <EmptyState>No tracked manuscript objects yet. Track a claim, method, figure, or table to populate X-Ray.</EmptyState>
            )}
          </>
        )}
      </Section>

      <Section>
        <SectionHeading>Provenance coverage</SectionHeading>''',
)

# Append Phase 3 browser coverage before the describe block closes.
tests = Path("tests/research-integrity.spec.ts")
text = tests.read_text()
needle = '\n});\n'
last = text.rfind(needle)
if last < 0:
    raise RuntimeError("Unable to find test describe closing block")
phase3_tests = r'''

  test("turns the manuscript into Research X-Ray in one interaction", async ({ page }) => {
    await trackStressClaim(page);
    await addStressEvidence(page);
    await page.getByTestId("verification-state").selectOption("verified");

    await page.getByTestId("toggle-xray").click();

    await expect(page.getByText("Research X-Ray", { exact: true })).toBeVisible();
    await expect(page.getByTestId("xray-summary")).toBeVisible();
    await expect(page.getByTestId("xray-count-verified")).toHaveText("1");
    await expect(page.locator(".cm-xray-verified")).toHaveCount(1);
    await expect(page.locator('[data-xray-state="verified"]')).toContainText("18.2% improvement");

    await page.getByTestId("toggle-xray").click();
    await expect(page.locator(".cm-xray-object")).toHaveCount(0);
  });

  test("distinguishes all five integrity states across claims, methods, tables, and figures", async ({ page }) => {
    const figure = "![Stress-regime accuracy](stress-regime-accuracy.svg)";
    await page.evaluate((figureText) => {
      const view = (window as any).myst_editor.demo.main_editor;
      const insertAt = view.state.doc.length;
      view.dispatch({ changes: { from: insertAt, insert: `\n\n${figureText}\n` } });
    }, figure);

    const objects = [
      { needle: "18.2% improvement in stress-regime accuracy", kind: "claim", state: "verified", label: "claim evidence" },
      {
        needle: "The forecasting model is optimized with AdamW using a learning rate of **3e-4**.",
        kind: "method",
        state: "needs-review",
        label: "method evidence",
      },
      { needle: "| Stress | 59.3% | 70.1% | 18.2% |", kind: "table", state: "stale", label: "table evidence" },
      { needle: figure, kind: "figure", state: "contradicted", label: "figure evidence" },
      { needle: "481,000 market observations", kind: "claim", state: "unlinked", label: null },
    ];

    for (const item of objects) {
      await selectText(page, item.needle);
      await page.getByTestId("create-provenance-object").click();
      await page.evaluate(({ state, label }) => {
        const store = (window as any).myst_editor.demo.state.provenance;
        const selection = (window as any).myst_editor.demo.state.manuscriptSelection.value;
        const object = store.findObjectForSelection(selection);
        if (label) store.addEvidence(object.id, { label, type: "result-file", relation: "supports" });
        if (state !== "unlinked") store.updateObject(object.id, { verificationState: state });
      }, item);
    }

    await page.getByTestId("toggle-xray").click();

    for (const state of ["verified", "needs-review", "stale", "contradicted", "unlinked"]) {
      await expect(page.getByTestId(`xray-count-${state}`)).toHaveText("1");
      await expect(page.locator(`.cm-xray-${state}`)).toHaveCount(1);
    }
    await expect(page.getByTestId("xray-item")).toHaveCount(5);
    await expect(page.getByTestId("xray-list")).toContainText("Quantitative claim");
    await expect(page.getByTestId("xray-list")).toContainText("Method");
    await expect(page.getByTestId("xray-list")).toContainText("Table");
    await expect(page.getByTestId("xray-list")).toContainText("Figure");
  });

  test("navigates from an X-Ray item back to its manuscript provenance", async ({ page }) => {
    const method = "The forecasting model is optimized with AdamW using a learning rate of **3e-4**.";
    await selectText(page, method);
    await trackCurrentSelection(page);
    await page.getByTestId("evidence-label").fill("configs/train.yaml");
    await page.getByTestId("save-evidence").click();
    await page.getByTestId("verification-state").selectOption("stale");

    await selectText(page, "The central result is a measurable improvement during high-volatility periods.");
    await page.getByTestId("toggle-xray").click();
    await page.getByRole("button", { name: "Inspect Method Stale" }).click();

    await expect(page.getByTestId("selection-kind")).toHaveText("Method");
    await expect(page.getByTestId("selection-status")).toHaveText("Stale");
    await expect(page.getByTestId("provenance-object")).toContainText("AdamW");
    await expect(page.getByTestId("evidence-card")).toContainText("configs/train.yaml");
  });
'''
tests.write_text(text[:last] + phase3_tests + text[last:])

# Remove implementation scaffolding from the final branch commit.
Path("scripts/implement_phase3.py").unlink(missing_ok=True)
Path(".github/workflows/implement-phase3.yml").unlink(missing_ok=True)
