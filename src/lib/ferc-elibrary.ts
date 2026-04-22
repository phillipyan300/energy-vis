/**
 * FERC eLibrary is a web app ({@link https://elibrary.ferc.gov/eLibrary/search}).
 * It does not support stable public deep links with pre-filled keywords; the SPA
 * ignores most query strings. For one-click discovery from the map we use a
 * Google `site:` search, which reliably surfaces eLibrary PDFs and filings.
 */

export const FERC_ELIBRARY_SEARCH_URL = "https://elibrary.ferc.gov/eLibrary/search";

/** Google search restricted to elibrary.ferc.gov — works when direct URL params do not. */
export function fercElibraryGoogleSearchUrl(query: string): string {
  const q = `site:elibrary.ferc.gov ${query.trim()}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/** Default text search for a plant: name + operator (EIA 860 fields). */
export function fercPlantSearchQuery(plant: {
  name: string;
  operator: string;
}): string {
  return [plant.name, plant.operator].filter(Boolean).join(" ");
}
