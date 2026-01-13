import React, { useMemo, useRef, useState } from "react";
import "./App.css";
import CollabMarkdownEditor from "./CollabMarkdownEditor.jsx";
import ProjectPanel from "./components/ProjectPanel.jsx";
import { useDocManager } from "./hooks/useDocManager.js";
import { INTRO_DOC_PATH } from "./constants.js";

export default function App() {
  const iframeRef = useRef(null);
  const [userName, setUserName] = useState("Vikil");
  const {
    docPath,
    projectName,
    fileName,
    status,
    setProjectName,
    setFileName,
    createProject,
    createFile,
    deleteFile,
    setStatus,
  } = useDocManager(INTRO_DOC_PATH);

  const roomName = useMemo(() => docPath.replaceAll("/", "__").replaceAll(".", "_"), [docPath]);

  const handlePreviewUpdate = (content) => {
    if (iframeRef.current) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "DOC_PREVIEW", payload: content },
        "*"
      );
    }
  };

  const handleDelete = async () => {
    if (!docPath) return;
    const confirmed = window.confirm(`Delete ${docPath}? This cannot be undone.`);
    if (!confirmed) return;
    await deleteFile();
  };

  const handleCreateProject = () => {
    const ok = createProject();
    if (!ok) return;
    setStatus("Project created. Now add a markdown file.");
  };

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">Docs Editor</p>
          <h1>Project-based Markdown Workspace</h1>
          <p className="app__subtitle">Create, update, and delete markdown files with collaboration built in.</p>
        </div>

        <label className="app__user">
          <span>Your name</span>
          <input
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            placeholder="Your name"
          />
        </label>
      </header>

      <div className="app__content">
        <aside className="app__sidebar">
          <ProjectPanel
            projectName={projectName}
            fileName={fileName}
            docPath={docPath}
            status={status}
            onProjectChange={setProjectName}
            onFileChange={setFileName}
            onCreateProject={handleCreateProject}
            onCreateFile={createFile}
            onDeleteFile={handleDelete}
          />
        </aside>

        <main className="app__editor">
          <CollabMarkdownEditor
            docPath={docPath}
            roomName={roomName}
            userName={userName}
            handlePreviewUpdate={handlePreviewUpdate}
          />
        </main>

        <aside className="app__preview">
          <div className="preview">
            <div className="preview__header">Live Preview</div>
            <iframe
              ref={iframeRef}
              title="Live Markdown Preview"
              src="http://localhost:3000/live-preview"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
