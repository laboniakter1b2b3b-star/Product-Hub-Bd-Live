const TOKEN_KEY = 'phb_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function uploadImageFile(file: File, namePrefix = 'img'): Promise<string> {
  const { readFileAsDataUrl } = await import('./format.ts');
  const dataUrl = await readFileAsDataUrl(file);
  const res = await apiFetch<{ url: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ dataUrl, filename: namePrefix }),
  });
  return res.url;
}

export async function uploadVideoFile(file: File, namePrefix = 'video'): Promise<string> {
  const { readVideoAsDataUrl } = await import('./format.ts');
  const dataUrl = await readVideoAsDataUrl(file);
  const res = await apiFetch<{ url: string }>('/api/upload-video', {
    method: 'POST',
    body: JSON.stringify({ dataUrl, filename: namePrefix }),
  });
  return res.url;
}

export async function downloadAuthenticatedBlob(url: string, fallbackFilename: string): Promise<string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const errData = (await res.json()) as { error?: string };
      if (errData?.error) msg = errData.error;
    } catch {
      // ignore non-json error
    }
    throw new Error(msg);
  }
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackFilename;

  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objUrl), 15000);
  return filename;
}
