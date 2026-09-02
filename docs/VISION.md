# VISION.md

# Project Vision

## Context

This project is being built for the **OpenAI WebMCP Challenge**.

The challenge asks for web applications that become meaningfully better when humans and their agents can use them together. WebMCP should be a foundation layer of the product: the application must remain useful and complete for a human without an agent, while exposing the same meaningful application capabilities to an external agent.

We will build on top of the open-source **Antmicro MyST Editor** rather than recreate a scientific editor from scratch. The editor foundation is not the innovation. The innovation is the research-integrity layer, provenance model, live manuscript state, and WebMCP experience added on top.

---

## Product Vision

Research papers drift away from the research that produced them.

Numbers are copied from experiment outputs. Figures are exported from scripts. Method descriptions are written from memory. Configurations change. Final experiments replace earlier runs. The manuscript often becomes a manually maintained snapshot of a moving research project.

The product should make the manuscript a **live, provenance-aware representation of the research**.

Every important claim, number, figure, table, and methodological statement should be able to remain connected to the research artifact that supports or produced it.

The paper should not merely contain citations to external literature. It should also understand its relationship to the author's own:

- code
- experiment outputs
- configurations
- figures
- tables
- datasets
- commits
- analysis artifacts
- research decisions

The core promise is:

> **Every claim in your paper stays connected to the research that produced it.**

---

## The Human Experience

The application must be a strong scientific writing environment even when no agent is connected.

A researcher should be able to:

- write and edit a manuscript normally
- structure sections
- work with citations
- add equations
- add figures and tables
- comment and review
- use scientific templates
- inspect provenance
- manually link manuscript content to supporting research artifacts
- review stale or conflicting research relationships
- accept or reject manuscript updates

The human remains the author.

The product should improve trust and control rather than turn writing into an autonomous generation workflow.

---

## The Agent Experience

An external agent such as ChatGPT or Codex should be able to enter the same live manuscript through WebMCP.

The agent may already know the research project because it helped:

- write the code
- run experiments
- analyze outputs
- inspect the repository
- discuss the research
- prepare figures
- debug the implementation

The editor should not attempt to recreate all of that context.

Instead, it gives the agent a structured way to understand and manipulate the manuscript currently open in the browser.

The agent should be able to work with:

- the current selection
- the current claim
- the current section
- the selected figure or table
- provenance relationships
- verification state
- manuscript diffs
- comments and review state

The application supplies **manuscript context and controls**.

The user's agent supplies **research context and reasoning**.

---

## Core Product Model

The manuscript is not just text.

Important manuscript elements can have provenance relationships.

Examples:

### Claim

> Our method improves stress-regime accuracy by 16.8%.

Can be linked to:

- experiment result
- result file
- evaluation script
- commit
- metric name

### Method Statement

> We optimize using AdamW with a learning rate of 2e-4.

Can be linked to:

- training configuration
- implementation
- experiment run

### Figure

Can be linked to:

- figure-generation script
- source data
- experiment
- commit

### Table

Can be linked to:

- source results
- analysis output
- experiment set

These relationships should remain visible, inspectable, and reviewable.

---

# Three Killer Experiences

## 1. Research X-Ray

A researcher toggles **X-Ray** and the paper reveals its research integrity visually.

Claims, numbers, figures, tables, and methods show their current status:

- Verified
- Stale
- Contradicted
- Unlinked
- Needs review

Selecting an item reveals the supporting provenance.

The manuscript should immediately feel different from a normal document.

---

## 2. Verify This

The researcher selects a claim and asks their existing agent:

> Verify this.

The agent uses its knowledge of the research project and the live manuscript tools exposed through WebMCP.

The result should appear directly in the document as a structured verification outcome.

Possible outcomes include:

- verified
- contradicted
- partially supported
- stale
- missing evidence

The researcher can then review and accept or reject any proposed manuscript change.

---

## 3. Research Diff

When the underlying research changes, the paper should expose what is now out of sync.

Examples:

- 18.2% → 16.8%
- learning rate 3e-4 → 2e-4
- dataset size 481k → 503k
- Figure 3 is stale
- Method statement no longer matches implementation
- Ablation table has newer results

The experience should resemble a **Git diff between the research and the manuscript**.

The researcher reviews each affected item rather than blindly rewriting the paper.

---

# WebMCP Vision

WebMCP is not the AI backend.

It is the agent-facing control surface of the scientific editor.

The same meaningful actions available to the human should be exposed semantically to the agent where appropriate.

The agent should interact with the live manuscript state rather than a detached copy.

The WebMCP experience should demonstrate:

- live selection-aware actions
- section-aware actions
- figure-aware actions
- table-aware actions
- provenance-aware actions
- visible changes inside the manuscript
- human review before consequential manuscript changes
- a non-trivial set of useful scientific-writing tools

The strongest demonstration is not that an agent can type into the document.

It is that an external research agent can become a native collaborator inside a provenance-aware scientific writing environment.

---

# Product Principles

## Manuscript First

The product should feel like a serious scientific editor, not an AI chat interface.

## Provenance Over Generation

The primary value is keeping research and manuscript synchronized.

Writing assistance is secondary.

## Human Control

The researcher remains responsible for scientific claims and final manuscript changes.

## Visible Agent Actions

Agent work should appear in the same manuscript and review surfaces the human uses.

## Research Context Comes With the Agent

Do not build a giant replacement for Codex, ChatGPT, GitHub, experiment trackers, or research agents.

Let the external agent bring the context it already has.

## Simple Core Story

The project must remain explainable in one sentence:

> **Every claim in your paper stays connected to the research that produced it.**

---

# What We Are Not Building

## Not a Generic AI Writing Assistant

Do not compete with ChatGPT, Jenni, Paperpal, Grammarly, or generic academic rewriting tools.

Rewriting, tone improvement, summarization, and autocomplete are not the core product.

## Not an Autonomous Paper Generator

The goal is not:

> Give us a repository and receive a complete paper.

That weakens the human-agent collaboration story and creates trust problems.

## Not a Literature Search Product

External paper discovery, systematic review, and citation recommendation are not the wedge.

## Not a Citation Checker

Literature citation verification may eventually complement the product, but it is not the primary feature.

## Not a Post-Hoc Paper Audit Tool

The experience should not be:

> Upload finished PDF → receive inconsistency report.

Integrity should exist while the manuscript is being written.

## Not a Code Review Product

The product does not evaluate whether the research code itself is good.

It evaluates and maintains the relationship between the research and what the manuscript says about it.

## Not a Research Management Platform

Do not expand into project management, lab notebooks, task tracking, dataset hosting, experiment orchestration, or collaboration infrastructure unless required by the core experience.

## Not an Interactive Paper Reader

Do not split the hackathon product between authoring and reader-facing interactive papers.

The hackathon version focuses on the researcher writing and maintaining the manuscript.

## Not an MCP Demo

The product must remain compelling without explaining WebMCP.

WebMCP should make an already-useful product dramatically more powerful.

## Not a Reskinned MyST Editor

The final experience must clearly demonstrate substantial original functionality built for the hackathon.

---

# Success Criteria

A judge should understand the product within ten seconds.

Within the first part of the demo, they should see:

1. A normal scientific manuscript become a provenance-aware document through X-Ray.
2. A research agent verify a selected claim using WebMCP.
3. A research change generate a manuscript-level Research Diff.

The desired reaction is:

> **“Why are research papers still maintained manually if the research artifacts already exist?”**

The product should feel like a plausible new primitive for scientific writing, not merely another AI feature.
