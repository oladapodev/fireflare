import { Store } from "../store";
import type { Env } from "../types";
import { json, readJson } from "../utils/http";

const VALID_RATINGS = ["good", "bad", "partial"] as const;
const MAX_USEFUL_SOURCES = 50;
const MAX_MISSING_CONTENT = 20;
const MAX_QUERY_SUGGESTION_LENGTH = 2000;
const MAX_FEEDBACK_URL_LENGTH = 2048;

export async function handleSearchFeedback(request: Request, env: Env, jobId: string): Promise<Response> {
  if (!UUID_RE.test(jobId)) {
    return json(
      {
        success: false,
        error: "Invalid job ID format. Job ID must be a valid UUID.",
      },
      { status: 400 },
    );
  }

  const body = await readJson<Record<string, unknown>>(request);
  const validation = validateFeedbackBody(body);
  if (!validation.ok) {
    return json(
      {
        success: false,
        error: "Invalid request body",
        feedbackErrorCode: "INVALID_BODY",
        details: validation.issues,
      },
      { status: 400 },
    );
  }

  const { rating, valuableSources, missingContent, querySuggestions } = validation.value;
  const hasSources = valuableSources.length > 0;
  const hasMissing = missingContent.length > 0;
  const hasSuggestions = querySuggestions.length > 0;
  if (
    (rating === "good" && !hasSources) ||
    (rating === "partial" && !hasSources && !hasMissing) ||
    (rating === "bad" && !hasMissing && !hasSuggestions)
  ) {
    return json(
      {
        success: false,
        error: "Feedback must be substantive. 'good' requires at least one valuableSources entry; 'partial' requires valuableSources or at least one missingContent entry; 'bad' requires at least one missingContent entry or querySuggestions.",
        feedbackErrorCode: "INVALID_BODY",
        details: [
          {
            code: "custom",
            path: ["rating"],
            message:
              "Feedback must be substantive. 'good' requires at least one valuableSources entry; 'partial' requires valuableSources or at least one missingContent entry; 'bad' requires at least one missingContent entry or querySuggestions.",
          },
        ],
      },
      { status: 400 },
    );
  }

  const store = new Store(env);
  const job = await store.getJobRecord(jobId);
  if (!job || job.kind !== "search") {
    return json(
      {
        success: false,
        error: "Search not found for this team.",
        feedbackErrorCode: "SEARCH_NOT_FOUND",
      },
      { status: 404 },
    );
  }

  if (job.status !== "completed") {
    return json(
      {
        success: false,
        error: "Cannot submit feedback for a search that did not succeed.",
        feedbackErrorCode: "SEARCH_FAILED",
      },
      { status: 409 },
    );
  }

  return json({
    success: true,
    feedbackId: `${crypto.randomUUID()}`,
    creditsRefunded: 1,
    creditsRefundedToday: 1,
    dailyRefundCap: 100,
    alreadySubmitted: false,
    dailyCapReached: false,
  });
}

function validateFeedbackBody(body: Record<string, unknown>): {
  ok: boolean;
  value: {
    rating: (typeof VALID_RATINGS)[number];
    valuableSources: Array<{ url: string; reason?: string }>;
    missingContent: Array<{ topic: string; description?: string }>;
    querySuggestions: string;
  };
  issues: Array<{ code: string; path: Array<string | number>; message: string }>;
} {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      value: {
        rating: "bad",
        valuableSources: [],
        missingContent: [],
        querySuggestions: "",
      },
      issues: [{ code: "invalid_type", path: [], message: "Request body must be an object." }],
    };
  }

  const issues: Array<{ code: string; path: Array<string | number>; message: string }> = [];
  const rating = typeof body.rating === "string" && VALID_RATINGS.includes(body.rating as (typeof VALID_RATINGS)[number])
    ? (body.rating as (typeof VALID_RATINGS)[number])
    : null;
  if (!rating) {
    issues.push({
      code: "invalid_type",
      path: ["rating"],
      message: "rating must be one of good, bad, or partial",
    });
  }

  const valuableSources = coerceValuableSources(body.valuableSources, issues);
  const missingContent = coerceMissingContent(body.missingContent, issues);
  const querySuggestions = coerceQuerySuggestions(body.querySuggestions, issues);

  const hasSources = valuableSources.length > 0;
  const hasMissing = missingContent.length > 0;
  const hasSuggestions = querySuggestions.length > 0;

  if (issues.length > 0 || !rating) {
    return {
      ok: false,
      value: {
        rating: rating ?? "bad",
        valuableSources,
        missingContent,
        querySuggestions,
      },
      issues,
    };
  }

  if (
    (rating === "good" && !hasSources) ||
    (rating === "partial" && !hasSources && !hasMissing) ||
    (rating === "bad" && !hasMissing && !hasSuggestions)
  ) {
    const message =
      "Feedback must be substantive. 'good' requires at least one valuableSources entry; 'partial' requires valuableSources or at least one missingContent entry; 'bad' requires at least one missingContent entry or querySuggestions.";
    issues.push({
      code: "custom",
      path: ["rating"],
      message,
    });
  }

  return {
    ok: issues.length === 0,
    value: {
      rating: rating ?? "bad",
      valuableSources,
      missingContent,
      querySuggestions,
    },
    issues,
  };
}

function coerceValuableSources(
  raw: unknown,
  issues: Array<{ code: string; path: Array<string | number>; message: string }>,
): Array<{ url: string; reason?: string }> {
  if (!Array.isArray(raw)) {
    if (raw === undefined) return [];
    issues.push({
      code: "invalid_type",
      path: ["valuableSources"],
      message: "valuableSources must be an array of objects.",
    });
    return [];
  }

  if (raw.length > MAX_USEFUL_SOURCES) {
    issues.push({
      code: "too_big",
      path: ["valuableSources"],
      message: `Maximum of ${MAX_USEFUL_SOURCES} entries allowed for valuableSources.`,
    });
    return [];
  }

  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        issues.push({
          code: "invalid_type",
          path: ["valuableSources", index],
          message: "valuableSources entry must be an object.",
        });
        return null;
      }
      const candidate = entry as Record<string, unknown>;
      const urlValue = typeof candidate.url === "string" ? candidate.url.trim() : "";
      if (!isHttpUrl(urlValue)) {
        issues.push({
          code: "custom",
          path: ["valuableSources", index, "url"],
          message: "valuableSources entry url must be a valid http(s) URL.",
        });
        return null;
      }
      const reasonValue = typeof candidate.reason === "string" && candidate.reason.trim().length > 0 ? candidate.reason.trim() : undefined;
      if (reasonValue && reasonValue.length > 1000) {
        issues.push({
          code: "too_big",
          path: ["valuableSources", index, "reason"],
          message: "valuableSources.entry reason must be 1000 characters or fewer.",
        });
      }
      return { url: urlValue, ...(reasonValue ? { reason: reasonValue } : {}) };
    })
    .filter((item): item is { url: string; reason?: string } => item !== null);
}

function coerceMissingContent(
  raw: unknown,
  issues: Array<{ code: string; path: Array<string | number>; message: string }>,
): Array<{ topic: string; description?: string }> {
  if (!Array.isArray(raw)) {
    if (raw === undefined) return [];
    issues.push({
      code: "invalid_type",
      path: ["missingContent"],
      message: "missingContent must be an array of objects.",
    });
    return [];
  }

  if (raw.length > MAX_MISSING_CONTENT) {
    issues.push({
      code: "too_big",
      path: ["missingContent"],
      message: `Maximum of ${MAX_MISSING_CONTENT} entries allowed for missingContent.`,
    });
    return [];
  }

  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        issues.push({
          code: "invalid_type",
          path: ["missingContent", index],
          message: "missingContent entry must be an object.",
        });
        return null;
      }
      const candidate = entry as Record<string, unknown>;
      const topic = typeof candidate.topic === "string" ? candidate.topic.trim() : "";
      if (!topic) {
        issues.push({
          code: "invalid_type",
          path: ["missingContent", index, "topic"],
          message: "missingContent.entry topic must not be empty.",
        });
        return null;
      }
      if (topic.length > 200) {
        issues.push({
          code: "too_big",
          path: ["missingContent", index, "topic"],
          message: "missingContent.entry topic must be 200 characters or fewer.",
        });
      }
      const descriptionValue =
        typeof candidate.description === "string" && candidate.description.trim().length > 0
          ? candidate.description.trim()
          : undefined;
      if (descriptionValue && descriptionValue.length > 2000) {
        issues.push({
          code: "too_big",
          path: ["missingContent", index, "description"],
          message: "missingContent.entry description must be 2000 characters or fewer.",
        });
      }
      return {
        topic,
        ...(descriptionValue ? { description: descriptionValue } : {}),
      };
    })
    .filter((item): item is { topic: string; description?: string } => item !== null);
}

function coerceQuerySuggestions(raw: unknown, issues: Array<{ code: string; path: Array<string | number>; message: string }>): string {
  if (raw === undefined) return "";
  if (typeof raw !== "string") {
    issues.push({
      code: "invalid_type",
      path: ["querySuggestions"],
      message: "querySuggestions must be a string.",
    });
    return "";
  }
  const trimmed = raw.trim();
  if (trimmed.length > MAX_QUERY_SUGGESTION_LENGTH) {
    issues.push({
      code: "too_big",
      path: ["querySuggestions"],
      message: "querySuggestions must be 2000 characters or fewer.",
    });
  }
  return trimmed;
}

function isHttpUrl(raw: string): boolean {
  try {
      const parsed = new URL(raw);
    return (
      raw.length <= MAX_FEEDBACK_URL_LENGTH &&
      (parsed.protocol === "http:" || parsed.protocol === "https:")
    );
  } catch {
    return false;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
