# nominmaxable

Small static site that reads a public JSON listing of parkrun events, caches it in your browser for seven days, and reports the **longest** and **shortest** full event names (by JavaScript string length after trimming) **per event series** and **per country**, plus **global** extremes within each series. Tables include **character count** columns next to each full event name list (one count per cell; tied names share the same length). **Column headers** are **buttons**: click or press **Enter** / **Space** to sort **ascending** first; activate the **same** column again to **reverse** order. **`aria-sort`** reflects the active column for assistive tech.

Deployed at [johnsy.com/nominmaxable](https://www.johnsy.com/nominmaxable/).

**SEO and sharing:** [`src/index.html`](./src/index.html) includes canonical URL, keyword meta, **Open Graph** and **Twitter Card** tags, plus JSON-LD for a **WebApplication** and **BreadcrumbList**. The social preview image lives at [`src/public/nominmaxable-social-preview.png`](./src/public/nominmaxable-social-preview.png) (1200×630); Vite copies `src/public/` into the build root so it is served as `/nominmaxable/nominmaxable-social-preview.png` on the live site. When on-screen copy changes, replace that PNG with a fresh viewport capture from `pnpm build` then `pnpm preview` (open `/nominmaxable/`, scroll to top); if the capture is not exactly 1200×630, letterbox to that size (for example `magick in.png -resize 1200x -background '#f5f5f5' -gravity center -extent 1200x630 out.png`).

The **header** and **footer** match [Eventuate](https://www.johnsy.com/eventuate/) (full-width aubergine bars, breadcrumb pill, centred footer links in apricot). **Atkinson Hyperlegible** is loaded from the same **johnsy.com** font assets as Eventuate. The main block uses Eventuate’s **white card** (`#page` / `#content`) pattern for the interactive area and tables. On narrow viewports, wide tables sit in **horizontally scrollable** regions (keyboard-focusable), with **larger sort-button tap targets**, **16px table text**, and **wrapped** long names so cells stay readable.

## Requirements

- [mise](https://mise.jdx.dev/) with the versions in [`.tool-versions`](./.tool-versions) (run `mise install` in this directory)
- [pnpm](https://pnpm.io/) (see `packageManager` in `package.json`; mise provides the matching version). Husky’s pre-commit hook runs `mise exec -- pnpm run precommit` when `mise` is available.

## Scripts

| Script            | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `pnpm dev`        | Local development server                 |
| `pnpm build`      | Production build to `dist/`              |
| `pnpm preview`    | Preview the production build             |
| `pnpm test:run`   | Unit tests (Vitest, Node environment)    |
| `pnpm lint`       | ESLint                                   |
| `pnpm typecheck`  | TypeScript `--noEmit`                    |
| `pnpm format`     | Prettier write                           |
| `pnpm format:check` | Prettier check                        |
| `pnpm precommit`  | Format check, lint, typecheck, build, tests |

## CI/CD

[GitHub Actions](.github/workflows/ci-cd.yml) runs on every **push** (any branch) and on **pull requests**:

1. Installs **Node** and **pnpm** via [mise](https://mise.jdx.dev/) using [`.tool-versions`](./.tool-versions) (same as local development).
2. Runs **`pnpm install --frozen-lockfile`** with **`HUSKY=0`** so Husky does not run in CI.
3. Runs **`pnpm run precommit`** (Prettier check, ESLint, TypeScript, production build, Vitest).

On **push** to `main` only, the workflow also **deploys** the `dist/` artefact to **GitHub Pages** (configure the repository: **Settings → Pages → Build and deployment → GitHub Actions**). The site is built with `base: '/nominmaxable/'`, which matches a project published at `https://<user>.github.io/nominmaxable/` when the repository name is `nominmaxable`. If you only publish to **johnsy.com**, you can ignore GitHub Pages or remove the `deploy` job.

[Dependabot](.github/dependabot.yml) opens weekly PRs for **npm** and **GitHub Actions** updates.

## Data and caching

- The fetch URL is configured in [`src/constants.ts`](./src/constants.ts) (not repeated in user-facing copy).
- Cached under the key `parkrun.nominmaxable.events` with a versioned wrapper `{ v, fetchedAt, body }` where `body` is the raw response text (stored in **`localStorage`** for this origin).
- If **`localStorage`** hits the browser’s **per-origin quota**, `setItem` throws a `QuotaExceededError` (message is often “The quota has been exceeded.”). The app still **shows the freshly downloaded data** and explains in the status line that a local copy could not be saved.
- If the cache is older than seven days, the app fetches again on load. If a refresh fails but a previous payload exists, stale data is shown with a warning.
- If there is no usable cache and a fetch fails, the error banner shows a short **Details** line when available (for example **HTTP status** text from the server or the browser’s **network error** message). The same pattern applies when cached or downloaded data **cannot be parsed**.

## Licence

MIT. Not affiliated with parkrun Limited.
