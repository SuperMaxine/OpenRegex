export function encodeDict(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    const binaryString = Array.from(utf8Bytes)
      .map(byte => String.fromCharCode(byte))
      .join('');
    return btoa(binaryString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    console.error("Failed to encode state:", error);
    return "";
  }
}

export function decodeDict<T = any>(encodedData: string): T | null {
  if (!encodedData) return null;
  try {
    let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const jsonString = new TextDecoder().decode(bytes);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Failed to decode state:", error);
    return null;
  }
}

export async function decodeLegacyLink<T = any>(encodedData: string): Promise<T | null> {
  if (!encodedData) return null;
  try {
    let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const response = new Response(ds.readable);
    const jsonString = await response.text();
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Failed to decode legacy state:", error);
    return null;
  }
}

export function updateUrlState(state: { engine_id: string; regex: string; text: string; flags: string[] }): void {
  const url = new URL(window.location.href);
  if (!state.regex.trim() && !state.text.trim()) {
    url.searchParams.delete('s');
  } else {
    const encoded = encodeDict(state);
    if (encoded) {
      url.searchParams.set('s', encoded);
    }
  }
  window.history.replaceState({}, '', url.toString());
}

export function getShareUrl(state: { engine_id: string; regex: string; text: string; flags: string[] }): string {
  const url = new URL(window.location.href);
  if (!state.regex.trim() && !state.text.trim()) {
    url.searchParams.delete('s');
  } else {
    const encoded = encodeDict(state);
    if (encoded) {
      url.searchParams.set('s', encoded);
    }
  }
  return url.toString();
}

export async function getUrlState(): Promise<any> {
  const params = new URLSearchParams(window.location.search);
  const s = params.get('s');
  if (s) return decodeDict(s);
  const link = params.get('link');
  if (link) return await decodeLegacyLink(link);
  return null;
}