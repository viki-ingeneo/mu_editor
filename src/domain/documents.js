import { INTRO_DOC_PATH, INTRO_TEMPLATE } from "../constants";

const INVALID_PROJECT_SEGMENTS = ["..", "."];

export function ensureMarkdownExtension(fileName) {
  const trimmed = fileName.trim();
  if (!trimmed) {
    throw new Error("File name is required.");
  }
  if (!trimmed.toLowerCase().endsWith(".md")) {
    throw new Error("Only .md files are allowed.");
  }
  return trimmed;
}

function sanitizeProjectName(projectName) {
  const cleaned = projectName.trim().replaceAll("\\", "/");
  const normalized = cleaned.replace(/^\/+|\/+$/g, "");
  if (!normalized) return "";
  const segments = normalized.split("/");
  const invalid = segments.find((segment) => INVALID_PROJECT_SEGMENTS.includes(segment));
  if (invalid) {
    throw new Error("Project name cannot include relative path segments.");
  }
  return segments.join("/");
}

export function buildDocPath(projectName, fileName) {
  const safeFile = ensureMarkdownExtension(fileName);
  const safeProject = sanitizeProjectName(projectName);
  if (!safeProject) return safeFile;
  return `${safeProject}/${safeFile}`;
}

export function defaultTemplateForPath(docPath) {
  if (docPath === INTRO_DOC_PATH) {
    return INTRO_TEMPLATE;
  }
  return `# ${docPath}\n`;
}

export function splitDocPath(docPath) {
  const sanitized = docPath.trim().replaceAll("\\", "/");
  const parts = sanitized.split("/").filter(Boolean);
  if (parts.length === 0) {
    return { projectName: "", fileName: "" };
  }
  const fileName = parts.pop();
  return { projectName: parts.join("/"), fileName };
}
