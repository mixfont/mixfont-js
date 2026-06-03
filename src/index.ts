const DEFAULT_BASE_URL = "https://api.mixfont.com/v1";
const DEFAULT_WAIT_INTERVAL_MS = 5_000;
const DEFAULT_WAIT_TIMEOUT_MS = 10 * 60 * 1_000;

export type GenerationStatus =
  | "enriching"
  | "queued"
  | "running"
  | "succeeded"
  | "cancelled"
  | "failed";

export type GenerationInputType = "text" | "image";
export type GenerationGlyphSet = "standard" | "extended";

export type Generation = {
  id: string;
  name: string;
  ttfUrl: string | null;
  status: GenerationStatus;
  inputType: GenerationInputType;
  glyphSet: GenerationGlyphSet;
  progressPercent: number;
  pollUrl?: string;
  error?: string;
  createdAt: string;
};

type CreateGenerationBase = {
  glyphSet?: GenerationGlyphSet;
};

export type CreateGenerationOptions =
  | (CreateGenerationBase & {
      prompt: string;
      imageUrl?: never;
    })
  | (CreateGenerationBase & {
      imageUrl: string;
      prompt?: never;
    });

export type WaitForGenerationOptions = {
  intervalMs?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type MixfontOptions = {
  apiKey: string;
};

type ApiGeneration = {
  id: string;
  name: string;
  ttf_url: string | null;
  status: GenerationStatus;
  input_type: GenerationInputType;
  glyph_set: GenerationGlyphSet;
  progress_percent: number;
  poll_url?: string;
  error?: string;
  created_at: string;
};

export class MixfontError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class MixfontApiError extends MixfontError {
  readonly body: unknown;
  readonly status: number;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.body = body;
    this.status = status;
  }
}

export class MixfontGenerationError extends MixfontError {
  readonly generation: Generation;

  constructor(message: string, generation: Generation) {
    super(message);
    this.generation = generation;
  }
}

export class MixfontGenerationCancelledError extends MixfontGenerationError {}

export class MixfontTimeoutError extends MixfontError {
  readonly generation?: Generation;

  constructor(message: string, generation?: Generation) {
    super(message);
    this.generation = generation;
  }
}

export class MixfontAbortError extends MixfontError {}

class HttpClient {
  private readonly apiKey: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: MixfontOptions) {
    const apiKey = options.apiKey.trim();

    if (!apiKey) {
      throw new MixfontError("A Mixfont API key is required.");
    }

    if (typeof globalThis.fetch !== "function") {
      throw new MixfontError("No fetch implementation is available.");
    }

    this.apiKey = apiKey;
    this.fetchImplementation = globalThis.fetch.bind(globalThis);
  }

  async request<T>(
    path: string,
    init: {
      body?: unknown;
      method: "GET" | "POST";
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-api-key": this.apiKey,
    };

    if (init.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetchImplementation(`${DEFAULT_BASE_URL}${path}`, {
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      headers,
      method: init.method,
      signal: init.signal,
    });
    const body = await readJsonBody(response);

    if (!response.ok) {
      throw new MixfontApiError(
        readErrorMessage(body) ?? `Mixfont request failed with status ${response.status}.`,
        response.status,
        body,
      );
    }

    return body as T;
  }
}

export class GenerationsClient {
  private readonly client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  async create(options: CreateGenerationOptions): Promise<Generation> {
    const hasPrompt = hasText(options.prompt);
    const hasImageUrl = hasText(options.imageUrl);

    if (hasPrompt === hasImageUrl) {
      throw new MixfontError("Provide exactly one of prompt or imageUrl.");
    }

    const body = {
      ...(hasPrompt ? { prompt: options.prompt } : { image_url: options.imageUrl }),
      ...(options.glyphSet ? { glyph_set: options.glyphSet } : {}),
    };
    const path = hasPrompt ? "/font-generations/text" : "/font-generations/image";
    const generation = await this.client.request<ApiGeneration>(path, {
      body,
      method: "POST",
    });

    return toGeneration(generation);
  }

  async get(id: string): Promise<Generation> {
    const generationId = normalizeGenerationId(id);
    const generation = await this.client.request<ApiGeneration>(
      `/font-generations/${encodeURIComponent(generationId)}`,
      {
        method: "GET",
      },
    );

    return toGeneration(generation);
  }

  async wait(
    id: string,
    options: WaitForGenerationOptions = {},
  ): Promise<Generation> {
    const intervalMs = normalizePositiveNumber(
      options.intervalMs,
      DEFAULT_WAIT_INTERVAL_MS,
    );
    const timeoutMs = normalizePositiveNumber(
      options.timeoutMs,
      DEFAULT_WAIT_TIMEOUT_MS,
    );
    const startedAt = Date.now();
    let lastGeneration: Generation | undefined;

    while (Date.now() - startedAt <= timeoutMs) {
      throwIfAborted(options.signal);

      lastGeneration = await this.get(id);

      if (lastGeneration.status === "succeeded") {
        return lastGeneration;
      }

      if (lastGeneration.status === "failed") {
        throw new MixfontGenerationError(
          lastGeneration.error ?? "Font generation failed.",
          lastGeneration,
        );
      }

      if (lastGeneration.status === "cancelled") {
        throw new MixfontGenerationCancelledError(
          "Font generation was cancelled.",
          lastGeneration,
        );
      }

      const elapsedMs = Date.now() - startedAt;
      const remainingMs = timeoutMs - elapsedMs;

      if (remainingMs <= 0) {
        break;
      }

      await sleep(Math.min(intervalMs, remainingMs), options.signal);
    }

    throw new MixfontTimeoutError(
      `Timed out waiting for Mixfont generation ${id}.`,
      lastGeneration,
    );
  }
}

export class Mixfont {
  readonly generations: GenerationsClient;

  constructor(options: MixfontOptions) {
    this.generations = new GenerationsClient(new HttpClient(options));
  }
}

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeGenerationId = (id: string) => {
  const generationId = id.trim();

  if (!generationId) {
    throw new MixfontError("A Mixfont generation id is required.");
  }

  return generationId;
};

const normalizePositiveNumber = (
  value: number | undefined,
  fallback: number,
) => {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new MixfontError("Wait interval and timeout values must be positive numbers.");
  }

  return value;
};

const readJsonBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
};

const readErrorMessage = (body: unknown) => {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return null;
  }

  const error = (body as { error?: unknown }).error;

  return typeof error === "string" && error.trim() ? error : null;
};

const toGeneration = (generation: ApiGeneration): Generation => ({
  id: generation.id,
  name: generation.name,
  ttfUrl: generation.ttf_url,
  status: generation.status,
  inputType: generation.input_type,
  glyphSet: generation.glyph_set,
  progressPercent: generation.progress_percent,
  ...(generation.poll_url === undefined ? {} : { pollUrl: generation.poll_url }),
  ...(hasText(generation.error) ? { error: generation.error } : {}),
  createdAt: generation.created_at,
});

const throwIfAborted = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) {
    throw new MixfontAbortError("Mixfont wait was aborted.");
  }
};

const sleep = (ms: number, signal: AbortSignal | undefined) =>
  new Promise<void>((resolve, reject) => {
    throwIfAborted(signal);

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timeout);
      reject(new MixfontAbortError("Mixfont wait was aborted."));
    };

    signal?.addEventListener("abort", abort, { once: true });
  });

export default Mixfont;
