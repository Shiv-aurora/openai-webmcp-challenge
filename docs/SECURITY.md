# Security and trust boundaries

- Manuscript and evidence strings are untrusted. Rendered Markdown is sanitized with DOMPurify.
- WebMCP marks user-authored content with `untrustedContentHint` and distinguishes read-only tools.
- Exact-text preconditions prevent an agent from applying a proposal to a selection that changed after it was read.
- Verification requires linked evidence and refuses ambiguous, conflicting, or unit-incompatible numeric comparisons.
- Agent-authored replacements remain CriticMarkup proposals until the researcher accepts them visibly.
- The public deployment is static. The Vite development server and inherited collaboration server are not public production services.

The release upgraded DOMPurify and applied all non-breaking npm production fixes. `npm audit --omit=dev` still reports advisories in inherited Markdown/linkification, YAML-language-server, and Node-polyfill/development-server dependency paths. The two prior critical transitive crypto findings are patched. Remaining findings are documented rather than hidden; avoid processing adversarially large Markdown/YAML inputs and do not expose development servers to untrusted networks.

Provenance and verification state are stored in browser local storage. They are not authenticated, encrypted, or synchronized between collaborators in this hackathon release and must not be treated as a tamper-proof scientific audit log.
