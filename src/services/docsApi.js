import { API_BASE, TOKEN } from "../config/docsConfig";

function buildAuthHeaders() {
  return TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
}

async function handleResponse(response, errorPrefix) {
  if (response.ok) {
    return response.json().catch(() => ({ ok: true }));
  }
  const text = await response.text().catch(() => "");
  throw new Error(`${errorPrefix}: ${response.status} ${response.statusText} ${text}`.trim());
}

export async function loadDoc(docPath) {
  const url = new URL(`${API_BASE}/api/doc`);
  url.searchParams.set("path", docPath);

  const response = await fetch(url.toString(), {
    headers: buildAuthHeaders(),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Load failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function saveDoc(docPath, content) {
  const response = await fetch(`${API_BASE}/api/doc`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    body: JSON.stringify({ path: docPath, content }),
  });

  return handleResponse(response, "Publish failed");
}

export async function deleteDoc(docPath) {
  const url = new URL(`${API_BASE}/api/doc`);
  url.searchParams.set("path", docPath);

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: buildAuthHeaders(),
  });

  return handleResponse(response, "Delete failed");
}
