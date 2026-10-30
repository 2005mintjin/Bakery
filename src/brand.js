export const siteSlug = "fencer-bakery";
export const siteUrl = "https://2005mintjin.github.io/Bakery/fencer-bakery/";
// The branded entry lives beside existing assets; keep the old save namespace.
export function savePath(pathname) {
  const suffix = siteSlug + "/";
  return pathname.endsWith("/" + suffix)
    ? pathname.slice(0, -suffix.length)
    : pathname;
}
