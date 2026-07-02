import eslint from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfig(
  globalIgnores([
    '**/.*',
    '**/node_modules/*',
    'dist/*',

    // Ignore files for PNPM, NPM and YARN
    '**/pnpm-lock.yaml',
    '**/package-lock.json',
    '**/yarn.lock',

    // Ignore config type check
    '**/*.config.js',
    '**/*.config.ts',
  ]),
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }
)
