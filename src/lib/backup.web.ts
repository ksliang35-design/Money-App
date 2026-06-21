export async function exportJSON(json: string, filename: string): Promise<void> {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pickJSONFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;
    const finish = (val: string | null) => {
      if (settled) return;
      settled = true;
      if (document.body.contains(input)) document.body.removeChild(input);
      resolve(val);
    };

    const onWindowFocus = () => setTimeout(() => finish(null), 400);
    window.addEventListener('focus', onWindowFocus, { once: true });

    input.onchange = () => {
      window.removeEventListener('focus', onWindowFocus);
      const file = input.files?.[0];
      if (!file) { finish(null); return; }
      const reader = new FileReader();
      reader.onload = () => finish(reader.result as string);
      reader.onerror = () => finish(null);
      reader.readAsText(file, 'utf-8');
    };

    input.click();
  });
}
