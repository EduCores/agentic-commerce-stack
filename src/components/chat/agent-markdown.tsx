"use client";

import type { ReactNode } from "react";

/** URLs permitidas en imágenes/links del agente (anti-XSS). */
function safeUrl(url: string): string | null {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return u;
  return null;
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // ![alt](url) | [text](url) | **bold**
  const re = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined && m[2] !== undefined) {
      const src = safeUrl(m[2]);
      out.push(
        src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${keyBase}-img-${k}`} src={src} alt={m[1] || "producto"} className="my-2 h-auto max-h-48 w-auto rounded-lg object-cover" loading="lazy" />
        ) : (
          <span key={`${keyBase}-imgt-${k}`}>{m[1]}</span>
        ),
      );
    } else if (m[3] !== undefined && m[4] !== undefined) {
      const href = safeUrl(m[4]);
      out.push(
        href ? (
          <a key={`${keyBase}-a-${k}`} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="font-medium text-brand-600 underline">
            {m[3]}
          </a>
        ) : (
          <span key={`${keyBase}-at-${k}`}>{m[3]}</span>
        ),
      );
    } else if (m[5] !== undefined) {
      out.push(
        <strong key={`${keyBase}-b-${k}`} className="font-bold">
          {m[5]}
        </strong>,
      );
    }
    k++;
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Markdown-lite del agente: **negrita**, ![img](url), [link](url),
 * listas "- " y párrafos con aire. Sin dependencias ni HTML crudo.
 */
export function AgentMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const nodes: ReactNode[] = [];
  let listBuf: string[] = [];
  const flushList = (key: string) => {
    if (listBuf.length === 0) return;
    nodes.push(
      <ul key={key} className="my-2 list-disc space-y-1 pl-5">
        {listBuf.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  };
  blocks.forEach((block, bi) => {
    const lines = block.split("\n");
    if (lines.length > 0 && lines.every((l) => l.trim().startsWith("- ") || l.trim() === "")) {
      listBuf.push(...lines.map((l) => l.trim().replace(/^-\s+/, "")).filter(Boolean));
      flushList(`b${bi}`);
      return;
    }
    flushList(`b${bi}-pre`);
    if (block.trim() === "") return;
    // Imágenes sueltas en su propia línea van sin párrafo envolvente
    const imgOnly = block.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgOnly) {
      const src = safeUrl(imgOnly[2]);
      if (src) {
        nodes.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`b${bi}`} src={src} alt={imgOnly[1] || "producto"} className="my-2 h-auto max-h-48 w-auto rounded-lg object-cover" loading="lazy" />,
        );
        return;
      }
    }
    nodes.push(
      <p key={`b${bi}`} className="my-1.5 leading-relaxed first:mt-0 last:mb-0">
        {block.split("\n").map((line, li, arr) => (
          <span key={li}>
            {renderInline(line, `b${bi}-l${li}`)}
            {li < arr.length - 1 && <br />}
          </span>
        ))}
      </p>,
    );
  });
  flushList("tail");
  return <>{nodes}</>;
}
