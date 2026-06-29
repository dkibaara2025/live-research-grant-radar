import type { AgentWarning, RankedOpportunity, ResearchProfile } from "./agent/types";

export type LlmPlanResult = {
  eligibilityNotes: string;
  actionPlan: string[];
  planSummary: string;
  provider: "gemini" | "fallback";
  warning?: AgentWarning;
};

const fallbackWarning: AgentWarning = {
  code: "LLM_FALLBACK",
  message: "Gemini was not configured or unavailable; used deterministic action-plan template.",
};

export async function generateGrantPlan(
  profile: ResearchProfile,
  opportunity: RankedOpportunity,
): Promise<LlmPlanResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return fallbackPlan(opportunity, fallbackWarning);
  }

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildPrompt(profile, opportunity),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
      8000,
    );

    if (!response.ok) {
      return fallbackPlan(opportunity, httpWarning(response.status));
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return fallbackPlan(opportunity, {
        code: "LLM_EMPTY_RESPONSE",
        message: "Gemini returned no text; used deterministic fallback.",
      });
    }

    const parsed = parseGeminiPlan(text);

    if (!parsed) {
      return fallbackPlan(opportunity, {
        code: "LLM_PARSE_ERROR",
        message: "Gemini response was not valid plan JSON; used deterministic fallback.",
      });
    }

    return {
      ...parsed,
      provider: "gemini",
    };
  } catch {
    return fallbackPlan(opportunity, {
      code: "LLM_REQUEST_ERROR",
      message: "Gemini request failed or timed out; used deterministic fallback.",
    });
  }
}

function httpWarning(status: number): AgentWarning {
  if (status === 429) {
    return {
      code: "LLM_RATE_LIMITED",
      message:
        "Gemini rate limit or quota was reached; used deterministic fallback for the plan.",
    };
  }

  if (status >= 500) {
    return {
      code: "LLM_TEMPORARILY_UNAVAILABLE",
      message:
        "Gemini was temporarily unavailable; used deterministic fallback for the plan.",
    };
  }

  return {
    code: "LLM_HTTP_ERROR",
    message: `Gemini returned ${status}; used deterministic fallback for the plan.`,
  };
}

function fallbackPlan(
  opportunity: RankedOpportunity,
  warning: AgentWarning,
): LlmPlanResult {
  return {
    eligibilityNotes: opportunity.eligibilityNotes,
    actionPlan: opportunity.actionPlan,
    planSummary: opportunity.planSummary,
    provider: "fallback",
    warning,
  };
}

function buildPrompt(profile: ResearchProfile, opportunity: RankedOpportunity) {
  return `Return JSON only with keys eligibilityNotes, planSummary, actionPlan.
actionPlan must be an array of exactly 4 concise actions.

Research profile:
Field: ${profile.field}
Region: ${profile.region}
Career stage: ${profile.careerStage}
Deadline window: ${profile.deadlineWindow}
Keywords: ${profile.keywords}
Summary: ${profile.summary}

Funding opportunity:
Title: ${opportunity.title}
Funder: ${opportunity.funder}
Deadline: ${opportunity.deadline}
Amount: ${opportunity.amount}
Focus: ${opportunity.focus}
Eligibility: ${opportunity.eligibility}
Fit score: ${opportunity.score}`;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function parseGeminiPlan(text: string) {
  try {
    const parsed = JSON.parse(text) as {
      eligibilityNotes?: unknown;
      planSummary?: unknown;
      actionPlan?: unknown;
    };

    if (
      typeof parsed.eligibilityNotes !== "string" ||
      typeof parsed.planSummary !== "string" ||
      !Array.isArray(parsed.actionPlan)
    ) {
      return null;
    }

    const actionPlan = parsed.actionPlan
      .filter((item): item is string => typeof item === "string")
      .slice(0, 4);

    if (actionPlan.length === 0) {
      return null;
    }

    return {
      eligibilityNotes: parsed.eligibilityNotes,
      planSummary: parsed.planSummary,
      actionPlan,
    };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
