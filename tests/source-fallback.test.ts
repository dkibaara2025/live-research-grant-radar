import assert from "node:assert/strict";
import test from "node:test";
import { fetchFundingSources } from "../src/lib/funding/sources";

test("fetchFundingSources labels seed fallback without warning when no feeds are configured", async () => {
  const previousFeeds = process.env.FUNDING_FEEDS;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  delete process.env.FUNDING_FEEDS;
  delete process.env.DATABASE_URL;

  try {
    const result = await fetchFundingSources();

    assert.equal(result.dataMode, "seed");
    assert.equal(result.warnings.length, 0);
    assert.equal(result.sourceStatuses[0].key, "seed");
    assert.match(result.sourceStatuses[0].message, /demo/i);
  } finally {
    if (previousFeeds) {
      process.env.FUNDING_FEEDS = previousFeeds;
    }

    if (previousDatabaseUrl) {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});
