import assert from "node:assert/strict";
import test from "node:test";
import {
  Mixfont,
  MixfontGenerationError,
} from "../dist/index.js";

const DEFAULT_BASE_URL = "https://api.mixfont.com/v1";

const apiGeneration = (overrides = {}) => ({
  id: "gen_123",
  status: "queued",
  input_type: "text",
  glyph_set: "standard",
  progress_percent: 0,
  name: "Demo",
  ttf_url: null,
  created_at: "2026-06-02T00:00:00.000Z",
  ...overrides,
});

const createTestClient = (fetchImplementation) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return new Mixfont({
      apiKey: "test-key",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test("creates a text generation", async () => {
  const calls = [];
  const client = createTestClient(async (url, init) => {
    calls.push({ init, url });

    return new Response(
      JSON.stringify(
        apiGeneration({
          poll_url: `${DEFAULT_BASE_URL}/font-generations/gen_123`,
        }),
      ),
      { status: 201 },
    );
  });

  const generation = await client.generations.create({
    glyphSet: "extended",
    prompt: "A condensed sci-fi display font",
  });

  assert.equal(calls[0].url, `${DEFAULT_BASE_URL}/font-generations/text`);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["x-api-key"], "test-key");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    prompt: "A condensed sci-fi display font",
    glyph_set: "extended",
  });
  assert.equal(generation.id, "gen_123");
  assert.equal(
    generation.pollUrl,
    `${DEFAULT_BASE_URL}/font-generations/gen_123`,
  );
  assert.deepEqual(Object.keys(generation), [
    "id",
    "name",
    "ttfUrl",
    "status",
    "inputType",
    "glyphSet",
    "progressPercent",
    "pollUrl",
    "createdAt",
  ]);
});

test("creates an image generation", async () => {
  const calls = [];
  const client = createTestClient(async (url, init) => {
    calls.push({ init, url });

    return new Response(
      JSON.stringify(apiGeneration({ input_type: "image" })),
      { status: 201 },
    );
  });

  await client.generations.create({
    imageUrl: "https://example.com/reference.png",
  });

  assert.equal(calls[0].url, `${DEFAULT_BASE_URL}/font-generations/image`);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    image_url: "https://example.com/reference.png",
  });
});

test("gets a generation", async () => {
  const client = createTestClient(async (url, init) => {
    assert.equal(url, `${DEFAULT_BASE_URL}/font-generations/gen_123`);
    assert.equal(init.method, "GET");

    return new Response(JSON.stringify(apiGeneration()), { status: 200 });
  });

  const generation = await client.generations.get("gen_123");

  assert.equal(generation.id, "gen_123");
});

test("waits until a generation succeeds", async () => {
  const statuses = ["running", "succeeded"];
  const client = createTestClient(async () => {
    const status = statuses.shift();

    return new Response(
      JSON.stringify(
        apiGeneration({
          status,
          progress_percent: status === "succeeded" ? 100 : 40,
          ttf_url:
            status === "succeeded" ? "https://static.test/demo.ttf" : null,
        }),
      ),
      { status: 200 },
    );
  });

  const generation = await client.generations.wait("gen_123", {
    intervalMs: 1,
    timeoutMs: 100,
  });

  assert.equal(generation.status, "succeeded");
  assert.equal(generation.name, "Demo");
  assert.equal(generation.ttfUrl, "https://static.test/demo.ttf");
  assert.deepEqual(Object.keys(generation), [
    "id",
    "name",
    "ttfUrl",
    "status",
    "inputType",
    "glyphSet",
    "progressPercent",
    "createdAt",
  ]);
});

test("throws when a generation fails", async () => {
  const client = createTestClient(async () =>
    new Response(
      JSON.stringify(
        apiGeneration({
          error: "Could not generate font.",
          status: "failed",
        }),
      ),
      { status: 200 },
    ),
  );

  await assert.rejects(
    () =>
      client.generations.wait("gen_123", {
        intervalMs: 1,
        timeoutMs: 100,
      }),
    MixfontGenerationError,
  );
});
