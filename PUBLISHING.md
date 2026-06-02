# Publishing

The npm package name is `mixfont`.

Before publishing:

```sh
npm install
npm test
npm pack --dry-run
```

Publish:

```sh
npm login
npm version patch
npm publish
```

Use `minor` or `major` instead of `patch` when the public API changes require
it. npm versions are immutable, so a published version cannot be reused.

For automated releases later, configure npm trusted publishing from GitHub
Actions instead of storing a long-lived npm token.
