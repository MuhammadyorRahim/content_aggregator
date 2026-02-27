const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "AI & ML": [
    "ai",
    "artificial intelligence",
    "machine learning",
    "llm",
    "gpt",
    "neural",
    "deep learning",
  ],
  Programming: [
    "javascript",
    "typescript",
    "python",
    "rust",
    "golang",
    "programming",
    "software engineering",
  ],
  "Tech News": ["release", "launch", "breaking", "announcement", "update", "startup", "funding"],
  Science: ["science", "research", "study", "experiment", "biology", "physics", "chemistry"],
  Opinion: ["opinion", "editorial", "essay", "thoughts", "analysis", "commentary"],
};

export function detectCategory(input: { title?: string | null; content?: string | null }) {
  const text = `${input.title ?? ""} ${input.content ?? ""}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }

  return "Uncategorized";
}
