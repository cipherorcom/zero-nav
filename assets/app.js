// 替换为你的 Google 表格信息
const SHEET_ID = "1Iqsg-RPs0zxd6ZZ6wV3h4-J5_4BZcQb9o8EOtHHJh3o";
const SHEET_NAME = "nav"; // 工作表名称
const SHEET_JSON = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(SHEET_NAME)}`;

// 暴露到全局，供页面其它脚本使用（如“后台”按钮链接）
window.NAV_SHEET = { id: SHEET_ID, name: SHEET_NAME, json: SHEET_JSON };

const state = { items: [], filtered: [] };
const $app = document.getElementById("app");
const $q = document.getElementById("q");

init();

async function init() {
  try {
    const res = await fetch(SHEET_JSON, { cache: "no-store" });
    if (!res.ok) throw new Error(`拉取数据失败：${res.status}`);
    const raw = await res.json();
    state.items = normalize(raw);
    state.filtered = state.items.slice();
    render(state.filtered);
    setupSearch();
  } catch (e) {
    $app.innerHTML = `<article class="card"><strong>加载失败</strong><div class="desc">${e.message}</div></article>`;
    console.error(e);
  }
}

function normalize(rows) {
  return rows
    .map(r => ({
      category: (r.category || "未分类").trim(),
      name: (r.name || "").trim(),
      url: normalizeUrl(r.url || ""),
      desc: (r.desc || "").trim(),
      tags: (r.tags || "").split(/[，,]/).map(s => s.trim()).filter(Boolean),
    }))
    .filter(x => x.name && x.url);
}

function normalizeUrl(url) {
  try {
    const u = url.trim();
    if (!u) return "";
    return new URL(u, u.startsWith("http") ? undefined : "https://").toString();
  } catch {
    return "";
  }
}

function favicon(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
  } catch {
    return "";
  }
}

function render(list) {
  const groups = groupBy(list, x => x.category);
  const sections = Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .map(cat => section(cat, groups[cat]))
    .join("");
  $app.innerHTML = sections || emptyView();
}

function groupBy(arr, fn) {
  return arr.reduce((acc, cur) => {
    const k = fn(cur);
    if (!acc[k]) {
      acc[k] = [];
    }
    acc[k].push(cur);
    return acc;
  }, {});
}

function section(title, items) {
  const cards = items.map(card).join("");
  return `
    <h3 class="section-title">${escapeHtml(title)}</h3>
    <div class="grid">${cards}</div>
  `;
}

function card(item) {
  const tagHtml = item.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join("");
  return `
    <a class="card" href="${item.url}" target="_blank" rel="noopener noreferrer">
      <div class="row">
        <img class="favicon" src="${favicon(item.url)}" alt="" loading="lazy" />
        <span class="name">${escapeHtml(item.name)}</span>
      </div>
      <div class="desc">${escapeHtml(item.desc || "")}</div>
      ${tagHtml ? `<div class="tags">${tagHtml}</div>` : ""}
    </a>
  `;
}

function setupSearch() {
  let timer = null;
  $q.addEventListener("input", () => {
    clearTimeout(timer);
    const keyword = $q.value.trim().toLowerCase();
    timer = setTimeout(() => {
      if (!keyword) {
        state.filtered = state.items.slice();
      } else {
        state.filtered = state.items.filter(x =>
          (x.name + " " + x.desc + " " + x.tags.join(" ")).toLowerCase().includes(keyword)
        );
      }
      render(state.filtered);
    }, 120);
  });
}

function emptyView() {
  return `<article class="card"><strong>没有结果</strong><div class="desc">试试换个关键词，或检查表格数据。</div></article>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
}