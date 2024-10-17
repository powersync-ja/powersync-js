export const safeParse = (jsonString?: string | null) => {
  try {
    if (!jsonString) return {};
    return JSON.parse(jsonString);
  } catch (error) {
    return {};
  }
};