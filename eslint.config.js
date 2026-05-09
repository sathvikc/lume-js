import sonarjs from 'eslint-plugin-sonarjs';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'gh-pages/**', 'scripts/**'],
  },
  {
    files: ['src/**/*.js'],
    plugins: { sonarjs: sonarjs },
    rules: {
      'sonarjs/cognitive-complexity': ['error', 15],
    },
  },
];
