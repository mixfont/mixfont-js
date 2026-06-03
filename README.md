<img src="./assets/mixfont-banner.webp" alt="Mixfont banner" width="1280" />

# Mixfont JavaScript client

A JavaScript client for the [Mixfont](https://www.mixfont.com) API. This open-source client lets you create AI-generated font files from Node.js and server-side JavaScript.

Mixfont is a frontier AI lab developing generative AI for fonts. The Mixfont [font generation](https://www.mixfont.com/font-generator) model creates complete, web-safe TTF font files from a natural-language prompt or a public reference image, so applications can turn generated lettering, sketches, logos, or visual references into editable type instead of a flat image. Fonts generated via the API are unique and licensed for commercial use.

For more information, see the [Mixfont website](https://www.mixfont.com) and the [full Mixfont documentation](https://www.mixfont.com/docs).

## Supported platforms

- Node.js >= 18
- Serverless runtimes including Vercel Functions, Cloudflare Workers, and AWS Lambda.

> Note: This client is not designed for in-browser usage.

## How font generation works

Font generation is asynchronous. Start a generation with exactly one input:

- `prompt`: a text description of the font to generate.
- `imageUrl`: a public HTTPS reference image for the style you want the model to follow.

The create call returns a generation `id` and, when available, a polling URL. Use `mixfont.generations.wait(...)` for built-in polling, or call `mixfont.generations.get(...)` yourself until the status reaches `succeeded`, `failed`, or `cancelled`. When a job succeeds, `ttfUrl` contains the generated TTF download URL.

## Model inputs and outputs

Use text generation when you can describe the type direction, such as category, style, use case, spacing, contrast, or distinctive details. Use image generation when a visual reference is the clearest source of truth, such as a sketch, sign, logo, poster, screenshot, or existing design mockup.

Reference images should be publicly reachable HTTPS URLs that point to JPEG, PNG, or WebP files up to 20 MB. Clear images with readable letterforms, strong contrast, clean edges, and cropped text regions generally produce better results.

Generated font files are returned as TTFs. Download or persist the returned `ttfUrl` after the job succeeds, then rehost the file in your own storage before using it in production. Returned TTF URLs are temporary and will be deleted within 24 hours.

## Installation

Install it from npm:

```sh
npm install mixfont
```

## Usage

Import the package:

```ts
import { Mixfont } from "mixfont";
```

Instantiate the client:

```ts
const mixfont = new Mixfont({
  apiKey: process.env.MIXFONT_API_KEY!,
});
```

Create a font generation:

```ts
const generation = await mixfont.generations.create({
  prompt: "A condensed sci-fi display font",
  glyphSet: "standard",
});

console.log(generation.id);
```

Fetch the generation later:

```ts
const generation = await mixfont.generations.get("generation_id");

console.log(generation.status, generation.progressPercent);
```

Or wait for the generation to finish:

```ts
const result = await mixfont.generations.wait(generation.id);

console.log(result.ttfUrl);
```

Create a generation from a reference image:

```ts
const generation = await mixfont.generations.create({
  imageUrl: "https://example.com/reference.png",
});
```

## TypeScript

This package includes TypeScript definitions.

```ts
import { Mixfont, type Generation, type GenerationGlyphSet } from "mixfont";
```

## API

### Constructor

```ts
const mixfont = new Mixfont(options);
```

| Option      | Type       | Description                                                    |
| ----------- | ---------- | -------------------------------------------------------------- |
| `apiKey`    | `string`   | Required. Mixfont API key.                                     |

### `mixfont.generations.create(options)`

Starts a new font generation and returns immediately.

| Option     | Type                       | Description                                   |
| ---------- | -------------------------- | --------------------------------------------- |
| `prompt`   | `string`                   | Text prompt for the generated font.           |
| `imageUrl` | `string`                   | Public HTTPS URL for a JPEG, PNG, or WebP reference image up to 20 MB. |
| `glyphSet` | `"standard" \| "extended"` | Optional glyph set. Defaults to `standard`.   |

Provide exactly one of `prompt` or `imageUrl`.

### Glyph sets

| Glyph set  | Best for                                               | Glyphs | Typical timing |
| ---------- | ------------------------------------------------------ | ------ | -------------- |
| `standard` | English concepting, prototypes, headings, and logos    | 72     | Around 25 seconds on average |
| `extended` | Production candidates for Latin-language text beyond English | 319 | 2-3 minutes |

`standard` includes English letters, numbers, and basic punctuation. `extended` supports all Latin languages, including special characters, and costs more API credits.

### `mixfont.generations.get(id)`

Fetches the current status of a generation.

### `mixfont.generations.wait(id, options)`

Checks the generation until it reaches a terminal status.

| Option       | Type          | Description                              |
| ------------ | ------------- | ---------------------------------------- |
| `intervalMs` | `number`      | Polling interval. Defaults to `5000`.    |
| `timeoutMs`  | `number`      | Maximum wait time. Defaults to `600000`. |
| `signal`     | `AbortSignal` | Optional abort signal.                   |

`wait` returns the completed generation when it succeeds. It throws if the
generation fails, is cancelled, or times out.

## Best practices

- Write specific prompts that describe the type category, visual style, intended use case, and distinctive details.
- Start with `standard` when comparing directions, then use `extended` once you have a candidate worth testing more deeply.
- Store the generation `id`, original prompt or image URL, and `glyphSet` with each result so your team can compare outputs later.
- Test generated fonts in real content, including headings, numbers, punctuation, labels, and the longest strings your product needs to support.
- Keep your API key on the server and read it from an environment variable such as `MIXFONT_API_KEY`.

## Development

```sh
npm install
npm test
```

## Publishing

See [PUBLISHING.md](./PUBLISHING.md).
