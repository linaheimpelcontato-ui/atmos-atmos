/** Public text supports legacy strings and explicit pt/en/es translations. */
export function publicText(value: unknown, language: string): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const translations = value as Record<string, unknown>;
  for (const key of [language, "pt", "en", "es"]) {
    if (typeof translations[key] === "string" && translations[key]) return translations[key] as string;
  }
  return "";
}
