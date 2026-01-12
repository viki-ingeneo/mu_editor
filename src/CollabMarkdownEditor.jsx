import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { yCollab } from "y-codemirror.next";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:1234";
const API_BASE = import.meta.env.VITE_DOCS_API_BASE || "http://localhost:5050";
const TOKEN = import.meta.env.VITE_DOCS_TOKEN || "super-secret-token";

// ---- Backend helpers ----
async function loadDoc(docPath) {
  const url = new URL(`${API_BASE}/api/doc`);
  url.searchParams.set("path", docPath);

  const res = await fetch(url.toString(), {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  });

  console.log("loadDoc", res.status, docPath);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Load failed: ${res.status} ${res.statusText}`);
  return res.json(); // { path, content }
}

async function saveDoc(docPath, content) {
  const res = await fetch(`${API_BASE}/api/doc`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ path: docPath, content }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Publish failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json().catch(() => ({ ok: true }));
}

// Small default template if doc not found
function defaultTemplateFor(docPath) {
  if (docPath === "intro.md") {
    return `---\nid: intro\ntitle: Introduction\nsidebar_position: 1\n---\n\n# Introduction\nWelcome!\n`;
  }
  return `# ${docPath}\n`;
}

export default function CollabMarkdownEditor({ roomName, docPath, userName, handlePreviewUpdate }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const ytextRef = useRef(null);

  // Prevent multiple clients from overwriting initial content repeatedly
  const initializedRef = useRef(false);

  const [wsStatus, setWsStatus] = useState("disconnected");
  const [info, setInfo] = useState("");

  useEffect(() => {
    let destroyed = false;

    function cleanup() {
      initializedRef.current = false;

      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      ytextRef.current = null;
    }

    async function init() {
      setInfo("");
      setWsStatus("connecting");

      const ydoc = new Y.Doc();
      const provider = new WebsocketProvider(`ws://localhost:1234/${roomName}`, roomName, ydoc);

      provider.on("status", (e) => {
        if (!destroyed) setWsStatus(e.status); // connected/disconnected
      });

      // Presence
      provider.awareness.setLocalStateField("user", { name: userName || "Anonymous" });

      const ytext = ydoc.getText("md");

      // IMPORTANT:
      // Only initialize from backend if the shared doc is empty AND we haven’t initialized yet.
      // This prevents overwriting collaborative content.
      const tryInitializeFromBackend = async () => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        if (ytext.length > 0) return; // someone already has content

        try {
          const existing = await loadDoc(docPath);
          const content = existing?.content ?? defaultTemplateFor(docPath);

          ydoc.transact(() => {
            ytext.insert(0, content);
          });
        } catch (err) {
          if (!destroyed) setInfo(`Load warning: ${err.message}`);
        }
      };

      // Wait a bit for websocket sync; then init if still empty
      setTimeout(() => {
        if (!destroyed) tryInitializeFromBackend();
      }, 250);

      // Setup CodeMirror with Yjs binding
      const state = EditorState.create({
        doc: "",
        extensions: [
          basicSetup,
          markdown(),
          yCollab(ytext, provider.awareness),
          EditorView.lineWrapping,
        ],
      });

      const view = new EditorView({
        state,
        parent: hostRef.current,
      });

      ydocRef.current = ydoc;
      providerRef.current = provider;
      ytextRef.current = ytext;
      viewRef.current = view;
    }

    cleanup();
    init();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, [roomName, docPath, userName]);

  async function onPublish() {
    try {
      setInfo("Publishing...");
      const ytext = ytextRef.current;
      if (!ytext) throw new Error("Editor not ready");
      await saveDoc(docPath, ytext.toString());
      setInfo("✅ Published to docs-backend");
    } catch (e) {
      setInfo(`❌ ${e.message}`);
    }
  }

  async function onReload() {
    try {
      setInfo("Reloading from backend...");
      const ytext = ytextRef.current;
      const ydoc = ydocRef.current;
      if (!ytext || !ydoc) throw new Error("Editor not ready");

      const existing = await loadDoc(docPath);
      const content = existing?.content ?? defaultTemplateFor(docPath);

      // Replace shared content (this impacts all collaborators in room)
      ydoc.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, content);
      });

      setInfo("✅ Reloaded from backend (shared)");
    } catch (e) {
      setInfo(`❌ ${e.message}`);
    }
  }

  const onPreview = () => {
    handlePreviewUpdate(ytextRef.current.toString());
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ opacity: 0.85 }}>
          <b>WS:</b> {WS_URL} &nbsp;|&nbsp; <b>Status:</b> {wsStatus} &nbsp;|&nbsp; <b>Doc:</b>{" "}
          {docPath}
        </div>

        <button onClick={onPreview} style={{ padding: "8px 12px" }}>
            Preview
        </button>

        <button onClick={onReload} style={{ marginLeft: "auto", padding: "8px 12px" }}>
          Reload
        </button>
        <button onClick={onPublish} style={{ padding: "8px 12px" }}>
          Publish
        </button>
      </div>

      {info ? <div style={{ marginBottom: 10 }}>{info}</div> : null}

      <div
        ref={hostRef}
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          minHeight: 520,
          overflow: "hidden",
        }}
      />
    </div>
  );
}
