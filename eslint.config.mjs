import obsidianmd from 'eslint-plugin-obsidianmd';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'docs/**',
    ],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        $derived: 'readonly',
        $effect: 'readonly',
        $props: 'readonly',
        $state: 'readonly',
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
