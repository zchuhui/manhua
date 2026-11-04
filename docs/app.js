const $app = document.getElementById("app");
const cache = new Map();
const THEMES = ["paper", "night", "ink"];

const state = {
  route: parseHash(),
  catalog: null,
  book: null,
  pack: null,
  chapter: null,
  query: "",
  theme: localStorage.getItem("zhai-theme") || "paper",
  font: Number(localStorage.getItem("zhai-font") || 20),
  drawer: false,
};

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, "")).replace(/^\/+/, "");
  const [book, ch] = raw.split("/");
  return { book: book || "", ch: ch ? Number(ch) : null };
}

async function getJson(url) {
  if (!cache.has(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`无法读取 ${url}`);
    cache.set(url, res.json());
  }
  return cache.get(url);
}

function progressKey(id) {
  return `zhai-progress:${id}`;
}

function saveProgress(bookId, n) {
  localStorage.setItem(progressKey(bookId), String(n));
}

function readProgress(bookId) {
  return Number(localStorage.getItem(progressKey(bookId)) || 0);
}

function applyChrome() {
  document.documentElement.dataset.theme = state.theme === "paper" ? "" : state.theme;
  document.documentElement.style.setProperty("--fs", `${state.font}px`);
}

function navigate(hash) {
  location.hash = hash;
}

function el(html) {
  const box = document.createElement("div");
  box.innerHTML = html.trim();
  return box.firstElementChild;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function toolbar(extra = "") {
  return `
    <div class="toolbar">
      ${extra}
      <button class="chip" data-act="theme">版式</button>
      <button class="chip" data-act="smaller">A-</button>
      <button class="chip" data-act="bigger">A+</button>
    </div>`;
}

function mast(extra = "") {
  return `
    <div class="mast wrap">
      <a class="brand" href="#/">
        <em>PROJECT MANHUA</em>
        <strong>问道书斋</strong>
      </a>
      ${toolbar(extra)}
    </div>`;
}

function renderHome() {
  const books = state.catalog?.books || [];
  $app.innerHTML = `
    ${mast()}
    <section class="hero wrap">
      <p>正在写的《问道无门》。进度记在这台浏览器里。</p>
    </section>
    <section class="grid wrap"></section>
  `;
  const grid = $app.querySelector(".grid");
  for (const book of books) {
    const last = readProgress(book.id);
    const card = el(`
      <a class="card" href="#/${book.id}">
        <div class="kicker">${escapeHtml(book.status)}</div>
        <h2>${escapeHtml(book.title)}</h2>
        <div class="meta">${escapeHtml(book.author)} · ${book.chapters} 章</div>
        <div class="blurb">${last ? `上次读到第 ${last} 章` : "尚未开始"}</div>
        <div class="go">${last ? "继续阅读 →" : "打开目录 →"}</div>
      </a>`);
    grid.append(card);
  }
}

function renderCatalog() {
  const book = state.book;
  const q = state.query.trim();
  const chapters = book.chapters.filter((ch) => {
    if (!q) return true;
    return `${ch.n}${ch.title}`.includes(q);
  });
  const last = readProgress(book.id);
  $app.innerHTML = `
    ${mast(`<a class="chip" href="#/">书目</a>`)}
    <div class="wrap">
      <div class="book-head">
        <div>
          <div class="kicker" style="color:var(--cinnabar);letter-spacing:.2em;font-size:12px">${escapeHtml(book.status)}</div>
          <h1 style="font-family:var(--serif);font-size:40px;margin:6px 0 8px">${escapeHtml(book.title)}</h1>
          <div style="color:var(--muted)">${escapeHtml(book.author)} · ${book.chapters.length} 章${last ? ` · 读到第 ${last} 章` : ""}</div>
          <p style="color:var(--muted);max-width:40rem;line-height:1.7">${escapeHtml(book.blurb || "")}</p>
        </div>
        <input class="search" placeholder="搜章节号或标题" value="${escapeHtml(q)}" />
      </div>
      <div class="vols"></div>
      <div class="chapters"></div>
    </div>
  `;
  const vols = $app.querySelector(".vols");
  for (const vol of book.volumes || []) {
    const a = el(`<a class="chip" href="#/${book.id}/${vol.from}">${escapeHtml(vol.name)}</a>`);
    vols.append(a);
  }
  if (last) vols.prepend(el(`<a class="chip is-on" href="#/${book.id}/${last}">继续第 ${last} 章</a>`));
  const list = $app.querySelector(".chapters");
  for (const ch of chapters) {
    list.append(el(`<a href="#/${book.id}/${ch.n}"><span class="n">${String(ch.n).padStart(4, "0")}</span><span>${escapeHtml(ch.title)}</span></a>`));
  }
  $app.querySelector(".search").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderCatalog();
    $app.querySelector(".search").focus();
    $app.querySelector(".search").setSelectionRange(state.query.length, state.query.length);
  });
}

function renderReader() {
  const book = state.book;
  const ch = state.chapter;
  const i = book.chapters.findIndex((c) => c.n === ch.n);
  const prev = book.chapters[i - 1];
  const next = book.chapters[i + 1];
  $app.innerHTML = `
    <div class="reader-shell">
      <aside class="drawer ${state.drawer ? "open" : ""}">
        <a href="#/${book.id}">← ${escapeHtml(book.title)}</a>
        <h3>目录</h3>
        <div class="toc"></div>
      </aside>
      <main class="reading">
        <div class="topbar">
          <div class="toolbar">
            <button class="chip menu-btn" data-act="drawer">目录</button>
            <a class="chip" href="#/${book.id}">全部章节</a>
          </div>
          ${toolbar()}
        </div>
        <article class="article">
          <header>
            <div class="kicker">${escapeHtml(book.title)} · ${String(ch.n).padStart(4, "0")}</div>
            <h1>${escapeHtml(ch.title)}</h1>
          </header>
          ${ch.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
        </article>
        <nav class="pager">
          ${prev ? `<a href="#/${book.id}/${prev.n}">← ${escapeHtml(prev.title)}</a>` : "<span></span>"}
          ${next ? `<a href="#/${book.id}/${next.n}">${escapeHtml(next.title)} →</a>` : "<span>终章</span>"}
        </nav>
      </main>
    </div>
  `;
  const toc = $app.querySelector(".toc");
  const start = Math.max(0, i - 12);
  const slice = book.chapters.slice(start, start + 36);
  for (const item of slice) {
    toc.append(el(`<a class="${item.n === ch.n ? "is-current" : ""}" href="#/${book.id}/${item.n}">${item.n} ${escapeHtml(item.title)}</a>`));
  }
  const current = toc.querySelector(".is-current");
  if (current) current.scrollIntoView({ block: "center" });
}

function renderStatus(text) {
  $app.innerHTML = `${mast()}<div class="status">${escapeHtml(text)}</div>`;
}

async function loadBook(id) {
  if (state.book?.id === id) return state.book;
  state.book = await getJson(`./data/${id}/index.json`);
  return state.book;
}

async function loadChapter(book, n) {
  const meta = book.chapters.find((c) => c.n === n);
  if (!meta) throw new Error("没有这一章");
  const pack = await getJson(`./data/${book.id}/${meta.pack}.json`);
  const chapter = pack.chapters.find((c) => c.n === n);
  if (!chapter) throw new Error("章节包里找不到正文");
  return chapter;
}

async function render() {
  applyChrome();
  state.route = parseHash();
  try {
    if (!state.catalog) state.catalog = await getJson("./data/catalog.json");
    if (!state.route.book) {
      state.book = null;
      state.chapter = null;
      renderHome();
      return;
    }
    const book = await loadBook(state.route.book);
    if (!state.route.ch) {
      state.chapter = null;
      renderCatalog();
      return;
    }
    state.chapter = await loadChapter(book, state.route.ch);
    saveProgress(book.id, state.chapter.n);
    renderReader();
  } catch (err) {
    renderStatus(err.message || "读取失败");
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === "theme") {
    const i = Math.max(0, THEMES.indexOf(state.theme));
    state.theme = THEMES[(i + 1) % THEMES.length];
    localStorage.setItem("zhai-theme", state.theme);
    applyChrome();
  }
  if (act === "bigger") {
    state.font = Math.min(28, state.font + 1);
    localStorage.setItem("zhai-font", String(state.font));
    applyChrome();
  }
  if (act === "smaller") {
    state.font = Math.max(16, state.font - 1);
    localStorage.setItem("zhai-font", String(state.font));
    applyChrome();
  }
  if (act === "drawer") {
    state.drawer = !state.drawer;
    $app.querySelector(".drawer")?.classList.toggle("open", state.drawer);
  }
});

document.addEventListener("keydown", (e) => {
  if (!state.chapter || !state.book) return;
  const i = state.book.chapters.findIndex((c) => c.n === state.chapter.n);
  if (e.key === "ArrowRight" && state.book.chapters[i + 1]) {
    navigate(`/${state.book.id}/${state.book.chapters[i + 1].n}`);
  }
  if (e.key === "ArrowLeft" && state.book.chapters[i - 1]) {
    navigate(`/${state.book.id}/${state.book.chapters[i - 1].n}`);
  }
});

window.addEventListener("hashchange", render);
render();
