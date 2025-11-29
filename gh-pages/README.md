# Lume.js Website (GitHub Pages)

This folder contains a static site for Lume.js, served by GitHub Pages.

## Deploy

- The workflow `.github/workflows/gh-pages.yml` publishes this folder to Pages when pushing to the branch `ai/feature-website-gh-pages` or via manual dispatch.
- No build step is required; Tailwind is loaded via CDN and Lume.js is loaded from npm CDN.

## Local Dev

```zsh
nvm use
npm run dev
# Open http://localhost:5173/.gh-pages/index.html (or the shown port)
```

## Notes

- The site demonstrates Lume.js in the hero and lists interactive examples from `/examples/`.
- A version selector allows switching the CDN version for Lume.js. This only affects CDN imports on the page and link parameters, not the local examples content.
