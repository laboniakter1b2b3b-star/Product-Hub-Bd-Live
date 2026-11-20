export function formatBDT(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return `৳${Math.round(num).toLocaleString('en-US')}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const normalized = iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const normalized = iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      reject(new Error('Only PNG, JPG, and WebP images are allowed.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image file must be 5MB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export function readVideoAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      reject(new Error('Only MP4, WebM, and MOV videos are allowed.'));
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      reject(new Error('Video file must be 25MB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read video file.'));
    reader.readAsDataURL(file);
  });
}
