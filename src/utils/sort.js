export function parseSort(sortRaw, fieldMap, defaultSort) {
  // defaultSort: "created_at,DESC"
  let [df, dd] = String(defaultSort).split(",");
  df = (df || "").trim();
  dd = (dd || "").trim().toUpperCase();

  const defaultDir = dd === "ASC" ? "ASC" : "DESC";

  const fallback = {
    order: [
      [fieldMap[df], defaultDir],
      ["id", "DESC"],
    ],
    sort: `${df},${defaultDir}`,
  };

  if (!sortRaw) return fallback;

  const text = String(sortRaw).trim();
  if (!text) return fallback;

  let [fieldRaw, dirRaw] = text.split(",");
  const field = (fieldRaw || "").trim();
  const dir = (dirRaw || "").trim().toUpperCase();

  // 허용 필드만
  const col = fieldMap[field];
  if (!col) return fallback;

  const dirSafe = dir === "ASC" ? "ASC" : "DESC";

  return {
    order: [
      [col, dirSafe],
      ["id", "DESC"], // 항상 고정
    ],
    sort: `${field},${dirSafe}`,
  };
}
