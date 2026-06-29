import assert from "node:assert/strict";
import test from "node:test";
import { getOpportunityDisplayLinks } from "../src/lib/funding/display-links";

test("getOpportunityDisplayLinks repairs stale Grants.gov missing call links", () => {
  const links = getOpportunityDisplayLinks({
    externalId: "332894",
    source: "Grants.gov",
    sourceName: "",
    sourceType: "government",
    sourceUrl: "https://api.grants.gov/v1/api/search2",
    callUrl: "missing",
    applicationUrl: "missing",
  });

  assert.equal(links.sourceName, "Grants.gov");
  assert.equal(links.sourceUrl, "https://www.grants.gov/search-results");
  assert.equal(links.sourceLabel, "Grants.gov search");
  assert.equal(links.callUrl, "https://www.grants.gov/search-results-detail/332894");
  assert.equal(
    links.applicationUrl,
    "https://www.grants.gov/search-results-detail/332894",
  );
});
