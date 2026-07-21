# Third-party notices

This file must be updated from the installed lockfile before release. Do not
assume that this design-time list is complete.

## Planned direct dependencies

| Component | Purpose | Expected license | Verification required |
|---|---|---|---|
| React / React DOM | Application UI | MIT | Confirm installed package metadata |
| Vite | Build tooling | MIT | Confirm installed package metadata |
| Cloudflare Vite plugin / Wrangler | Workers development and deployment | Apache-2.0 or package-specific | Confirm exact installed packages |
| Acorn / acorn-walk | JavaScript parsing and AST traversal | MIT | Confirm installed package metadata |
| PixiJS | Replaceable 2D rendering adapter | MIT | Confirm installed package metadata |
| OpenAI JavaScript SDK | Responses API integration | Apache-2.0 | Confirm installed package metadata |
| Zod, if retained | Boundary validation | MIT | Remove if not needed; confirm metadata |
| Vitest | Unit and integration tests | MIT | Confirm installed package metadata |
| `@cloudflare/vitest-pool-workers` | Tests in Workers runtime | package-specific | Confirm metadata |
| Playwright | Browser E2E tests | Apache-2.0 | Confirm installed package metadata |

## Asset provenance

- `Shifting Vaults` game design, names, rule text, and source cells must be
  original to this project.
- AI-generated sample art must be generated specifically for this project and
  recorded with prompt/date/model provenance in
  `docs/08-SUBMISSION-EVIDENCE.md` or an asset manifest.
- Primitive fallback art must be original SVG/canvas work or permissively
  licensed with attribution here.
- Do not use commercial tabletop game art, logos, names, copied rules text,
  music, fonts, or screenshots.

## Release check

Before tagging the submission:

1. run `bun run licenses:check`;
2. compare this file with all production and development dependencies;
3. include every required copyright or attribution notice;
4. verify that repository and video assets have documented provenance.
