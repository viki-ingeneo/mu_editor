import React from "react";

export default function ProjectPanel({
  projectName,
  fileName,
  docPath,
  status,
  onProjectChange,
  onFileChange,
  onCreateProject,
  onCreateFile,
  onDeleteFile,
}) {
  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Project &amp; Files</h2>
        <p className="panel__subtitle">Create projects and manage markdown-only files.</p>
      </div>

      <div className="panel__group">
        <label className="panel__label" htmlFor="projectName">
          Project name
        </label>
        <input
          id="projectName"
          className="panel__input"
          value={projectName}
          onChange={(event) => onProjectChange(event.target.value)}
          placeholder="docs-site"
        />
        <button className="button button--ghost" type="button" onClick={onCreateProject}>
          Create project
        </button>
      </div>

      <div className="panel__group">
        <label className="panel__label" htmlFor="fileName">
          File name (.md only)
        </label>
        <input
          id="fileName"
          className="panel__input"
          value={fileName}
          onChange={(event) => onFileChange(event.target.value)}
          placeholder="intro.md"
        />
        <div className="panel__row">
          <button className="button" type="button" onClick={onCreateFile}>
            Create file
          </button>
          <button className="button button--danger" type="button" onClick={onDeleteFile}>
            Delete file
          </button>
        </div>
      </div>

      <div className="panel__meta">
        <span>Active path</span>
        <code>{docPath}</code>
      </div>

      {status ? <div className="panel__status">{status}</div> : null}
    </section>
  );
}
