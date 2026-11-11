/** Browser stub for `node:url` (e.g. unifont). */
export function fileURLToPath(url: string | URL): string {
  const href = typeof url === "string" ? url : url.href;
  if (href.startsWith("file:")) {
    try {
      return decodeURIComponent(
        href.replace(/^file:\/\//, "").replace(/^\/([A-Za-z]:)/, "$1")
      );
    } catch {
      return href;
    }
  }
  return href;
}
export function pathToFileURL(path: string): URL {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new globalThis.URL(`file://${normalized}`);
}
export const URL = globalThis.URL;
export default { fileURLToPath, pathToFileURL, URL };
