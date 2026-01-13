import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { yCollab } from "y-codemirror.next";
import { WS_URL } from "./config/docsConfig.js";
import { defaultTemplateForPath } from "./domain/documents.js";
import { loadDoc, saveDoc } from "./services/docsApi.js";

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
      const provider = new WebsocketProvider(`${WS_URL}/${roomName}`, roomName, ydoc);

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
          const content = existing?.content ?? defaultTemplateForPath(docPath);

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
      const content = existing?.content ?? defaultTemplateForPath(docPath);

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
    const content = ytextRef.current ? ytextRef.current.toString() : "";
    handlePreviewUpdate(content);
  };

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
