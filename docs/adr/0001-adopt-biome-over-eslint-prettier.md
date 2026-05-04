# Adopt Biome over ESLint + Prettier

We adopted [Biome](https://biomejs.dev) 2.x as the single linter + formatter for the whole monorepo instead of the conventional ESLint + Prettier pair. Biome is one fast Rust binary covering linting, formatting, and import organization with near-zero config drift, which suits a small 4-workspace repo that previously had no linting at all.

The trade-off: Biome does not have full parity with `eslint-plugin-next`/`eslint-plugin-react-hooks`, so a few Next.js-specific lint rules are unavailable. We accept this because Biome's `react` and `next` lint domains (scoped to `apps/web` via overrides) cover the high-value rules, and the speed/simplicity gain outweighs the missing long-tail rules. If Next.js-specific coverage becomes important, ESLint can be added back alongside Biome for `apps/web` only.
