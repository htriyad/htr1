import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  text: string;
  block?: boolean;
  className?: string;
}

/**
 * Renders text that may contain:
 *  - Inline math: $...$
 *  - Display math: $$...$$
 *  - Chemistry (mhchem): \ce{H2O}
 *  - Bengali / English text: rendered normally with correct fonts
 */
export default function MathText({ text, block, className }: Props) {
  const html = useMemo(() => renderMixed(text || ""), [text]);
  const Tag = block ? "div" : "span";
  return (
    <Tag
      className={className}
      style={{ fontFamily: "'Roboto','Noto Sans Bengali',sans-serif", lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMixed(raw: string): string {
  // First pass: extract [img:URL] markers (case-insensitive) and replace with placeholders
  const imgs: string[] = [];
  const withImgs = raw.replace(/\[img:([^\]]+)\]/gi, (_m, url) => {
    imgs.push(url.trim());
    return `\u0000IMG${imgs.length - 1}\u0000`;
  });

  const parts: string[] = [];
  let i = 0;
  while (i < withImgs.length) {
    if (withImgs.startsWith("$$", i)) {
      const end = withImgs.indexOf("$$", i + 2);
      if (end === -1) { parts.push(plainSegment(withImgs.slice(i), imgs)); break; }
      parts.push(renderKatex(withImgs.slice(i + 2, end), true));
      i = end + 2;
    } else if (withImgs[i] === "$") {
      const end = withImgs.indexOf("$", i + 1);
      if (end === -1) { parts.push(plainSegment(withImgs.slice(i), imgs)); break; }
      parts.push(renderKatex(withImgs.slice(i + 1, end), false));
      i = end + 1;
    } else {
      let j = i;
      while (j < withImgs.length && withImgs[j] !== "$") j++;
      parts.push(plainSegment(withImgs.slice(i, j), imgs));
      i = j;
    }
  }
  return parts.join("");
}

function plainSegment(s: string, imgs: string[]): string {
  // Escape, then replace placeholders with <img>
  return nl2br(escape(s)).replace(/\u0000IMG(\d+)\u0000/g, (_m, idx) => {
    const url = imgs[Number(idx)] || "";
    const safe = url.replace(/"/g, "&quot;");
    return `<img src="${safe}" alt="" style="max-width:100%;height:auto;display:block;margin:8px 0;border-radius:6px;" />`;
  });
}

function renderKatex(latex: string, display: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      output: "html",
      trust: true,
      macros: { "\\ce": "\\text{#1}" }, // basic chem fallback
    });
  } catch {
    return `<code>${escape(latex)}</code>`;
  }
}

function escape(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function nl2br(s: string): string {
  return s.replace(/\n/g, "<br/>");
}
