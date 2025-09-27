import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: './index.ts',
    schemas: './schemas.ts',
    contracts: './contracts.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ['@ts-rest/core', 'zod'],
  esbuildOptions(options: any) {
    options.banner = {
      js: '"use client";',
    };
  },
});
