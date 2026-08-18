import { SearchResultItem } from "../providers/types";

export type FreshnessIntent = "today" | "this_week" | "this_month" | "recent" | "any";

export interface SourceValidationResult {
  freshResults: SearchResultItem[];
  staleResults: SearchResultItem[];
  credibleResults: SearchResultItem[];
  filteredCount: number;
  freshnessApplied: boolean;
  validatedUrls: string[];
}

// Low-quality content farms, SEO aggregators, and spam directories to exclude
const BANNED_OR_LOW_QUALITY_DOMAINS = new Set([
  "aitoolmind.com",
  "topai.tools",
  "allthingsai.com",
  "futurepedia.io",
  "therundown.ai",
  "toolify.ai",
  "aivalley.ai",
  "insidr.ai",
  "easywithai.com",
  "taaft.com",
]);

// Tier 1: Primary official sources & scientific journals
const TIER1_DOMAINS = new Set([
  "openai.com",
  "google.com",
  "deepmind.google",
  "blog.google",
  "microsoft.com",
  "apple.com",
  "anthropic.com",
  "meta.com",
  "about.meta.com",
  "nvidia.com",
  "blogs.nvidia.com",
  "tesla.com",
  "nature.com",
  "science.org",
  "arxiv.org",
  "github.com",
  "whitehouse.gov",
]);

// Tier 2: Top-tier global journalism & premier tech publications
const TIER2_DOMAINS = new Set([
  "reuters.com",
  "bloomberg.com",
  "apnews.com",
  "wsj.com",
  "ft.com",
  "nytimes.com",
  "washingtonpost.com",
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "arstechnica.com",
  "venturebeat.com",
  "technologyreview.com",
  "cnbc.com",
  "forbes.com",
  "marketwatch.com",
  "tomshardware.com",
  "engadget.com",
  "zdnet.com",
  "sciencedaily.com",
  "phys.org",
  "axios.com",
  "politico.com",
  "aljazeera.com",
  "economist.com",
]);

/**
 * Extracts a hostname domain from a URL without www.
 */
export function getCleanDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Computes source credibility score (0 - 100)
 */
export function calculateCredibilityScore(item: SearchResultItem): number {
  const domain = getCleanDomain(item.url);

  if (BANNED_OR_LOW_QUALITY_DOMAINS.has(domain)) {
    return 10;
  }

  if (domain.endsWith(".gov") || domain.endsWith(".edu") || TIER1_DOMAINS.has(domain)) {
    return 100;
  }

  if (TIER2_DOMAINS.has(domain)) {
    return 85;
  }

  // Known subdomains of major tech/news
  if (
    domain.endsWith(".reuters.com") ||
    domain.endsWith(".bloomberg.com") ||
    domain.endsWith(".bbc.com") ||
    domain.endsWith(".techcrunch.com") ||
    domain.endsWith(".theverge.com")
  ) {
    return 85;
  }

  return 60;
}

/**
 * Parses publication date from publishedAt string or snippet text.
 * Returns parsed Date or null if indeterminable.
 */
export function parsePublicationDate(item: SearchResultItem, referenceDate: Date): Date | null {
  if (item.publishedAt) {
    const parsed = new Date(item.publishedAt);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Look for relative time patterns in snippet or title: e.g. "2 hours ago", "1 day ago", "yesterday", "3 days ago"
  const text = `${item.title} ${item.snippet}`;
  const relativeHoursMatch = text.match(/(\d+)\s*(?:hours?|hrs?)\s*ago/i);
  if (relativeHoursMatch) {
    const hours = parseInt(relativeHoursMatch[1], 10);
    return new Date(referenceDate.getTime() - hours * 60 * 60 * 1000);
  }

  const relativeDaysMatch = text.match(/(\d+)\s*days?\s*ago/i);
  if (relativeDaysMatch) {
    const days = parseInt(relativeDaysMatch[1], 10);
    return new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000);
  }

  if (/\byesterday\b/i.test(text)) {
    return new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000);
  }

  // Look for explicit date formats like "2026-08-17" or "August 16, 2026" or "Aug 15, 2026"
  const isoMatch = text.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
  if (isoMatch) {
    const d = new Date(isoMatch[1]);
    if (!isNaN(d.getTime())) return d;
  }

  const writtenMatch = text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(202\d)\b/i);
  if (writtenMatch) {
    const d = new Date(`${writtenMatch[1]} ${writtenMatch[2]}, ${writtenMatch[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // Look for month-year like "January 2026"
  const monthYearMatch = text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(202\d)\b/i);
  if (monthYearMatch) {
    const d = new Date(`${monthYearMatch[1]} 1, ${monthYearMatch[2]}`);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Validates, filters, and ranks search results according to user freshness intent
 * and source credibility guidelines.
 */
export function validateAndRankSearchResults(
  results: SearchResultItem[],
  freshness: FreshnessIntent,
  referenceDate: Date = new Date()
): SourceValidationResult {
  const validatedUrls: string[] = [];
  const freshList: SearchResultItem[] = [];
  const staleList: SearchResultItem[] = [];

  // Allowed max age in days based on freshness intent
  let maxAgeDays = Infinity;
  if (freshness === "today") {
    // Allow up to 3 days to account for timezone differences (UTC vs local) and weekend news cycles
    maxAgeDays = 3;
  } else if (freshness === "this_week") {
    maxAgeDays = 8;
  } else if (freshness === "this_month" || freshness === "recent") {
    maxAgeDays = 35;
  }

  for (const item of results) {
    if (!item.url || !item.url.startsWith("http")) {
      continue;
    }

    const domain = getCleanDomain(item.url);
    if (BANNED_OR_LOW_QUALITY_DOMAINS.has(domain)) {
      continue; // exclude content farm
    }

    const credibility = calculateCredibilityScore(item);
    const pubDate = parsePublicationDate(item, referenceDate);

    let isFresh = true;
    let ageInDays: number | null = null;

    if (pubDate) {
      const diffMs = referenceDate.getTime() - pubDate.getTime();
      ageInDays = diffMs / (1000 * 60 * 60 * 24);

      if (maxAgeDays !== Infinity && ageInDays > maxAgeDays) {
        isFresh = false;
      }
    } else {
      // If no explicit date is found on the item, check if the URL or title mentions an old past month/year
      // (e.g. "january-2026" or "2025" when reference is August 2026)
      const currentYear = referenceDate.getFullYear();
      const currentMonth = referenceDate.getMonth(); // 0-indexed (7 for Aug)
      
      const lowerUrlAndTitle = `${item.url} ${item.title}`.toLowerCase();
      // Check for past months if we are looking for "today"
      if (freshness === "today" || freshness === "this_week") {
        const pastMonthNames = [
          "january", "february", "march", "april", "may", "june", "july",
          "jan", "feb", "mar", "apr", "jun", "jul"
        ];
        for (let m = 0; m < currentMonth; m++) {
          const monthName = pastMonthNames[m];
          if (monthName && (lowerUrlAndTitle.includes(`${monthName}-${currentYear}`) || lowerUrlAndTitle.includes(`${monthName} ${currentYear}`))) {
            isFresh = false;
            break;
          }
        }
      }
    }

    // Format human-readable source label
    const cleanSource = item.source || domain.replace(/\.[a-z]+$/, "");
    const enhancedItem: SearchResultItem = {
      ...item,
      source: cleanSource,
      score: credibility,
      publishedAt: pubDate ? pubDate.toISOString().split("T")[0] : item.publishedAt,
    };

    if (isFresh) {
      freshList.push(enhancedItem);
    } else {
      staleList.push(enhancedItem);
    }
    validatedUrls.push(item.url);
  }

  // Sort fresh list by credibility score descending, then presence of publication date
  freshList.sort((a, b) => {
    const scoreA = (a.score || 50) + (a.publishedAt ? 20 : 0);
    const scoreB = (b.score || 50) + (b.publishedAt ? 20 : 0);
    return scoreB - scoreA;
  });

  return {
    freshResults: freshList,
    staleResults: staleList,
    credibleResults: freshList.filter((r) => (r.score || 0) >= 80),
    filteredCount: results.length - (freshList.length + staleList.length),
    freshnessApplied: freshness !== "any",
    validatedUrls,
  };
}
