# Fork changes / 分支改动说明

Date: 2026-11-26. This is a community fork, not a new upstream release.

## Origin and attribution

- Upstream: [ohmyjiro/social-memory](https://github.com/ohmyjiro/social-memory), created by **ohmyjiro**.
- Community fork: [tanikakearney25-byte/social-memory-ch](https://github.com/tanikakearney25-byte/social-memory-ch).
- The original project provides the core architecture, CLI, database, extension and read-only MCP interface. This fork adds the changes listed below.
- These are AI-assisted modifications developed and tested during local use. They have not been reviewed or endorsed by the upstream maintainer.
- The original [PolyForm Perimeter License 1.0.1 and required copyright notice](LICENSE.md) remain unchanged. This fork is not relicensed. The license restricts competing products, including some free offerings; retaining attribution alone does not remove that restriction.

## Changes

### Threads page compatibility

Recognize simplified/traditional Chinese profile navigation and SVG accessibility labels. Parse DIV-based post cards with boundaries intended to avoid combining adjacent posts. Recognize responsive collection layouts using the exact collection route, authenticated profile navigation and dated posts when headings are absent. Account mismatch checks remain in place.

### Collection controls and pagination

Choose 3, 10, 50, 100 or 500 posts per selected capture type, enter a positive custom count, or choose unlimited. Counts include updates to already archived posts, rather than only new database rows.

Unlimited removes the former numeric and scroll-round ceilings. Posts are saved in batches of at most 25. Progress and cancellation are available from the popup. The job can continue after the popup closes, but the collection tab must stay visible and Chrome must remain running.

Automatic pagination handles nested/offscreen scrollers, retries delayed loading, restores unexpected scroll position resets and avoids treating a long sequence of duplicate posts as a stalled scroll. A visible saved-list copyright/terms/privacy/cookie footer at the bottom can end saved-post collection after the current posts are persisted. Reposts retain the repeated-no-new-content end heuristic.

Likes, saves and reposts remain distinct selections. Likes and daily collection remain optional; changing interface language does not enable either.

### Interface languages

Browser default, simplified Chinese, traditional Chinese, English, Korean and Japanese. The preference is remembered in extension-local storage. Static labels, progress, completion messages and common errors are translated. Original archived post text is not translated; unknown technical errors may remain in their original language.

## Validation

- 34 focused tests passed locally, including isolated installed-Chrome tests enabled with `SOCIAL_MEMORY_CHROME_TEST=1`.
- Coverage includes delayed pagination without manual scrolling, offscreen scroller rejection, position recovery, adjacent-post isolation, footer visibility, bounded batches, cancellation, account mismatch protection and language switching/persistence.
- Live Threads collection was verified locally for saves and reposts. Real overlapping posts retained both capture kinds without duplicate source rows. This is evidence from one local run, not a guarantee of future platform availability or complete history.
- The earlier full upstream Windows test run had 16 failures in areas including scaffolding, filesystem permissions/symlinks, host installation, packaging and scheduling. The full suite is not claimed to pass on Windows.

## Known limitations

- The repository's Windows Native Messaging installer remains unsupported. The separate machine-specific bridge used during local verification is not included here. Do not treat the local live check as proof of out-of-the-box Windows installation.
- Chrome must be running, and the collection tab must remain visible. A hidden tab waits for visibility.
- Unlimited means no configured count ceiling. Threads may hide, omit, delete or fail to load historical posts; footer/no-new-content detection is not proof of full coverage.
- No cross-run scroll cursor is implemented for the extension. Restarting rescans from the beginning and uses database deduplication. Previously saved batches survive interruption.
- A login challenge, access limit, persistent loading or parsing failure can pause collection. Already saved batches remain available.
- Browser collection does not download all image/video files. The extension host currently persists text evidence; do not assume extracted media URLs are durably archived.
- Original post timestamps and collection timestamps differ from the time the user liked, saved or reposted a post. The latter may be unavailable.
- This fork does not add semantic search, a hosted service or a Chrome Web Store release.
- Do not publish account data, browser profiles, cookies, tokens, private databases, local diagnostics or archive exports.

## Contributing back

Compatibility fixes, pagination/collection controls and interface translations can be proposed as separate upstream PRs. An issue or PR in this fork does not constitute upstream acceptance. Please follow the upstream [contribution guide](CONTRIBUTING.md), keep tests fictional, and state unverified boundaries honestly.
