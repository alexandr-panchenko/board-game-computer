import { tokenizer } from "acorn";
import type { ReactNode } from "react";

interface HighlightToken {
  start: number;
  end: number;
  kind: string;
}

export function highlightSource(source: string): ReactNode[] {
  const comments: HighlightToken[] = [];
  const tokens: Array<HighlightToken & { label: string; keyword?: string }> =
    [];

  try {
    const scanner = tokenizer(source, {
      ecmaVersion: "latest",
      sourceType: "script",
      onComment: (_block, _text, start, end) => {
        comments.push({ start, end, kind: "comment" });
      },
    });
    while (true) {
      const token = scanner.getToken();
      if (token.type.label === "eof") break;
      tokens.push({
        start: token.start,
        end: token.end,
        label: token.type.label,
        ...(token.type.keyword === undefined
          ? {}
          : { keyword: token.type.keyword }),
        kind: "punctuation",
      });
    }
  } catch {
    return [
      <span className="syntax-error" key="error">
        {source}
      </span>,
    ];
  }

  const significant = tokens.map((token, index) => ({
    ...token,
    kind: classifyToken(token, tokens[index - 1], source.slice(token.end)),
  }));
  const ranges = [...comments, ...significant].sort(
    (left, right) => left.start - right.start || right.end - left.end,
  );
  const output: ReactNode[] = [];
  let cursor = 0;
  for (const [index, range] of ranges.entries()) {
    if (range.start < cursor) continue;
    if (range.start > cursor) output.push(source.slice(cursor, range.start));
    output.push(
      <span className={`syntax-${range.kind}`} key={`${range.start}-${index}`}>
        {source.slice(range.start, range.end)}
      </span>,
    );
    cursor = range.end;
  }
  if (cursor < source.length) output.push(source.slice(cursor));
  return output;
}

function classifyToken(
  token: HighlightToken & { label: string; keyword?: string },
  previous: (HighlightToken & { label: string; keyword?: string }) | undefined,
  remainder: string,
): string {
  if (token.keyword !== undefined) return "keyword";
  if (["string", "template", "regexp"].includes(token.label)) return "string";
  if (["num", "bigint"].includes(token.label)) return "number";
  if (token.label !== "name") return "punctuation";
  if (
    previous?.keyword !== undefined &&
    ["const", "let", "var", "function", "class"].includes(previous.keyword)
  )
    return "declaration";
  if (previous?.label === ".") return "property";
  if (/^\s*\(/.test(remainder)) return "call";
  return "name";
}
