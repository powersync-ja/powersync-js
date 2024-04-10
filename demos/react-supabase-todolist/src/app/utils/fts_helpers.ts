import { db } from '@/components/providers/SystemProvider';

function createSearchTermWithOptions(searchTerm: string): string {
  // adding * to the end of the search term will match any word that starts with the search term
  // e.g. searching bl will match blue, black, etc.
  // consult FTS5 Full-text Query Syntax documentation for more options
  const searchTermWithOptions: string = '$searchTerm*';
  return searchTermWithOptions;
}

/// Search the FTS table for the given searchTerm
async function search(searchTerm: string, tableName: string): Promise<any[]> {
  const searchTermWithOptions = createSearchTermWithOptions(searchTerm);
  return await db.getAll(`SELECT * FROM fts_${tableName} WHERE fts_${tableName} MATCH ? ORDER BY rank`, [
    searchTermWithOptions
  ]);
}
