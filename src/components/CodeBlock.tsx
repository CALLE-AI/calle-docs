import { Children, isValidElement, useMemo, useState } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";

type CodeElementProps = {
  className?: string;
  children?: ReactNode;
};

type HighlightSpec = {
  className: string;
  pattern: RegExp;
};

const jsonHighlightSpecs: HighlightSpec[] = [
  { className: "token-comment", pattern: /\/\/.*/ },
  { className: "token-key", pattern: /"(?:\\.|[^"\\])*"(?=\s*:)/ },
  { className: "token-string", pattern: /"(?:\\.|[^"\\])*"/ },
  { className: "token-number", pattern: /-?\b\d+(?:\.\d+)?\b/ },
  { className: "token-constant", pattern: /\b(?:true|false|null)\b/ },
  { className: "token-punctuation", pattern: /[{}[\](),:]/ },
];

const tsHighlightSpecs: HighlightSpec[] = [
  { className: "token-comment", pattern: /\/\/.*/ },
  { className: "token-string", pattern: /`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/ },
  { className: "token-keyword", pattern: /\b(?:async|await|const|export|from|function|if|import|let|new|return|type)\b/ },
  { className: "token-constant", pattern: /\b(?:false|null|true|undefined)\b/ },
  { className: "token-number", pattern: /\b\d[\d_]*(?:\.\d+)?\b/ },
  { className: "token-key", pattern: /[A-Za-z_$][\w$]*(?=\s*:)/ },
  { className: "token-function", pattern: /[A-Za-z_$][\w$]*(?=\()/ },
  { className: "token-punctuation", pattern: /[{}[\](),.;:]/ },
];

const pythonHighlightSpecs: HighlightSpec[] = [
  { className: "token-comment", pattern: /#.*/ },
  { className: "token-string", pattern: /'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/ },
  { className: "token-keyword", pattern: /\b(?:False|None|True|def|from|if|import|return)\b/ },
  { className: "token-number", pattern: /\b\d+(?:\.\d+)?\b/ },
  { className: "token-function", pattern: /[A-Za-z_]\w*(?=\()/ },
  { className: "token-punctuation", pattern: /[{}[\](),.:]/ },
];

const bashHighlightSpecs: HighlightSpec[] = [
  { className: "token-comment", pattern: /#.*/ },
  { className: "token-string", pattern: /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/ },
  { className: "token-env", pattern: /\$\{?[A-Z_][A-Z0-9_]*\}?/ },
  { className: "token-shell-command", pattern: /\b(?:curl|export|node|pip|pnpm|python)\b/ },
  { className: "token-shell-flag", pattern: /--?[A-Za-z][\w-]*/ },
  { className: "token-punctuation", pattern: /[{}[\](),=]/ },
];

export function CodeBlock(props: HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);
  const { children, ...preProps } = props;
  const codeText = useMemo(() => extractCodeText(children), [children]);
  const language = useMemo(() => extractLanguage(children), [children]);
  const highlightedCode = useMemo(
    () => highlightCode(codeText, language),
    [codeText, language],
  );

  async function copyCode() {
    if (!navigator.clipboard || !codeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      return;
    }
  }

  return (
    <div className="code-block" data-language={language || undefined}>
      <button className="code-copy-button" type="button" onClick={copyCode}>
        {copied ? "Copied" : "Copy"}
      </button>
      <pre {...preProps}>
        <code className={language ? `language-${language}` : undefined}>
          {highlightedCode}
        </code>
      </pre>
    </div>
  );
}

function extractCodeText(children: ReactNode): string {
  const codeElement = extractCodeElement(children);
  return String(codeElement?.props.children ?? "").trimEnd();
}

function extractLanguage(children: ReactNode): string {
  const codeElement = extractCodeElement(children);
  const languageMatch = codeElement?.props.className?.match(/language-([\w-]+)/);
  return languageMatch?.[1] ?? "";
}

function extractCodeElement(
  children: ReactNode,
): ReactElement<CodeElementProps> | null {
  const onlyChild = Children.toArray(children)[0];
  if (!isValidElement(onlyChild)) {
    return null;
  }

  return onlyChild as ReactElement<CodeElementProps>;
}

function highlightCode(codeText: string, language: string): ReactNode[] {
  const specs = getHighlightSpecs(language);
  if (specs.length === 0) {
    return [codeText];
  }

  return codeText.split("\n").flatMap((line, lineIndex, lines) => {
    const highlightedLine = highlightLine(line, specs, lineIndex);
    if (lineIndex === lines.length - 1) {
      return highlightedLine;
    }

    return [...highlightedLine, "\n"];
  });
}

function getHighlightSpecs(language: string): HighlightSpec[] {
  if (language === "json") {
    return jsonHighlightSpecs;
  }

  if (language === "python" || language === "py") {
    return pythonHighlightSpecs;
  }

  if (language === "bash" || language === "sh" || language === "shell") {
    return bashHighlightSpecs;
  }

  if (language === "ts" || language === "tsx" || language === "js") {
    return tsHighlightSpecs;
  }

  return [];
}

function highlightLine(
  line: string,
  specs: HighlightSpec[],
  lineIndex: number,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let plainText = "";
  let index = 0;

  while (index < line.length) {
    const match = findTokenMatch(line.slice(index), specs);
    if (!match) {
      plainText += line[index];
      index += 1;
      continue;
    }

    if (plainText) {
      nodes.push(plainText);
      plainText = "";
    }

    nodes.push(
      <span
        className={`code-token ${match.className}`}
        key={`${lineIndex}-${index}-${match.text}`}
      >
        {match.text}
      </span>,
    );
    index += match.text.length;
  }

  if (plainText) {
    nodes.push(plainText);
  }

  return nodes;
}

function findTokenMatch(
  source: string,
  specs: HighlightSpec[],
): { className: string; text: string } | null {
  for (const spec of specs) {
    const regex = new RegExp(`^(?:${spec.pattern.source})`);
    const match = regex.exec(source);
    if (match?.[0]) {
      return { className: spec.className, text: match[0] };
    }
  }

  return null;
}
