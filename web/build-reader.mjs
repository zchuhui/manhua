import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "data");

const CN = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function cnToInt(raw) {
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (s === "十") return 10;
  if (s.startsWith("十")) return 10 + (CN[s.slice(1)] || 0);
  if (s.endsWith("十")) return (CN[s[0]] || 1) * 10;
  if (s.includes("十")) {
    const [a, b] = s.split("十");
    return (CN[a] || 1) * 10 + (CN[b] || 0);
  }
  if (s.length === 1 && CN[s] != null) return CN[s];
  return null;
}

function toParagraphs(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/^[　\s]+/, "").trim())
    .filter(Boolean);
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
}

function packChapters(bookId, chapters, size = 100) {
  const dir = path.join(outDir, bookId);
  fs.mkdirSync(dir, { recursive: true });
  const indexChapters = [];
  const packCount = Math.max(1, Math.ceil(chapters.length / size));
  for (let i = 0; i < packCount; i++) {
    const slice = chapters.slice(i * size, (i + 1) * size);
    const packId = `p${String(i + 1).padStart(2, "0")}`;
    writeJson(path.join(dir, `${packId}.json`), {
      pack: packId,
      chapters: slice.map((ch) => ({ n: ch.n, title: ch.title, paragraphs: ch.paragraphs })),
    });
    for (const ch of slice) {
      indexChapters.push({ n: ch.n, title: ch.title, pack: packId });
    }
  }
  return indexChapters;
}

function buildWendaomen() {
  const dir = path.join(root, "drafts", "问道无门");
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()
    : [];
  const chapters = [];
  for (const file of files) {
    const md = fs.readFileSync(path.join(dir, file), "utf8");
    const chunks = md.split(/^## 第/m);
    for (const chunk of chunks.slice(1)) {
      const nl = chunk.indexOf("\n");
      const heading = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
      const body = nl === -1 ? "" : chunk.slice(nl + 1);
      const m = heading.match(/^([0-9一二三四五六七八九十两]+)章\s*(.*)$/);
      if (!m) continue;
      const n = cnToInt(m[1]);
      if (!n) continue;
      chapters.push({
        n,
        title: (m[2] || heading).trim(),
        paragraphs: toParagraphs(body),
      });
    }
  }
  chapters.sort((a, b) => a.n - b.n);
  const indexChapters = packChapters("wendaomen", chapters, 50);
  writeJson(path.join(outDir, "wendaomen", "index.json"), {
    id: "wendaomen",
    title: "问道无门",
    author: "项目新作",
    status: "试稿",
    blurb: "前世问道榜第一的散修重生为底层宗门杂役。飞升即献祭。知识降维，守护者结局。",
    chapters: indexChapters,
    volumes: [{ id: "V1", name: "卷一", from: 1, to: chapters.at(-1)?.n || 1 }],
  });
  return { id: "wendaomen", title: "问道无门", author: "项目新作", status: "试稿", chapters: indexChapters.length };
}

fs.rmSync(path.join(outDir, "wangu"), { recursive: true, force: true });
const books = [buildWendaomen()];
writeJson(path.join(outDir, "catalog.json"), {
  generatedAt: new Date().toISOString(),
  books,
});
console.log("built", books);
