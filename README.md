# update-trend-agents

Daily news digest, updated automatically by a scheduled Claude Code cloud agent.

Every day at 07:00 (Asia/Bangkok, 00:00 UTC) the agent searches the web and commits a digest to `news/YYYY-MM-DD.md` covering:

- Crypto & markets
- AI & tech trends
- World & international news
- Thailand news

## Viewing the digests

A simple static viewer (`index.html`) lets you browse digests day by day and view any topic across all days. It reads the `news/*.md` files directly, so serve the repo root over HTTP (fetching local files needs a server, not a `file://` URL):

```
python -m http.server 8000
```

Then open http://localhost:8000/ in a browser.

## Latest digests

_(updated automatically by the daily agent)_