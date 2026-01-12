import React, { useState } from "react";
import CollabMarkdownEditor from "./CollabMarkdownEditor.jsx";

export default function App() {
  const [docPath, setDocPath] = useState("intro.md"); // backend file path
  const [userName, setUserName] = useState("Vikil");
  const iframeRef = React.useRef(null);

  // Room name must be stable + safe
  const roomName = docPath.replaceAll("/", "__").replaceAll(".", "_");

  const handlePreviewUpdate = (content) => {
    if (iframeRef.current) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "DOC_PREVIEW", payload: content },
        "*"
      );

    }
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, Arial", width: "100%", boxSizing: "border-box" }}>
      <h2>Docs Editor (Pull from Backend + Collaborate)</h2>

      <div style={{ display: "flex", gap: 50, alignItems: "flex-start", width: "100%" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: "grid", gap: 10, maxWidth: 720, marginBottom: 12 }}>
            <label>
              Doc path (stored in docs-backend):
              <input
                style={{ width: "100%", padding: 8, marginTop: 4 }}
                value={docPath}
                onChange={(e) => setDocPath(e.target.value)}
                placeholder="intro.md OR getting-started/intro.md"
              />
            </label>

            <label>
              Your name:
              <input
                style={{ width: "100%", padding: 8, marginTop: 4 }}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </label>

            <div style={{ opacity: 0.75 }}>
              Room: <b>{roomName}</b> (derived from doc path)
            </div>
          </div>

          <CollabMarkdownEditor docPath={docPath} roomName={roomName} userName={userName} handlePreviewUpdate={handlePreviewUpdate} />
        </div>

        <aside
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: 12,
            background: "#fafafa",
            flex: 1,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Right Panel</div>
          <iframe
            ref={iframeRef}
            src="http://localhost:3000/live-preview"
            style={{ width: "100%", border: "1px solid #eee", borderRadius: 6,
            height: "80vh",  }}
          />

        </aside>
      </div>
    </div>
  );
}
