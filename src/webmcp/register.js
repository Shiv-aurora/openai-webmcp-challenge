import { buildResearchWebMCPTools, READ_ONLY_WEBMCP_TOOL_NAMES } from "./researchTools";

export function registerResearchWebMCPTools(editorState, ownerDocument = document) {
  const modelContext = ownerDocument?.modelContext;
  const controller = new AbortController();
  const registrationState = {
    supported: Boolean(modelContext?.registerTool),
    toolNames: [...READ_ONLY_WEBMCP_TOOL_NAMES],
    registration: null,
  };
  editorState.webmcp = registrationState;

  if (!registrationState.supported) return () => controller.abort();

  const tools = buildResearchWebMCPTools(editorState);
  registrationState.registration = Promise.allSettled(tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal }))).then(
    (results) => {
      registrationState.results = results;
      return results;
    },
  );

  return () => controller.abort();
}
