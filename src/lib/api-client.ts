const configuredBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_ADMIN_API_URL || "";

export const publicApiBase = configuredBase.replace(/\/$/, "");

export async function apiRequest<T>(path: string, token = "", options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${publicApiBase}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return body as T;
}
