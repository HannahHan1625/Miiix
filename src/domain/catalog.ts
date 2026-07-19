/**
 * Resolves the governed `miiix-placeholder://` asset policy into a safe local
 * SVG. It uses only the stable ingredient identity and canonical label; no
 * remote asset, script, model, or runtime data source is involved.
 */
export function catalogPlaceholderImage(ingredientId: string, canonicalNameZh: string) {
  const palette = [
    ["#fff5d7", "#f0bd63", "#704d22"],
    ["#edf6e8", "#9bc78e", "#315b39"],
    ["#edf5fb", "#9fc5df", "#31576c"],
    ["#fff0ef", "#e6aaa5", "#6e3535"],
  ];
  const numericTail = Number(ingredientId.slice(-2));
  const [background, accent, ink] = palette[Number.isFinite(numericTail) ? numericTail % palette.length : 0];
  const label = canonicalNameZh.replace(/（.*?）/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" role="img" aria-label="${label} 原型占位图"><rect width="240" height="180" rx="24" fill="${background}"/><circle cx="120" cy="77" r="48" fill="${accent}" opacity=".82"/><path d="M83 89c14-25 60-34 76-1" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round" opacity=".42"/><text x="120" y="145" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="${ink}">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
