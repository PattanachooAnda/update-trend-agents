# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A news digest, written automatically by a scheduled Claude Code cloud routine — there is no application code to build or test.

- **Routine:** "Daily News Digest" (ID `trig_018qyPgVy9Roy4BCrbDY8QpY`), runs every 5 hours at 00:00, 05:00, 10:00, 15:00, and 20:00 Asia/Bangkok (`0 3,8,13,17,22 * * *` UTC). Manage it at https://claude.ai/code/routines
- **What each run does:** web-searches the day's news (Crypto & Markets, AI & Tech, World, Thailand), writes/overwrites `news/YYYY-MM-DD.md` (Bangkok date, so all 5 runs in a day refresh the same file), refreshes the "Latest digests" list in `README.md`, and commits directly to `main`.

## Working locally

The cloud agent pushes to `main` every day — always `git pull` before committing from this machine. Changes to the digest format or topics should be made by updating the routine's prompt (via `/schedule` or claude.ai/code/routines), not by editing generated files in `news/`.
