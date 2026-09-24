(() => {
  "use strict";
  const input = document.querySelector("#search-query");
  const form = document.querySelector("#search-form");
  const scope = document.querySelector("#search-scope");
  const status = document.querySelector("#search-status");
  const results = document.querySelector("#search-results");
  const siteRoot = new URL("../", location.href);
  let entries = [];
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const tokens = value => [...new Set(normalize(value).split(/\s+/).filter(Boolean))];
  const oneEdit = (a, b) => {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, errors = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++errors > 1) return false;
      if (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else { i++; j++; }
    }
    return errors + (i < a.length || j < b.length ? 1 : 0) <= 1;
  };
  const score = (entry, query) => {
    const title = normalize(entry.title);
    const aliases = normalize((entry.aliases || []).join(" "));
    const summary = normalize(entry.summary || "");
    const titleTokens = tokens(title + " " + aliases);
    let total = 0, matched = 0;
    for (const term of query) {
      if (title.split(" ").includes(term)) { total += 12; matched++; }
      else if (aliases.split(" ").includes(term)) { total += 10; matched++; }
      else if (title.includes(term) || aliases.includes(term)) { total += 7; matched++; }
      else if (term.length >= 5 && titleTokens.some(t => oneEdit(term, t))) { total += 5; matched++; }
      else if (summary.includes(term)) { total += 2; matched++; }
    }
    if (matched < Math.ceil(query.length * .65)) return 0;
    if (title.includes(query.join(" "))) total += 24;
    if (entry.kind === "idea") total += 9;
    return total;
  };
  const add = (parent, tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    parent.append(node);
    return node;
  };
  const render = () => {
    const q = input.value.trim();
    const query = tokens(q);
    const selected = scope.value;
    results.replaceChildren();
    const matches = entries.filter(e => selected === "all" || e.kind === selected || e.type === selected)
      .map(e => ({...e, relevance: query.length ? score(e, query) : (e.kind === "idea" ? 100 + e.score : 0)}))
      .filter(e => e.relevance > 0)
      .sort((a,b) => b.relevance - a.relevance || (b.score || 0) - (a.score || 0) || a.title.localeCompare(b.title, "ro"));
    const visible = matches.slice(0, 30);
    status.textContent = !q ? "Ideile din portofoliu — introdu un termen pentru a căuta și în rapoarte." :
      matches.length ? `${matches.length} rezultate pentru „${q}”${matches.length > 30 ? " · primele 30 afișate" : ""}` : `Niciun rezultat pentru „${q}”. Încearcă un nume, un domeniu sau un acronim.`;
    for (const e of visible) {
      const a = add(results, "a", "search-hit");
      a.href = new URL(e.url, siteRoot).href;
      add(a, "span", "search-kind", e.kind === "idea" ? `Portofoliu · ${e.score}/100 · ${e.status}` : e.type);
      add(a, "strong", "", e.title);
      add(a, "span", "search-summary", e.summary);
    }
  };
  const params = new URLSearchParams(location.search);
  input.value = params.get("q") || "";
  form.addEventListener("submit", event => { event.preventDefault(); history.replaceState(null, "", input.value.trim() ? "?q=" + encodeURIComponent(input.value.trim()) : location.pathname); render(); });
  input.addEventListener("input", () => render());
  scope.addEventListener("change", render);
  const liveCards = async (path, category) => {
    try {
      const address = new URL(path, siteRoot);
      const response = await fetch(address);
      if (!response.ok) return [];
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      return [...page.querySelectorAll("a.edition-card[href]")].map(a => ({
        kind: "report",
        type: /chatgpt/i.test(a.getAttribute("href")) ? "Radar Business" : category,
        url: new URL(a.getAttribute("href"), address).href,
        title: a.querySelector("h2")?.textContent?.trim() || a.textContent.trim(),
        summary: a.querySelector(".teaser")?.textContent?.trim() || ""
      }));
    } catch { return []; }
  };
  Promise.all([
    fetch("../portfolio/ideas.json").then(r => { if (!r.ok) throw Error("ideas"); return r.json(); }),
    fetch("reports.json").then(r => { if (!r.ok) throw Error("reports"); return r.json(); }),
    liveCards("index.html", "Lovitura"),
    liveCards("radar/index.html", "Radar Business")
  ])
    .then(([ideas, reports, homeCards, radarCards]) => {
      const reportMap = new Map();
      for (const report of reports.map(r => ({...r,kind:"report"})).concat(homeCards, radarCards)) {
        const key = new URL(report.url, siteRoot).pathname;
        const previous = reportMap.get(key);
        reportMap.set(key, {...previous,...report,summary:report.summary || previous?.summary || ""});
      }
      entries = [...ideas.map(i => ({kind:"idea",type:"Portofoliu",url:"portfolio/"+i.slug+"/",title:i.title,summary:i.problem,aliases:[...i.aliases,...i.tags],status:i.status,score:i.score})),...reportMap.values()];
      render();
    })
    .catch(() => { status.textContent = "Indexul nu s-a putut încărca. Deschide Portofoliul sau Arhiva din meniu."; });
})();
