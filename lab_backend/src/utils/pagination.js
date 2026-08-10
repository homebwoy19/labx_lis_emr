/**
 * Parses standard list query params into a normalized shape used by
 * repositories: { page, limit, skip, take, sortBy, sortOrder, search }.
 */
export function parseListQuery(query = {}, { defaultSort = "createdAt", maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  const sortBy = query.sortBy || defaultSort;
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  const search = (query.search || "").trim();

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    sortBy,
    sortOrder,
    search,
  };
}

export default parseListQuery;
