# Deployment

The application ships as static files. Collaboration is optional; without `VITE_WS_URL`, it uses the inherited local collaboration mode and every integrity workflow remains usable.

## GitHub Pages

The `deploy-pages.yml` workflow builds `dist/` and publishes it on pushes to `main` or by manual dispatch. Repository Pages must use **GitHub Actions** as its source. The expected project URL is:

`https://shiv-aurora.github.io/openai-webmcp-challenge/`

## Other static hosts

```bash
npm ci
npm run build
```

Publish the `dist/` directory. The Vite base is relative, so project-subpath hosting is supported. Do not expose the Vite development server publicly.

For remote real-time collaboration, build with `VITE_WS_URL` set to a separately hosted secure WebSocket endpoint. Provenance itself remains browser-local in this release.
