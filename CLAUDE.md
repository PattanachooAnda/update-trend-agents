# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A daily news digest, written automatically by a scheduled Claude Code cloud routine — there is no application code to build or test.

- **Routine:** "Daily News Digest" (ID `trig_018qyPgVy9Roy4BCrbDY8QpY`), runs daily at 00:00 UTC (07:00 Asia/Bangkok). Manage it at https://claude.ai/code/routines
- **What each run does:** web-searches the day's news (Crypto & Markets, AI & Tech, World, Thailand), writes `news/YYYY-MM-DD.md` (Bangkok date), refreshes the "Latest digests" list in `README.md`, and commits directly to `main`.

## Working locally

The cloud agent pushes to `main` every day — always `git pull` before committing from this machine. Changes to the digest format or topics should be made by updating the routine's prompt (via `/schedule` or claude.ai/code/routines), not by editing generated files in `news/`.
