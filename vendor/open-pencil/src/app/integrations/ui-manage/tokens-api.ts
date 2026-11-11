import { useUiManageAuth } from "./auth";

export type ApiTokenRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type CreatedApiToken = ApiTokenRow & {
  token: string;
};

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const data = (await res.json()) as {
        message?: string;
        statusMessage?: string;
      };
      message = data.message || data.statusMessage || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function useUiManageTokens() {
  const { authHeaders } = useUiManageAuth();

  function list() {
    return fetch("/api/tokens", { headers: authHeaders() }).then((res) =>
      readJson<ApiTokenRow[]>(res)
    );
  }

  function create(name: string) {
    return fetch("/api/tokens", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((res) => readJson<CreatedApiToken>(res));
  }

  function revoke(id: string) {
    return fetch(`/api/tokens/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((res) => readJson<{ ok: boolean }>(res));
  }

  function mcpConfig(id: string) {
    const origin = encodeURIComponent(window.location.origin);
    return fetch(
      `/api/tokens/${encodeURIComponent(id)}/mcp-config?origin=${origin}`,
      {
        headers: authHeaders(),
      }
    ).then((res) => readJson<{ config: string }>(res));
  }

  return { list, create, revoke, mcpConfig };
}
