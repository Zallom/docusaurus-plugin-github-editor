import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  outDir: 'lib',
  dts: true,
  clean: true,
  external: [
    '@docusaurus/types',
    '@docusaurus/utils-validation',
  ],
});
