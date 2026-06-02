type JSONValue = string | number | boolean | null | undefined | JSONObject | JSONArray;

interface JSONObject {
  [key: string]: JSONValue;
}
type JSONArray = JSONValue[];

/**
 * @public
 */
export type StreamingSyncRequestParameterType = JSONValue;
