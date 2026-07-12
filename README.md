# update-trend-agents

News digest, updated automatically by a scheduled Claude Code cloud agent.

Every 5 hours — at 00:00, 05:00, 10:00, 15:00, and 20:00 (Asia/Bangkok) — the agent searches the web for recent news covering:

- Crypto & markets
- AI & tech trends
- World & international news
- Thailand news

The 20:00 run writes the day's canonical digest to `news/YYYY-MM-DD.md`. The other four runs write intraday snapshots to `news/YYYY-MM-DD-HH.md` (e.g. `news/2026-07-12-05.md`), which the viewer below picks up automatically as a time selector on days that have them.

## Viewing the digests

A simple static viewer (`index.html`) lets you browse digests day by day and view any topic across all days. It reads the `news/*.md` files directly, so serve the repo root over HTTP (fetching local files needs a server, not a `file://` URL):

```
python -m http.server 8000
```

Then open http://localhost:8000/ in a browser.

## Latest digests

- [2026-07-12](news/2026-07-12.md)
- [2026-07-11](news/2026-07-11.md)
