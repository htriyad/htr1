import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  text: string;
  block?: boolean;
  className?: string;
}

/**
 * Renders text containing:
 *  - Math:        $...$, $$...$$
 *  - Chemistry:   \ce{H2O} (basic)
 *  - Markdown:    **bold**, *italic*, __underline__, ==highlight==, `code`
 *                 ```code blocks```, headings (#, ##, ###),
 *                 lists (- item, 1. item), blockquote (> ),
 *                 links [text](url), images [img:URL] / ![alt](url)
 *  - Bangla / English with proper fonts.
 */
export default function MathText({ text, block, className }: Props) {
  const html = useMemo(() => renderMixed(text || ""), [text]);
  const Tag = block ? "div" : "span";
  return (
    <Tag
      className={"rr-md " + (className || "")}
      style={{ fontFamily: "'Roboto','Noto Sans Bengali',sans-serif", lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ─────────── Top-level: split out math + code blocks first ─────────── */
function renderMixed(raw: string): string {
  // Image markers [img:URL]
  const imgs: string[] = [];
  let src = raw.replace(/\[img:([^\]]+)\]/gi, (_m, url) => {
    imgs.push(url.trim());
    return `\u0000IMG${imgs.length - 1}\u0000`;
  });

  // Pull out fenced code blocks ```...```
  const codeBlocks: string[] = [];
  src = src.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_m, _lang, code) => {
    codeBlocks.push(code);
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  // Walk math segments, render KaTeX, markdown the rest.
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("$$", i)) {
      const end = src.indexOf("$$", i + 2);
      if (end === -1) { out.push(markdown(src.slice(i), imgs, codeBlocks)); break; }
      out.push(renderKatex(src.slice(i + 2, end), true));
      i = end + 2;
    } else if (src[i] === "$") {
      const end = src.indexOf("$", i + 1);
      if (end === -1) { out.push(markdown(src.slice(i), imgs, codeBlocks)); break; }
      out.push(renderKatex(src.slice(i + 1, end), false));
      i = end + 1;
    } else {
      let j = i;
      while (j < src.length && src[j] !== "$") j++;
      out.push(markdown(src.slice(i, j), imgs, codeBlocks));
      i = j;
    }
  }
  return out.join("");
}

/* ─────────── Lightweight Markdown renderer (block + inline) ─────────── */
function markdown(s: string, imgs: string[], codeBlocks: string[]): string {
  if (!s) return "";
  // First protect inline code `...` so we don't apply markup inside.
  const inlineCodes: string[] = [];
  s = s.replace(/`([^`\n]+)`/g, (_m, c) => {
    inlineCodes.push(c);
    return `\u0000IC${inlineCodes.length - 1}\u0000`;
  });

  // Process line by line for blocks.
  const lines = s.split(/\r?\n/);
  const out: string[] = [];
  let inUL = false, inOL = false;
  const closeLists = () => {
    if (inUL) { out.push("</ul>"); inUL = false; }
    if (inOL) { out.push("</ol>"); inOL = false; }
  };

  for (const raw of lines) {
    const line = raw;

    // Headings
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^\s*###\s+(.+)$/))) { closeLists(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^\s*##\s+(.+)$/)))  { closeLists(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = line.match(/^\s*#\s+(.+)$/)))   { closeLists(); out.push(`<h1>${inline(m[1])}</h1>`); continue; }

    // Blockquote
    if ((m = line.match(/^\s*>\s?(.*)$/))) { closeLists(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }

    // Horizontal rule
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) { closeLists(); out.push("<hr/>"); continue; }

    // Ordered list
    if ((m = line.match(/^\s*\d+\.\s+(.+)$/))) {
      if (!inOL) { closeLists(); out.push("<ol>"); inOL = true; }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    // Unordered list
    if ((m = line.match(/^\s*[-*+]\s+(.+)$/))) {
      if (!inUL) { closeLists(); out.push("<ul>"); inUL = true; }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }

    // Blank line
    if (/^\s*$/.test(line)) { closeLists(); out.push("<br/>"); continue; }

    // Plain paragraph line
    closeLists();
    out.push(inline(line) + "<br/>");
  }
  closeLists();

  let html = out.join("");

  // Restore inline codes
  html = html.replace(/\u0000IC(\d+)\u0000/g, (_m, idx) => {
    const c = inlineCodes[Number(idx)] || "";
    return `<code class="rr-code">${escape(c)}</code>`;
  });

  // Restore images
  html = html.replace(/\u0000IMG(\d+)\u0000/g, (_m, idx) => {
    const url = imgs[Number(idx)] || "";
    return `<img src="${escapeAttr(url)}" alt="" class="rr-img"/>`;
  });

  // Restore fenced code blocks
  html = html.replace(/\u0000CODE(\d+)\u0000/g, (_m, idx) => {
    const c = codeBlocks[Number(idx)] || "";
    return `<pre class="rr-pre"><code>${escape(c)}</code></pre>`;
  });

  return html;
}

/* ─────────── Inline transforms ───────────
   Order matters: escape first, then apply patterns that don't overlap.
*/
function inline(s: string): string {
  s = escape(s);

  // ![alt](url)  → image
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) =>
    `<img src="${escapeAttr(url)}" alt="${alt}" class="rr-img"/>`);

  // [text](url) → link
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, txt, url) =>
    `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${txt}</a>`);

  // ==highlight==
  s = s.replace(/==([^=\n]+)==/g, '<mark class="rr-hl">$1</mark>');

  // ***bold italic***
  s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, "<strong><em>$1</em></strong>");

  // **bold**
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");

  // *italic*  (avoid eating bold leftovers — already gone)
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  // __underline__
  s = s.replace(/__([^_\n]+)__/g, '<u>$1</u>');

  // _italic_
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");

  // ~~strikethrough~~
  s = s.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");

  return s;
}

function renderKatex(latex: string, display: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      output: "html",
      trust: true,
      macros: { "\\ce": "\\text{#1}" },
    });
  } catch {
    return `<code>${escape(latex)}</code>`;
  }
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return escape(s).replace(/"/g, "&quot;");
}
