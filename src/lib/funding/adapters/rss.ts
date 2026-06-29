import { XMLParser } from "fast-xml-parser";
import type { FundingOpportunity } from "@/lib/agent/types";
import { cleanText, normalizeOpportunity } from "../normalize";

type RssItem = {
  title?: string;
  link?: string;
  guid?: string | { "#text"?: string };
  description?: string;
  pubDate?: string;
  category?: string | string[];
};

type AtomEntry = {
  title?: string;
  link?: string | { href?: string } | Array<{ href?: string }>;
  id?: string;
  summary?: string;
  content?: string;
  updated?: string;
  category?: Array<{ term?: string }> | { term?: string };
};

export async function fetchRssFeed(url: string): Promise<FundingOpportunity[]> {
  const response = await fetchWithTimeout(url, 8000);

  if (!response.ok) {
    throw new Error(`RSS/Atom feed returned ${response.status}`);
  }

  const text = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const parsed = parser.parse(text) as {
    rss?: { channel?: { item?: RssItem | RssItem[]; title?: string } };
    feed?: { entry?: AtomEntry | AtomEntry[]; title?: string };
  };
  const retrievedAt = new Date().toISOString();
  const rssItems = asArray(parsed.rss?.channel?.item);
  const atomEntries = asArray(parsed.feed?.entry);

  if (rssItems.length > 0) {
    return rssItems
      .filter((item) => item.title)
      .map((item, index) =>
        normalizeOpportunity(
          {
            externalId: getGuid(item.guid) ?? item.link ?? `${url}-${index}`,
            title: item.title ?? "Untitled RSS opportunity",
            funder: parsed.rss?.channel?.title ?? new URL(url).hostname,
            url: item.link ?? url,
            deadline: "Needs verification",
            regionEligibility: "Needs verification from source.",
            careerStageEligibility: "Needs verification from source.",
            amount: "Needs verification",
            focus: categoriesToTags(item.category).join(", ") || item.title,
            summary: cleanText(item.description ?? item.title ?? ""),
            description: cleanText(item.description ?? item.title ?? ""),
            eligibility: "Needs verification from source.",
            tags: ["Live RSS", ...categoriesToTags(item.category)].slice(0, 6),
            topics: categoriesToTags(item.category),
            retrievedAt,
            isLive: true,
            dataMode: "live",
            baseScore: 50,
          },
          {
            source: parsed.rss?.channel?.title ?? new URL(url).hostname,
            sourceUrl: url,
            dataMode: "live",
            isLive: true,
            retrievedAt,
          },
        ),
      );
  }

  return atomEntries
    .filter((entry) => entry.title)
    .map((entry, index) =>
      normalizeOpportunity(
        {
          externalId: entry.id ?? atomLink(entry.link) ?? `${url}-${index}`,
          title: entry.title ?? "Untitled Atom opportunity",
          funder: parsed.feed?.title ?? new URL(url).hostname,
          url: atomLink(entry.link) ?? url,
          deadline: "Needs verification",
          regionEligibility: "Needs verification from source.",
          careerStageEligibility: "Needs verification from source.",
          amount: "Needs verification",
          focus: atomCategories(entry.category).join(", ") || entry.title,
          summary: cleanText(entry.summary ?? entry.content ?? entry.title ?? ""),
          description: cleanText(entry.content ?? entry.summary ?? entry.title ?? ""),
          eligibility: "Needs verification from source.",
          tags: ["Live Atom", ...atomCategories(entry.category)].slice(0, 6),
          topics: atomCategories(entry.category),
          retrievedAt,
          isLive: true,
          dataMode: "live",
          baseScore: 50,
        },
        {
          source: parsed.feed?.title ?? new URL(url).hostname,
          sourceUrl: url,
          dataMode: "live",
          isLive: true,
          retrievedAt,
        },
      ),
    );
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getGuid(guid: RssItem["guid"]) {
  if (!guid) {
    return undefined;
  }

  return typeof guid === "string" ? guid : guid["#text"];
}

function categoriesToTags(category: RssItem["category"]) {
  if (!category) {
    return [];
  }

  return Array.isArray(category) ? category : [category];
}

function atomLink(link: AtomEntry["link"]) {
  if (!link) {
    return undefined;
  }

  if (typeof link === "string") {
    return link;
  }

  if (Array.isArray(link)) {
    return link.find((item) => item.href)?.href;
  }

  return link.href;
}

function atomCategories(category: AtomEntry["category"]) {
  if (!category) {
    return [];
  }

  const categories = Array.isArray(category) ? category : [category];

  return categories.map((item) => item.term).filter((term): term is string => Boolean(term));
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
