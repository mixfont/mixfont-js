<img src="./assets/mixfont-banner.webp" alt="Mixfont banner" width="1280" />

# Mixfont JavaScript client

A JavaScript client for the [Mixfont](https://www.mixfont.com) API. This open-source client lets you create AI-generated font files from Node.js and server-side JavaScript. Mixfont is a frontier AI font-generation model that allows users to create custom fonts in seconds. For more information, see the [Mixfont website](https://www.mixfont.com) and the [API documentation](https://www.mixfont.com/docs).

## Supported platforms

- Node.js >= 18
- Serverless runtimes including Vercel Functions, Cloudflare Workers, and AWS Lambda.

> Note: This client is not designed for in-browser usage.

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

console.log(result.fonts[0].url);
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
| `baseUrl`   | `string`   | Optional. Defaults to `https://api.mixfont.com/v1`.            |
| `fetch`     | `function` | Optional fetch implementation. Defaults to `globalThis.fetch`. |
| `userAgent` | `string`   | Optional user agent for requests.                              |

### `mixfont.generations.create(options)`

Starts a new font generation and returns immediately.

| Option     | Type                       | Description                                   |
| ---------- | -------------------------- | --------------------------------------------- |
| `prompt`   | `string`                   | Text prompt for the generated font.           |
| `imageUrl` | `string`                   | Public URL for a reference image.             |
| `glyphSet` | `"standard" \| "extended"` | Optional glyph set.                           |
| `fontName` | `string`                   | Optional display name for the generated font. |

Provide exactly one of `prompt` or `imageUrl`.

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

## Development

```sh
npm install
npm test
```

## Publishing

See [PUBLISHING.md](./PUBLISHING.md).
