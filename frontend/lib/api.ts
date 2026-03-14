/**
 * FastAPI backend communication client.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API 요청 실패: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),

  /** SSE streaming — reads ReadableStream and calls onChunk per text fragment. */
  stream: async (
    path: string,
    body: unknown,
    onChunk: (text: string) => void,
    onDone?: () => void
  ): Promise<void> => {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `스트리밍 요청 실패: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("ReadableStream을 사용할 수 없습니다.");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      // Parse Vercel AI SDK data stream format: "0:\"text\"\n"
      for (const line of text.split("\n")) {
        if (line.startsWith("0:")) {
          try {
            const content = JSON.parse(line.slice(2));
            onChunk(content);
          } catch {
            // skip malformed lines
          }
        }
      }
    }
    onDone?.();
  },

  /** Upload a file via multipart/form-data. */
  upload: async <T>(path: string, file: File, fieldName = "file"): Promise<T> => {
    const formData = new FormData();
    formData.append(fieldName, file);
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `업로드 실패: ${response.status}`);
    }
    return response.json();
  },
};
