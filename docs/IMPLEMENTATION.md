# IMPLEMENTATION.md

# Implementation Plan

This document defines **what must be built**, phase by phase.

It intentionally does not prescribe implementation techniques, architecture choices, frameworks, coding patterns, or detailed engineering methods.

---

# Phase 0 — Establish the Foundation

- Fork or incorporate the Antmicro MyST Editor as the scientific editing foundation.
- Preserve all required Apache-2.0 attribution and notices.
- Add clear project documentation distinguishing upstream functionality from hackathon work.
- Define the project as a new provenance-aware scientific writing product rather than a generic MyST Editor fork.
- Ensure the repository has an appropriate open-source license visible for hackathon submission.
- Establish a polished default manuscript that can be used throughout development and the final demo.

### Exit State

A working scientific editor foundation is running with clear attribution and a clean place for the new product experience.

---

# Phase 1 — Build the Core Manuscript Experience

- Establish the primary scientific writing workspace.
- Support normal manuscript editing.
- Support scientific document structure.
- Preserve equations, citations, figures, tables, comments, and other useful capabilities inherited from the editor foundation.
- Create a clear manuscript-focused layout suitable for sustained writing.
- Add a research-integrity side panel.
- Add manuscript status indicators without making the editor visually noisy.
- Establish selection states for text, claims, figures, tables, and sections.

### Exit State

The product is already usable as a scientific editor without any AI or WebMCP interaction.

---

# Phase 2 — Add Provenance-Native Manuscript Objects

- Introduce a first-class claim concept.
- Allow researchers to mark or create claims manually.
- Allow claims to be linked to supporting research evidence.
- Support provenance links for quantitative results.
- Support provenance links for methodological statements.
- Support provenance links for figures.
- Support provenance links for tables.
- Represent useful provenance metadata such as artifact identity, experiment identity, commit, metric, source, and verification state.
- Allow provenance relationships to be inspected from the manuscript.
- Allow researchers to create, change, remove, and review provenance links manually.

### Exit State

Important parts of the manuscript can be explicitly connected to the research artifacts that support or produced them.

---

# Phase 3 — Build Research X-Ray

- Add a global X-Ray mode.
- Visually distinguish verified manuscript elements.
- Visually distinguish stale manuscript elements.
- Visually distinguish contradicted manuscript elements.
- Visually distinguish unlinked manuscript elements.
- Visually distinguish elements requiring review.
- Allow a researcher to select an X-Ray item and inspect its provenance.
- Provide a manuscript-level integrity summary.
- Provide counts of verified, stale, contradicted, unlinked, and review-required items.
- Ensure X-Ray works across claims, quantitative results, figures, tables, and methods.

### Exit State

A normal-looking manuscript can transform into a visible research-integrity map in one interaction.

---

# Phase 4 — Define the WebMCP Surface

- Expose meaningful manuscript actions through WebMCP.
- Support retrieving the current manuscript context.
- Support retrieving the current selection.
- Support retrieving the currently selected claim.
- Support retrieving the currently selected figure.
- Support retrieving the currently selected table.
- Support retrieving the current section.
- Support creating and updating claims.
- Support attaching and updating evidence.
- Support setting verification states.
- Support proposing claim changes.
- Support inserting comments.
- Support replacing selected manuscript content.
- Support navigating to claims or affected manuscript elements.
- Support retrieving integrity status.
- Support retrieving and reviewing research diffs.
- Ensure WebMCP actions visibly affect the same state the human is viewing.
- Keep consequential manuscript updates reviewable by the human.

### Exit State

An external WebMCP-compatible agent can operate the core provenance and manuscript workflows that a human can perform manually.

---

# Phase 5 — Build “Verify This”

- Add a clear human workflow for selecting a claim and requesting verification from an external agent.
- Make the selected claim and its current manuscript context accessible through WebMCP.
- Allow an agent to attach supporting research evidence to the selected claim.
- Allow an agent to mark the claim as verified.
- Allow an agent to mark the claim as contradicted.
- Allow an agent to mark the claim as stale.
- Allow an agent to mark the claim as partially supported or requiring review.
- Allow an agent to propose corrected manuscript text.
- Present the agent's verification result directly in the editor.
- Show the evidence supporting the result.
- Require the researcher to accept or reject proposed manuscript changes.
- Preserve a clear record of the verification outcome.

### Exit State

A researcher can highlight a manuscript claim, ask their existing research agent to verify it, and receive a structured, evidence-backed result inside the document.

---

# Phase 6 — Build Research Diff

- Represent the relationship between current research evidence and current manuscript content.
- Detect when previously linked research evidence has changed.
- Mark affected manuscript elements as stale or contradicted.
- Create a manuscript-level Research Diff view.
- Show old manuscript values alongside current research values.
- Support changes to numerical results.
- Support changes to methodology/configuration.
- Support changes to figures and figure inputs.
- Support changes to tables and table inputs.
- Support changes to research artifacts linked to claims.
- Group related changes into a reviewable set.
- Allow the researcher to review changes individually.
- Allow the researcher to accept, reject, or defer each proposed update.
- Return affected manuscript elements to a verified state once reconciled.

### Exit State

Changes in the research can produce a Git-like review experience showing exactly what parts of the manuscript are no longer synchronized.

---

# Phase 7 — Strengthen Figures, Tables, and Methods

- Give figures first-class provenance.
- Show which research artifact generated each figure.
- Mark figures stale when their linked inputs or generating artifacts change.
- Give tables first-class provenance.
- Mark table values stale when their linked results change.
- Give methodological statements first-class provenance.
- Support comparing described methods against linked implementation/configuration evidence.
- Provide consistent review states across claims, figures, tables, and methods.

### Exit State

The product demonstrates that provenance is not limited to text claims; the entire scientific manuscript can participate in research integrity.

---

# Phase 8 — Build the Demonstration Research Project

- Create a realistic example research repository/context for the demo.
- Include experiment outputs with multiple versions.
- Include at least one intentionally incorrect manuscript claim.
- Include at least one stale quantitative result.
- Include at least one changed methodology/configuration value.
- Include at least one stale figure.
- Include at least one table linked to experiment results.
- Include enough research context for an external agent to demonstrate meaningful verification.
- Prepare a manuscript containing both correct and incorrect/stale content.
- Ensure the demo can reliably reproduce all three killer experiences.

### Exit State

The product has a deterministic, judge-friendly research scenario that makes every core capability immediately understandable.

---

# Phase 9 — Product Polish

- Make the editor feel like a coherent research product rather than a developer demo.
- Make X-Ray visually distinctive and immediately understandable.
- Make verification states visually clear without overwhelming the manuscript.
- Make provenance inspection fast.
- Make Research Diff feel familiar to developers and researchers.
- Make review/accept/reject interactions obvious.
- Add useful empty, loading, success, warning, and error states.
- Ensure the product works cleanly at common laptop screen sizes.
- Add a concise onboarding explanation for judges.
- Provide a ready-to-use demo manuscript on first launch or through a clear demo entry point.

### Exit State

A judge can understand and use the product with minimal instruction.

---

# Phase 10 — WebMCP Depth and Reliability

- Verify that the WebMCP implementation is non-trivial and central to the product.
- Ensure tools reflect real application state.
- Ensure selection-aware tools behave correctly.
- Ensure claim-aware tools behave correctly.
- Ensure figure-aware tools behave correctly.
- Ensure table-aware tools behave correctly.
- Ensure manuscript updates are visible and synchronized.
- Ensure agent actions do not silently overwrite researcher decisions.
- Add meaningful WebMCP evaluation cases.
- Cover successful tool use.
- Cover inappropriate tool selection.
- Cover missing-selection states.
- Cover stale manuscript states.
- Cover conflicting evidence states.
- Cover review-required actions.
- Test the deployed product in ChatGPT's in-app browser.
- Test the deployed product in supported Chrome WebMCP mode.

### Exit State

The WebMCP layer is reliable enough that judges can interact with the live product without special handling.

---

# Phase 11 — Hackathon Story and Submission Readiness

- Make the one-line product promise prominent:

  **Every claim in your paper stays connected to the research that produced it.**

- Make the three killer experiences prominent:
  - Research X-Ray
  - Verify This
  - Research Diff
- Clearly explain which functionality comes from the MyST Editor foundation.
- Clearly explain which functionality was built for the WebMCP Challenge.
- Document why this use case is a strong fit for WebMCP.
- Document what the human can do without an agent.
- Document what an external agent can do through WebMCP.
- Document what becomes meaningfully better when they work together.
- Document the available WebMCP tools.
- Provide clear judge testing instructions.
- Ensure the public repository contains all required source, attribution, license, and setup information.
- Ensure the live deployment is stable and publicly testable.
- Prepare a short demo centered on the live product rather than architecture slides.
- Show the working product within the opening seconds of the demo.
- Demonstrate all three killer experiences within the final video.
- Ensure the final submission accurately reflects only features that are genuinely working.

### Exit State

The product, repository, live site, and demo are ready for judging.

---

# Scope Guardrails

The following are explicitly outside the hackathon implementation unless they become necessary for one of the three core experiences:

- generic AI writing assistance
- generic autocomplete
- literature discovery
- systematic review
- citation recommendation
- autonomous paper generation
- full research project management
- experiment orchestration
- dataset hosting
- general-purpose code review
- interactive published-paper reader
- social/community features
- broad laboratory management
- custom built-in general-purpose AI assistant

If a feature does not strengthen **Research X-Ray**, **Verify This**, **Research Diff**, or the **WebMCP human-agent collaboration model**, it should be deprioritized.
