![Mixfont banner](https://static.mixfont.com/assets/20260602-231020-mixfont-banner-0mxabywo.webp)

# Mixfont JavaScript SDK

Official JavaScript client for the Mixfont API.

## Install

```sh
npm install mixfont
```

Requires Node.js 18 or newer.

Use this SDK from server-side code. Do not expose your Mixfont API key in
browser JavaScript.

## Usage

```ts
import { Mixfont } from "mixfont";

const mixfont = new Mixfont({
  apiKey: process.env.MIXFONT_API_KEY!,
});

const generation = await mixfont.generations.create({
  prompt: "A condensed sci-fi display font",
  glyphSet: "standard",
});

const result = await mixfont.generations.wait(generation.id);

console.log(result.fonts[0].url);
```

## Image input

```ts
const generation = await mixfont.generations.create({
  imageUrl: "https://example.com/reference.png",
});
```

## API

### `mixfont.generations.create(options)`

Starts a new font generation and returns immediately.

Options:

- `prompt`: Text prompt for the generated font.
- `imageUrl`: Public URL for a reference image.
- `glyphSet`: Optional. `"standard"` or `"extended"`.
- `fontName`: Optional display name for the generated font.

Provide exactly one of `prompt` or `imageUrl`.

### `mixfont.generations.get(id)`

Fetches the current status of a generation.

### `mixfont.generations.wait(id, options)`

Checks the generation until it reaches a terminal status.

Options:

- `intervalMs`: Polling interval. Defaults to `5000`.
- `timeoutMs`: Maximum wait time. Defaults to `600000`.
- `signal`: Optional `AbortSignal`.

`wait` returns the completed generation when it succeeds. It throws if the
generation fails, is cancelled, or times out.

## Development

```sh
npm install
npm test
```

## Publishing

```sh
npm version patch
npm publish
```
