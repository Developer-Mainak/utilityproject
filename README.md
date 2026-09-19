# NotJustPDF

A frontend-only developer utility app for browser-based PDF, image, text, JSON, and XML workflows. It is designed to run entirely in the browser and be published on GitHub Pages with no backend.

## Included tools

- Base64 encode and decode
- PDF compression and image-to-PDF generation
- Image resizing and export
- JSON validation, formatting, and minifying
- XML validation and formatting
- Text utilities (uppercase, lowercase, title case, clean spaces)
- URL encoding and decoding
- UUID generation
- Color conversion
- Unix timestamp conversion
- Dark and light theme support

## Run locally

Use Vite for local development:

```bash
npm install
npm run dev
```

Then open the local Vite URL in your browser.

## Production build

```bash
npm run build
```

This generates a static `dist` folder ready for GitHub Pages hosting.

## Deploy to GitHub Pages

1. Push the project to a GitHub repository.
2. Ensure the repository has GitHub Pages enabled.
3. Use the included GitHub Actions workflow in `.github/workflows/github-pages.yml`.
4. Merge or push to the `develop` branch to trigger automatic deployment.

This app is intentionally frontend-only, so there are no server APIs or backend dependencies required for deployment.

## Deployment verification

This project was redeployed on 2026-09-19 to confirm the GitHub Pages workflow is publishing the latest build correctly.
