export function parseSort(sortRaw, fieldMap, defaultSort) {
  // defaultSort 파싱
  const [df, dd] = String(defaultSort).split(",");
  const defaultDir = dd === "ASC" ? "ASC" : "DESC";

  const fallback = {
    order: [[fieldMap[df], defaultDir]],
    sort: `${df},${defaultDir}`,
  };

  if (!sortRaw) return fallback;

  const text = String(sortRaw).trim();
  if (!text) return fallback;

  const [fieldRaw, dirRaw] = text.split(",");
  const field = (fieldRaw || "").trim();
  const dir = (dirRaw || "").trim().toUpperCase();

  // ✅ 허용된 필드만
  const col = fieldMap[field];
  if (!col) return fallback;

  const dirSafe = dir === "ASC" ? "ASC" : "DESC";

  return {
    order: [[col, dirSafe]],
    sort: `${field},${dirSafe}`,
  };
}
