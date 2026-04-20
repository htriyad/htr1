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
  // Split on $$...$$ first (display), then $...$ (inline)
  const parts: string[] = [];
  let i = 0;
  while (i < raw.length) {
    if (raw.startsWith("$$", i)) {
      const end = raw.indexOf("$$", i + 2);
      if (end === -1) { parts.push(escape(raw.slice(i))); break; }
      parts.push(renderKatex(raw.slice(i + 2, end), true));
      i = end + 2;
    } else if (raw[i] === "$") {
      const end = raw.indexOf("$", i + 1);
      if (end === -1) { parts.push(escape(raw.slice(i))); break; }
      parts.push(renderKatex(raw.slice(i + 1, end), false));
      i = end + 1;
    } else {
      // collect normal text until next $ or $$
      let j = i;
      while (j < raw.length && raw[j] !== "$") j++;
      parts.push(nl2br(escape(raw.slice(i, j))));
      i = j;
    }
  }
  return parts.join("");
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
