import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// DK_ONLY=d3 builds a single design in isolation: every other design is swapped
// for a stub, and output/caches go to their own folders. This lets several
// designs be built and checked at the same time without stepping on each other.
const only = process.env.DK_ONLY;
const stubPage = fileURLToPath(
  new URL("./src/designs/_stub/Page.astro", import.meta.url),
);
const stubMeta = fileURLToPath(
  new URL("./src/designs/_stub/meta.ts", import.meta.url),
);

const onlyDesign = () => ({
  name: "dk-only-design",
  enforce: "pre",
  resolveId(source) {
    if (!only) return null;
    const match = source.match(/designs\/(d\d)\/(Page\.astro|meta\.ts)$/);
    if (!match || match[1] === only) return null;
    return match[2] === "meta.ts" ? stubMeta : stubPage;
  },
});

export default defineConfig({
  site: "https://brofrong.github.io",
  base: "/dima-karpo-lp",
  trailingSlash: "always",
  outDir: only ? `./dist-variants/${only}` : "./dist",
  cacheDir: only ? `./node_modules/.astro-${only}` : "./node_modules/.astro",
  devToolbar: { enabled: false },
  vite: {
    cacheDir: only ? `./node_modules/.vite-${only}` : "./node_modules/.vite",
    plugins: [onlyDesign(), tailwindcss()],
  },
});
