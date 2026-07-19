/**
 * One normalization contract for validation, seed indexes, repository queries,
 * and compatibility projections. Identity is still decided by reviewed catalog
 * records; normalization only makes equivalent input forms comparable.
 */
export function normalizeCatalogLabel(value: string, locale = "zh-CN") {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase(locale)
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}
