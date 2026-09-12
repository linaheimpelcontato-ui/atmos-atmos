/** A finite, deduplicated sequence: each URL is attempted at most once. */
export function imageSources(src: string, fallbacks: string[] = [], placeholder?: string): string[] {
  const result = new Set<string>();
  for (const candidate of [src, ...fallbacks, placeholder]) {
    if (!candidate) continue;
    result.add(candidate);
    try {
      const url = new URL(candidate);
      if (url.hostname === "wsrv.nl" || url.hostname === "www.wsrv.nl") {
        // URLSearchParams already decodes one level. Decoding twice corrupts object keys.
        const original = url.searchParams.get("url");
        if (original && /^https?:\/\//i.test(original)) result.add(original);
      }
      if (url.pathname.includes("/storage/v1/render/image/public/")) {
        url.pathname = url.pathname.replace("/render/image/", "/object/");
        url.search = "";
        result.add(url.href);
      }
    } catch {
      // Relative/bundled sources are valid image candidates too.
    }
  }
  return [...result];
}
