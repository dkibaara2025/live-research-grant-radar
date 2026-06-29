import assert from "node:assert/strict";
import test from "node:test";
import { runRadar } from "../src/lib/agent/run-radar";

test("runRadar returns team/proposal placeholders when no records are saved", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousFeeds = process.env.FUNDING_FEEDS;

  delete process.env.DATABASE_URL;
  delete process.env.GEMINI_API_KEY;
  delete process.env.FUNDING_FEEDS;

  try {
    const result = await runRadar({
      field: "Climate and health systems",
      region: "Kenya",
      careerStage: "Early-career PI",
      deadlineWindow: "120 days",
      keywords: "climate, health systems, implementation",
      summary:
        "A practical climate health implementation project with community health workers.",
    });

    assert.equal(result.matches[0].teamRecommendation.dataAvailable, false);
    assert.equal(result.matches[0].proposalRecommendation.dataAvailable, false);
    assert.ok(result.matches[0].callUrl);
  } finally {
    if (previousDatabaseUrl) process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousGeminiKey) process.env.GEMINI_API_KEY = previousGeminiKey;
    if (previousFeeds) process.env.FUNDING_FEEDS = previousFeeds;
  }
});
