export function parsePagination(query, {
  defaultPage = 1,
  defaultSize = 20,
  maxSize = 100,
} = {}) {
  const page = Math.max(1, parseInt(query.page ?? String(defaultPage), 10) || defaultPage);
  const sizeRaw = parseInt(query.size ?? String(defaultSize), 10) || defaultSize;
  const size = Math.min(maxSize, Math.max(1, sizeRaw));
  const offset = (page - 1) * size;
  return { page, size, offset };
}