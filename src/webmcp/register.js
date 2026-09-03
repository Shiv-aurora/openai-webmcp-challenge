import { buildResearchWebMCPTools, READ_ONLY_WEBMCP_TOOL_NAMES } from "./researchTools";
import { ACTION_WEBMCP_TOOL_NAMES, buildResearchWebMCPActionTools } from "./actionTools";
import { EXPERIMENT_WEBMCP_TOOL_NAMES, buildExperimentWebMCPTools } from "./experimentTools";

export function registerResearchWebMCPTools(editorState, ownerDocument = document) {
  const modelContext = ownerDocument?.modelContext;
  const controller = new AbortController();
  const registrationState = {
    supported: Boolean(modelContext?.registerTool),
    toolNames: [...READ_ONLY_WEBMCP_TOOL_NAMES, ...ACTION_WEBMCP_TOOL_NAMES, ...EXPERIMENT_WEBMCP_TOOL_NAMES],
    registration: null,
  };
  editorState.webmcp = registrationState;

  if (!registrationState.supported) return () => controller.abort();

  const tools = [
    ...buildResearchWebMCPTools(editorState),
    ...buildResearchWebMCPActionTools(editorState),
    ...buildExperimentWebMCPTools(editorState),
  ];
  registrationState.registration = Promise.allSettled(tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal }))).then(
    (results) => {
      registrationState.results = results;
      return results;
    },
  );

  return () => controller.abort();
}
