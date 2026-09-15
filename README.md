# nominmaxable

Reports the longest and shortest parkrun full event names by series and country.

[![CI/CD](https://github.com/johnsyweb/nominmaxable/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/johnsyweb/nominmaxable/actions/workflows/ci-cd.yml)

Volunteer-facing utility: it reads a public JSON listing of parkrun events, caches it in the browser for seven days, and shows length extremes (character count after trimming) per event series, per country, and globally. Tables are keyboard-sortable; the UI follows the same aubergine/apricot look as [Eventuate](https://www.johnsy.com/eventuate/).

## Getting started

Use the live app at [johnsy.com/nominmaxable](https://www.johnsy.com/nominmaxable/). Open the page, wait for the tables to load, then sort columns with the header buttons (Enter or Space).

## Help

Open an [issue](https://github.com/johnsyweb/nominmaxable/issues) on GitHub.

## Maintainers

[Pete Johns](https://www.johnsy.com/) ([@johnsyweb](https://github.com/johnsyweb)). Contributions from parkrun volunteers are welcome. Not affiliated with parkrun Limited.

## Development status

Maintained. Version **1.0.0** (`package.json`).

## Local development

Requires [mise](https://mise.jdx.dev/) (see [`.tool-versions`](./.tool-versions)) and [pnpm](https://pnpm.io/) (see `packageManager` in `package.json`).

```bash
mise install
pnpm install
pnpm exec playwright install chromium   # once, for screenshots only
pnpm dev
```

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Local development server |
| `pnpm build` | Production build to `dist/` and stamp `sitemap.xml` |
| `pnpm preview` | Preview the production build |
| `pnpm test:run` | Unit tests (Vitest) |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | Quality tools |
| `pnpm precommit` | Format check, lint, typecheck, build, tests |
| `pnpm screenshots` | Regenerate [`src/public/nominmaxable-social-preview.png`](./src/public/nominmaxable-social-preview.png) |

Husky runs `mise exec -- pnpm run precommit` on commit when mise is available. Set `HUSKY=0` in CI.

**Data:** the fetch URL lives in [`src/constants.ts`](./src/constants.ts). The payload is stored in `localStorage` under `parkrun.nominmaxable.events` as `{ v, fetchedAt, body }` for seven days. Quota failures still show freshly downloaded data with a status note; failed refresh with an older cache shows a stale warning; load/parse failures may include a **Details** line.

**SEO:** [`src/index.html`](./src/index.html) carries canonical, Open Graph, Twitter Card, and JSON-LD tags. The social image is 1200×630 at `src/public/nominmaxable-social-preview.png` (refreshed via `pnpm screenshots`).

## Contributing

Use [Conventional Commits](https://www.conventionalcommits.org/). Keep changes small and atomic. Pre-commit must pass format, lint, typecheck, build, and tests.

## Releasing

[CI/CD](.github/workflows/ci-cd.yml) runs on every push, every pull request, and on a schedule (**06:00 UTC Tuesdays**), plus `workflow_dispatch`. It installs with mise, runs `pnpm install --frozen-lockfile` (`HUSKY=0`), then `pnpm run precommit`.

On **push** to `main` and on the scheduled run, `dist/` deploys to **GitHub Pages** (`base: '/nominmaxable/'`). The build rewrites `sitemap.xml` `<lastmod>` to the build date. The primary site is [johnsy.com/nominmaxable](https://www.johnsy.com/nominmaxable/); GitHub Pages is optional if you only publish there.

[Dependabot](.github/dependabot.yml) opens weekly (Monday) grouped minor/patch PRs for npm and GitHub Actions (`deps` / `deps-dev` / `ci` prefixes). Majors stay ungrouped. [Auto-merge](.github/workflows/dependabot-auto-merge.yml) merges Dependabot PRs after checks pass.
