import { describe, expect, it } from "vitest";
import {
  formatScrapeErrorMessage,
  suggestsBlockedAccess,
  suggestsVisibleBrowser,
} from "@/lib/scrape-hints";
import { buildChangeSummary, formatNumericChange } from "@/lib/value-change";
import { buildFallbackSuggestions, parseSuggestions } from "@/lib/suggest-targets";

describe("scrape hints", () => {
  it("adds visible browser guidance for login errors", () => {
    const message = formatScrapeErrorMessage(
      'Could not extract "price" because signing in is required to view that content.',
    );

    expect(message).toContain("visible browser");
    expect(suggestsVisibleBrowser(message)).toBe(true);
  });

  it("adds blocked access guidance", () => {
    const message = formatScrapeErrorMessage(
      "The site blocked the automated request or showed a captcha.",
    );

    expect(message).toContain("blocking automated access");
    expect(suggestsBlockedAccess(message)).toBe(true);
  });
});

describe("value change summaries", () => {
  it("summarizes numeric decreases", () => {
    expect(formatNumericChange("$120", "$99")).toContain("decreased");
  });

  it("falls back to plain text summaries", () => {
    expect(
      buildChangeSummary("In stock", "Out of stock", "Availability"),
    ).toContain("Out of stock");
  });
});

describe("target suggestions", () => {
  it("returns ecommerce defaults for known hosts", () => {
    expect(
      buildFallbackSuggestions({
        hostname: "www.amazon.com",
      }),
    ).toContain("Current product price");
  });

  it("parses markdown-wrapped json arrays into readable strings", () => {
    expect(
      parseSuggestions(
        '```json\n["Top trending posts", "Number of active users", "Latest subreddit updates"]\n```',
      ),
    ).toEqual([
      "Top trending posts",
      "Number of active users",
      "Latest subreddit updates",
    ]);
  });

  it("parses plain line suggestions", () => {
    expect(
      parseSuggestions("Current product price\nStock availability\nProduct title"),
    ).toEqual(["Current product price", "Stock availability", "Product title"]);
  });

  it("returns airline defaults for blocked airline sites", () => {
    expect(
      buildFallbackSuggestions({
        hostname: "www.united.com",
      }),
    ).toContain("Lowest flight price shown");
  });
});
