import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  // When OpenNext runs `next build` internally, it does so via
  // `config.buildCommand ?? \`${packager} run build\``. That would
  // recurse into our `build` script (which itself calls
  // `npx @opennextjs/cloudflare build`). To break the recursion we
  // point OpenNext at a *different* npm script (`build:next`) that
  // only runs `next build` and does not invoke OpenNext.
  buildCommand: "npm run build:next",
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "direct",
    },
  },
  edgeExternals: ["node:crypto", "node:fs"],
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "direct",
    },
  },
} as OpenNextConfig;

export default config;
