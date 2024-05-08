type ExtractGenerator = (jsonColumnName: string, columnName: string) => string;

export enum ExtractType {
  columnOnly,
  columnInOperation
}

type ExtractGeneratorMap = Map<ExtractType, ExtractGenerator>;

function _createExtract(jsonColumnName: string, columnName: string): string {
  return `json_extract(${jsonColumnName}, '$.${columnName}')`;
}

const extractGeneratorsMap: ExtractGeneratorMap = new Map<ExtractType, ExtractGenerator>([
  [ExtractType.columnOnly, (jsonColumnName: string, columnName: string) => _createExtract(jsonColumnName, columnName)],
  [
    ExtractType.columnInOperation,
    (jsonColumnName: string, columnName: string) => {
      const extract = _createExtract(jsonColumnName, columnName);
      return `${columnName} = ${extract}`;
    }
  ]
]);

export const generateJsonExtracts = (type: ExtractType, jsonColumnName: string, columns: string[]): string => {
  const generator = extractGeneratorsMap.get(type);
  if (generator == null) {
    throw new Error('Unexpected null generator for key: $type');
  }

  if (columns.length == 1) {
    return generator(jsonColumnName, columns[0]);
  }

  return columns.map((column) => generator(jsonColumnName, column)).join(', ');
};
