import { useCallback, useMemo, useState } from "react";
import { INTRO_DOC_PATH } from "../constants";
import { buildDocPath, defaultTemplateForPath, splitDocPath } from "../domain/documents";
import { deleteDoc, saveDoc } from "../services/docsApi";

export function useDocManager(initialDocPath = INTRO_DOC_PATH) {
  const initialParts = useMemo(() => splitDocPath(initialDocPath), [initialDocPath]);
  const [docPath, setDocPath] = useState(initialDocPath);
  const [projectName, setProjectName] = useState(initialParts.projectName);
  const [fileName, setFileName] = useState(initialParts.fileName || initialDocPath);
  const [status, setStatus] = useState("");

  const syncFromPath = useCallback((nextPath) => {
    const { projectName: nextProject, fileName: nextFile } = splitDocPath(nextPath);
    setProjectName(nextProject);
    setFileName(nextFile);
  }, []);

  const createProject = useCallback(() => {
    if (!projectName.trim()) {
      setStatus("Project name is required.");
      return false;
    }
    setStatus(`Project ready: ${projectName}`);
    return true;
  }, [projectName]);

  const createFile = useCallback(async () => {
    try {
      setStatus("Creating markdown file...");
      const nextPath = buildDocPath(projectName, fileName);
      const content = defaultTemplateForPath(nextPath);
      await saveDoc(nextPath, content);
      setDocPath(nextPath);
      syncFromPath(nextPath);
      setStatus(`✅ Created ${nextPath}`);
      return true;
    } catch (error) {
      setStatus(`❌ ${error.message}`);
      return false;
    }
  }, [fileName, projectName, syncFromPath]);

  const deleteFile = useCallback(async () => {
    try {
      setStatus("Deleting file...");
      await deleteDoc(docPath);
      setDocPath(INTRO_DOC_PATH);
      syncFromPath(INTRO_DOC_PATH);
      setStatus(`🗑️ Deleted ${docPath}`);
      return true;
    } catch (error) {
      setStatus(`❌ ${error.message}`);
      return false;
    }
  }, [docPath, syncFromPath]);

  const updateDocPath = useCallback(
    (nextPath) => {
      setDocPath(nextPath);
      syncFromPath(nextPath);
    },
    [syncFromPath]
  );

  return {
    docPath,
    projectName,
    fileName,
    status,
    setProjectName,
    setFileName,
    createProject,
    createFile,
    deleteFile,
    updateDocPath,
    setStatus,
  };
}
