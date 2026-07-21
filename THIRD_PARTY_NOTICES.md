# Third-party notices

Verified against the release-candidate lockfile on 2026-07-21 by
`bun run licenses:check`. Transitive dependencies remain covered by their
package license files.

## Direct dependencies

| Component | Installed version | Purpose | License |
|---|---|---|---|
| React / React DOM | 19.2.7 | Application UI | MIT |
| Vite / React plugin | 8.1.5 / 6.0.3 | Build tooling | MIT |
| Cloudflare Vite plugin / Wrangler | 1.45.1 / 4.112.0 | Workers development and deployment | MIT / MIT OR Apache-2.0 |
| Acorn / acorn-walk | 8.17.0 / 8.3.5 | JavaScript parsing and AST traversal | MIT |
| PixiJS | 8.19.0 | Replaceable 2D rendering adapter | MIT |
| OpenAI JavaScript SDK | 6.48.0 | Responses API integration | Apache-2.0 |
| Zod | 4.4.3 | Boundary validation | MIT |
| Vitest / Workers pool | 4.1.10 / 0.18.6 | Unit and Worker integration tests | MIT |
| Playwright | 1.61.1 | Browser E2E tests | Apache-2.0 |
| TypeScript / typescript-eslint / ESLint | 5.9.3 / 8.65.0 / 10.7.0 | Static analysis | Apache-2.0 / MIT / MIT |
| Prettier | 3.9.5 | Formatting | MIT |

## Asset provenance

- `Shifting Vaults` game design, names, rule text, and source cells are original
  to this project.
- The shipped tabletop visuals are original code-rendered vector primitives in
  `src/render` and `src/geometry`; no external image, font, music, or commercial
  tabletop asset is included.
- Static AI-generated art was cut before release, so no generated-art claim or
  asset provenance manifest is applicable.
- Do not use commercial tabletop game art, logos, names, copied rules text,
  music, fonts, or screenshots.

## Release check

Before tagging the submission:

1. run `bun run licenses:check`;
2. compare this file with all production and development dependencies;
3. include every required copyright or attribution notice;
4. verify that repository and video assets have documented provenance.
