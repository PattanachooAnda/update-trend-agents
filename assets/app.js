(() => {
  const PROBE_DAYS = 120; // how many calendar days back to look for digest files

  const dateSelect = document.getElementById("dateSelect");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const topicBar = document.getElementById("topicBar");
  const content = document.getElementById("content");

  /** @type {string[]} descending, e.g. ["2026-07-11", "2026-07-10"] */
  let availableDates = [];
  /** date -> { sections: Map<string, string[]> } (values are raw bullet lines) */
  const parsedByDate = new Map();
  let currentIndex = 0;
  let currentTopic = "All";
  let aggregateMode = false;

  function toDateStr(d) {
    return d.toISOString().slice(0, 10);
  }

  async function probeDates() {
    const today = new Date();
    const checks = [];
    for (let i = 0; i < PROBE_DAYS; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      checks.push(toDateStr(d));
    }

    const results = await Promise.all(
      checks.map(async (dateStr) => {
        try {
          const res = await fetch(`news/${dateStr}.md`, { cache: "no-store" });
          if (!res.ok) return null;
          const text = await res.text();
          return { dateStr, text };
        } catch {
          return null;
        }
      })
    );

    for (const r of results) {
      if (r) parsedByDate.set(r.dateStr, parseDigest(r.text));
    }
    availableDates = checks.filter((d) => parsedByDate.has(d));
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
    for (const { sections } of parsedByDate.values()) {
      for (const topic of sections.keys()) set.add(topic);
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
    h2.textContent = dateStr;
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

    const { sections } = parsedByDate.get(dateStr);
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
      const { sections } = parsedByDate.get(dateStr);
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
      "No digests found yet.<br/>The daily agent writes <code>news/YYYY-MM-DD.md</code> every morning at 07:00 (Asia/Bangkok).<br/>Check back after the next run.";
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
      renderAggregateView(currentTopic);
    } else {
      renderDayView(availableDates[currentIndex]);
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
      render();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      aggregateMode = false;
      render();
    }
  });

  dateSelect.addEventListener("change", () => {
    const idx = availableDates.indexOf(dateSelect.value);
    if (idx !== -1) {
      currentIndex = idx;
      aggregateMode = false;
      render();
    }
  });

  (async function init() {
    await probeDates();
    populateDateSelect();
    currentIndex = 0;
    render();
  })();
})();
