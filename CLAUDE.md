# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A news digest, written automatically by a scheduled Claude Code cloud routine — there is no application code to build or test.

- **Routine:** "Daily News Digest" (ID `trig_018qyPgVy9Roy4BCrbDY8QpY`), runs every 5 hours at 00:00, 05:00, 10:00, 15:00, and 20:00 Asia/Bangkok (`0 3,8,13,17,22 * * *` UTC). Manage it at https://claude.ai/code/routines
- **What each run does:** web-searches news from roughly the last 5 hours (Crypto & Markets, AI & Tech, World, Thailand). The 20:00 run writes the canonical `news/YYYY-MM-DD.md` (Bangkok date), refreshes the "Latest digests" list in `README.md`, and commits as `Daily news digest DATE`. The 00:00/05:00/10:00/15:00 runs write intraday snapshots to `news/YYYY-MM-DD-HH.md` instead (never touching the daily file or README) and commit as `Intraday news digest DATE HOUR:00`. Both commit directly to `main`.

## Working locally

The cloud agent pushes to `main` every day — always `git pull` before committing from this machine. Changes to the digest format or topics should be made by updating the routine's prompt (via `/schedule` or claude.ai/code/routines), not by editing generated files in `news/`.
