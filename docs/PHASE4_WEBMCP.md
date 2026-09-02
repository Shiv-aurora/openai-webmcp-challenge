# Phase 4 WebMCP Surface

This phase starts with a read-only WebMCP surface over the live editor state.

Registered tools:

- `get_current_selection` — returns the researcher's current manuscript selection, section, object kind, and verification state.
- `get_manuscript_context` — returns live selection, section, or manuscript context together with document and integrity metadata.
- `get_claim` — returns the currently selected claim, or a tracked claim by id, including verification state and linked evidence.
- `get_provenance` — returns provenance and linked evidence for the selected tracked manuscript object, or an explicit object id.

All four tools declare the WebMCP `readOnlyHint`. They read editor and provenance state at invocation time and do not mutate manuscript or provenance data.

The integration uses the current WebMCP imperative surface at `document.modelContext.registerTool()`. Browsers without WebMCP support continue to run the editor normally; tool registration becomes a no-op.
