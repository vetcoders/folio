function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function inline(src: string): string {
  let s = escapeHtml(src);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^\w*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^\w_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noreferrer" target="_blank">$1</a>');
  return s;
}

function heading(line: string): string | null {
  const m = /^(#{1,6})\s+(.+)$/.exec(line);
  if (!m) return null;
  const level = m[1].length;
  return `<h${level}>${inline(m[2])}</h${level}>`;
}

export function extractTitle(body: string): string {
  const line = body.split("\n").find((l) => l.trim());
  if (!line) return "Bez tytułu";
  const cleaned = line.replace(/^#{1,6}\s+/, "").trim();
  return cleaned || "Bez tytułu";
}

export function extractPreview(body: string): string {
  const lines = body.split("\n");
  const rest: string[] = [];
  let skippedTitle = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!skippedTitle) {
      skippedTitle = true;
      continue;
    }
    rest.push(line.replace(/^#{1,6}\s+/, "").replace(/[*_`#>-]/g, ""));
    if (rest.join(" ").length > 90) break;
  }
  const text = rest.join(" ").replace(/\s+/g, " ").trim();
  if (!text) return "Pusta notatka";
  return text.length > 96 ? `${text.slice(0, 96)}…` : text;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  let inCode = false;
  let code: string[] = [];
  let listKind: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listKind) {
      html.push(`</${listKind}>`);
      listKind = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (inCode) {
      if (line.startsWith("```")) {
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        code.push(line);
      }
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      closeList();
      inCode = true;
      code = [];
      i += 1;
      continue;
    }

    if (/^\s*([-*_])\s*\1\s*\1\s*$/.test(line)) {
      closeList();
      html.push("<hr />");
      i += 1;
      continue;
    }

    const h = heading(line);
    if (h) {
      closeList();
      html.push(h);
      i += 1;
      continue;
    }

    const task = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (task) {
      if (listKind !== "ul") {
        closeList();
        html.push("<ul>");
        listKind = "ul";
      }
      const checked = task[1] !== " " ? "checked" : "";
      html.push(
        `<li class="task"><input type="checkbox" disabled ${checked} />${inline(task[2])}</li>`,
      );
      i += 1;
      continue;
    }

    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      if (listKind !== "ul") {
        closeList();
        html.push("<ul>");
        listKind = "ul";
      }
      html.push(`<li>${inline(ul[1])}</li>`);
      i += 1;
      continue;
    }

    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ol) {
      if (listKind !== "ol") {
        closeList();
        html.push("<ol>");
        listKind = "ol";
      }
      html.push(`<li>${inline(ol[1])}</li>`);
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      closeList();
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
      continue;
    }

    if (!line.trim()) {
      closeList();
      i += 1;
      continue;
    }

    closeList();
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !heading(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${inline(para.join(" "))}</p>`);
  }

  closeList();
  if (inCode) html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return html.join("\n");
}
