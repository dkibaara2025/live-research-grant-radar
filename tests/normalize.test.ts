import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOpportunity } from "../src/lib/funding/normalize";

test("normalizeOpportunity marks live source metadata correctly", () => {
  const opportunity = normalizeOpportunity(
    {
      title: "Open Research Call",
      funder: "Example Funder",
      url: "https://example.org/call",
      topics: ["research", "health"],
    },
    {
      source: "Example feed",
      sourceUrl: "https://example.org/feed.json",
      dataMode: "live",
      isLive: true,
      retrievedAt: "2026-06-29T00:00:00.000Z",
    },
  );

  assert.equal(opportunity.isLive, true);
  assert.equal(opportunity.dataMode, "live");
  assert.equal(opportunity.sourceUrl, "https://example.org/feed.json");
  assert.equal(opportunity.callUrl, "https://example.org/call");
  assert.deepEqual(opportunity.topics, ["research", "health"]);
});

test("normalizeOpportunity labels missing call link for verification", () => {
  const opportunity = normalizeOpportunity(
    {
      title: "Call With Missing Link",
    },
    {
      source: "Manual import",
      sourceUrl: "",
      dataMode: "cached",
      isLive: false,
    },
  );

  assert.equal(opportunity.callUrl, "missing");
  assert.ok(
    opportunity.needsVerification.some((item) =>
      item.toLowerCase().includes("call link"),
    ),
  );
});
