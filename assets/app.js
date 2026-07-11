(() => {
  const PROBE_DAYS = 45; // how many calendar days back to look for digest files (each date now costs up to 5 fetches)
  const SNAPSHOT_HOURS = ["00", "05", "10", "15", "20"]; // intraday run times (Bangkok)

  const dateSelect = document.getElementById("dateSelect");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const topicBar = document.getElementById("topicBar");
  const timeBar = document.getElementById("timeBar");
  const content = document.getElementById("content");

  /** @type {string[]} descending, e.g. ["2026-07-11", "2026-07-10"] */
  let availableDates = [];
  /** date -> { sections: Map<string, string[]> } (values are raw bullet lines) — the final/latest digest for that date */
  const parsedByDate = new Map();
  /** date -> Map<hour, { sections }> — intraday snapshots, only present for dates that have them */
  const snapshotsByDate = new Map();
  let currentIndex = 0;
  let currentTopic = "All";
  let aggregateMode = false;
  /** @type {string|null} selected snapshot hour (e.g. "10"), or null to show the latest/daily content */
  let currentHour = null;

  function toDateStr(d) {
    return d.toISOString().slice(0, 10);
  }

  async function fetchDigestText(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  /** Discovers both final daily files (news/DATE.md) and intraday snapshot files
   *  (news/DATE-HH.md) for each candidate date. A date is "available" if EITHER
   *  exists — a day in progress (only a 00:00 snapshot so far, no final file yet)
   *  must still show up, not just fully-finished days. */
  async function probeDates() {
    parsedByDate.clear();
    snapshotsByDate.clear();
    const today = new Date();
    const checks = [];
    // Start one day ahead of the browser's UTC "today": digest filenames use the
    // Bangkok (UTC+7) calendar date, which can already be a day ahead of UTC.
    for (let i = -1; i < PROBE_DAYS; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      checks.push(toDateStr(d));
    }

    const earlierHours = SNAPSHOT_HOURS.slice(0, -1);
    const lastHour = SNAPSHOT_HOURS[SNAPSHOT_HOURS.length - 1];

    await Promise.all(
      checks.map(async (dateStr) => {
        const [dailyText, ...hourTexts] = await Promise.all([
          fetchDigestText(`news/${dateStr}.md`),
          ...earlierHours.map((hh) => fetchDigestText(`news/${dateStr}-${hh}.md`)),
        ]);

        if (dailyText !== null) {
          parsedByDate.set(dateStr, parseDigest(dailyText));
        }

        const hourMap = new Map();
        earlierHours.forEach((hh, i) => {
          if (hourTexts[i] !== null) hourMap.set(hh, parseDigest(hourTexts[i]));
        });
        // Only worth a time bar if at least one real intraday snapshot exists —
        // otherwise a date with just the final file would get a spurious single chip.
        if (hourMap.size > 0) {
          if (dailyText !== null) hourMap.set(lastHour, parseDigest(dailyText));
          snapshotsByDate.set(dateStr, hourMap);
        }
      })
    );

    availableDates = checks.filter((d) => parsedByDate.has(d) || snapshotsByDate.has(d));
  }

  /** The most complete content available for a date: the final daily file if it
   *  exists, otherwise the latest intraday snapshot found so far. */
  function latestSections(dateStr) {
    const daily = parsedByDate.get(dateStr);
    if (daily) return daily.sections;
    const snapshots = snapshotsByDate.get(dateStr);
    if (snapshots && snapshots.size > 0) {
      const latestHour = SNAPSHOT_HOURS.filter((hh) => snapshots.has(hh)).pop();
      return snapshots.get(latestHour).sections;
    }
    return new Map();
  }

  function activeSections(dateStr) {
    const snapshots = snapshotsByDate.get(dateStr);
    if (currentHour && snapshots && snapshots.has(currentHour)) {
      return snapshots.get(currentHour).sections;
    }
    return latestSections(dateStr);
  }

  /** Which snapshot hour is effectively being shown for a date, for header/time-bar
   *  highlighting. Returns null when showing the plain final digest (either no
   *  snapshots exist, or the default view already equals the finished daily file). */
  function selectedSnapshotHour(dateStr) {
    const snapshots = snapshotsByDate.get(dateStr);
    if (!snapshots) return null;
    if (currentHour && snapshots.has(currentHour)) return currentHour;
    const present = SNAPSHOT_HOURS.filter((hh) => snapshots.has(hh));
    const latest = present[present.length - 1];
    if (latest === SNAPSHOT_HOURS[SNAPSHOT_HOURS.length - 1] && parsedByDate.has(dateStr)) return null;
    return latest;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function inlineMarkdownToHtml(rawLine) {
    let escaped = escapeHtml(rawLine);
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      if (/^https?:\/\//i.test(url)) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
      return text;
    });
    return escaped;
  }

  /** Parses digest markdown into an ordered Map<topicHeading, string[] bulletLines> */
  function parseDigest(text) {
    const sections = new Map();
    let current = null;
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (line.startsWith("## ")) {
        current = line.slice(3).trim();
        if (!sections.has(current)) sections.set(current, []);
      } else if (line.startsWith("- ") && current) {
        sections.get(current).push(line.slice(2).trim());
      }
    }
    return { sections };
  }

  function allTopics() {
    const set = new Set();
    for (const dateStr of availableDates) {
      for (const topic of latestSections(dateStr).keys()) set.add(topic);
    }
    return Array.from(set);
  }

  function renderTopicBar() {
    topicBar.innerHTML = "";
    const topics = ["All", ...allTopics()];
    for (const topic of topics) {
      const chip = document.createElement("button");
      chip.className = "topic-chip" + (topic === currentTopic ? " active" : "");
      chip.textContent = topic;
      chip.addEventListener("click", () => {
        currentTopic = topic;
        aggregateMode = false;
        render();
      });
      topicBar.appendChild(chip);
    }
  }

  function renderTimeBar(dateStr) {
    timeBar.innerHTML = "";
    const snapshots = snapshotsByDate.get(dateStr);
    if (!snapshots) return;

    const label = document.createElement("span");
    label.className = "time-bar-label";
    label.textContent = "Snapshot:";
    timeBar.appendChild(label);

    const present = SNAPSHOT_HOURS.filter((hh) => snapshots.has(hh));
    const activeHour = selectedSnapshotHour(dateStr) ?? present[present.length - 1];
    for (const hh of SNAPSHOT_HOURS) {
      if (!snapshots.has(hh)) continue;
      const chip = document.createElement("button");
      chip.className = "time-chip" + (hh === activeHour ? " active" : "");
      chip.textContent = `${hh}:00`;
      chip.addEventListener("click", () => {
        currentHour = hh;
        render();
      });
      timeBar.appendChild(chip);
    }
  }

  function renderSection(topic, lines) {
    const section = document.createElement("section");
    section.className = "topic-section";
    const h3 = document.createElement("h3");
    h3.textContent = topic;
    const ul = document.createElement("ul");
    for (const line of lines) {
      const li = document.createElement("li");
      li.innerHTML = inlineMarkdownToHtml(line);
      ul.appendChild(li);
    }
    section.appendChild(h3);
    section.appendChild(ul);
    return section;
  }

  function renderDayView(dateStr) {
    content.innerHTML = "";

    const header = document.createElement("div");
    header.className = "day-header";
    const h2 = document.createElement("h2");
    const activeHour = selectedSnapshotHour(dateStr);
    h2.textContent = activeHour ? `${dateStr} — ${activeHour}:00 snapshot` : dateStr;
    header.appendChild(h2);
    content.appendChild(header);

    if (currentTopic !== "All") {
      const toggle = document.createElement("button");
      toggle.className = "aggregate-toggle";
      toggle.textContent = `View "${currentTopic}" across all days →`;
      toggle.addEventListener("click", () => {
        aggregateMode = true;
        render();
      });
      content.appendChild(toggle);
    }

    const sections = activeSections(dateStr);
    const topicsToShow = currentTopic === "All" ? Array.from(sections.keys()) : [currentTopic];

    let rendered = 0;
    for (const topic of topicsToShow) {
      const lines = sections.get(topic);
      if (!lines || lines.length === 0) continue;
      content.appendChild(renderSection(topic, lines));
      rendered++;
    }

    if (rendered === 0) {
      const p = document.createElement("p");
      p.className = "status";
      p.textContent = `No "${currentTopic}" entries for ${dateStr}.`;
      content.appendChild(p);
    }
  }

  function renderAggregateView(topic) {
    content.innerHTML = "";

    const header = document.createElement("div");
    header.className = "day-header";
    const h2 = document.createElement("h2");
    h2.textContent = `${topic} — across all days`;
    header.appendChild(h2);
    content.appendChild(header);

    const toggle = document.createElement("button");
    toggle.className = "aggregate-toggle";
    toggle.textContent = "← Back to single day";
    toggle.addEventListener("click", () => {
      aggregateMode = false;
      render();
    });
    content.appendChild(toggle);

    let rendered = 0;
    for (const dateStr of availableDates) {
      const sections = latestSections(dateStr);
      const lines = sections.get(topic);
      if (!lines || lines.length === 0) continue;
      const sub = document.createElement("p");
      sub.className = "date-subheading";
      sub.textContent = dateStr;
      content.appendChild(sub);
      content.appendChild(renderSection(topic, lines));
      rendered++;
    }

    if (rendered === 0) {
      const p = document.createElement("p");
      p.className = "status";
      p.textContent = `No "${topic}" entries found in any digest.`;
      content.appendChild(p);
    }
  }

  function renderEmptyState() {
    topicBar.innerHTML = "";
    content.innerHTML = "";
    const div = document.createElement("div");
    div.className = "empty-state";
    div.innerHTML =
      "No digests found yet.<br/>The agent writes <code>news/YYYY-MM-DD.md</code> every 5 hours (00:00, 05:00, 10:00, 15:00, 20:00 Asia/Bangkok).<br/>Check back after the next run.";
    content.appendChild(div);
    dateSelect.innerHTML = "";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }

  function render() {
    if (availableDates.length === 0) {
      renderEmptyState();
      return;
    }
    renderTopicBar();
    prevBtn.disabled = currentIndex >= availableDates.length - 1;
    nextBtn.disabled = currentIndex <= 0;
    dateSelect.value = availableDates[currentIndex];

    if (aggregateMode && currentTopic !== "All") {
      timeBar.innerHTML = "";
      renderAggregateView(currentTopic);
    } else {
      const dateStr = availableDates[currentIndex];
      renderTimeBar(dateStr);
      renderDayView(dateStr);
    }
  }

  function populateDateSelect() {
    dateSelect.innerHTML = "";
    for (const dateStr of availableDates) {
      const opt = document.createElement("option");
      opt.value = dateStr;
      opt.textContent = dateStr;
      dateSelect.appendChild(opt);
    }
  }

  prevBtn.addEventListener("click", () => {
    if (currentIndex < availableDates.length - 1) {
      currentIndex++;
      aggregateMode = false;
      currentHour = null;
      render();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      aggregateMode = false;
      currentHour = null;
      render();
    }
  });

  dateSelect.addEventListener("change", () => {
    const idx = availableDates.indexOf(dateSelect.value);
    if (idx !== -1) {
      currentIndex = idx;
      aggregateMode = false;
      currentHour = null;
      render();
    }
  });

  refreshBtn.addEventListener("click", () => {
    const selectedDate = availableDates[currentIndex];
    loadAndRender(selectedDate);
  });

  async function loadAndRender(preserveDate) {
    refreshBtn.disabled = true;
    const originalLabel = refreshBtn.textContent;
    refreshBtn.textContent = "Refreshing…";
    try {
      await probeDates();
      populateDateSelect();
      const preservedIndex = preserveDate ? availableDates.indexOf(preserveDate) : -1;
      currentIndex = preservedIndex !== -1 ? preservedIndex : 0;
      render();
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = originalLabel;
    }
  }

  loadAndRender();
})();
