import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface MarkdownProps {
  content: string;
}

export default function Markdown({ content }: MarkdownProps) {
  if (!content || typeof content !== "string") return null;

  try {
    // Split content by code blocks to separate formatted text from code snippets
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-3 text-sm leading-relaxed text-slate-900 break-words font-normal">
        {parts.map((part, index) => {
          if (!part) return null;
          if (part.startsWith("```") && part.endsWith("```")) {
            // Extract language and code
            const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
            const lang = match ? match[1] : "";
            const code = match ? match[2] : part.slice(3, -3);

            return (
              <div key={index}>
                <CodeBlock language={lang || ""} code={(code || "").trim()} />
              </div>
            );
          } else {
            // Format inline markdown (bold, italic, inline code, lists)
            return (
              <div key={index}>
                <FormattedText text={part} />
              </div>
            );
          }
        })}
      </div>
    );
  } catch (err) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-900/90 shadow-md font-mono text-xs text-gray-200">
      <div className="flex items-center justify-between bg-gray-900/50 px-4 py-2 border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-400">
        <span>{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md hover:bg-gray-800 p-1 px-1.5 transition-colors cursor-pointer text-gray-400 hover:text-white"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-4 max-h-[400px]">
        <pre className="whitespace-pre">{code}</pre>
      </div>
    </div>
  );
}

interface FormattedTextProps {
  text: string;
}

function FormattedText({ text }: FormattedTextProps) {
  if (!text || typeof text !== "string") return null;
  // Convert standard line breaks
  const lines = text.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, lineIdx) => {
        const trimmed = (line || "").trim();

        // 1. Headers
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={lineIdx} className="text-xl font-bold text-slate-900 mt-4 mb-2 tracking-tight">
              {parseInlineMarkdown(trimmed.substring(2))}
            </h1>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={lineIdx} className="text-lg font-bold text-slate-900 mt-3 mb-2 tracking-tight">
              {parseInlineMarkdown(trimmed.substring(3))}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={lineIdx} className="text-base font-bold text-slate-900 mt-2 mb-1">
              {parseInlineMarkdown(trimmed.substring(4))}
            </h3>
          );
        }

        // 2. Blockquotes
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={lineIdx} className="border-l-3 border-indigo-500 pl-3.5 text-slate-700 bg-indigo-50/50 py-1.5 rounded-r-lg font-medium my-2">
              {parseInlineMarkdown(trimmed.substring(2))}
            </blockquote>
          );
        }

        // 3. Bullet points
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-3 my-1">
              <span className="text-indigo-600 font-bold select-none text-base leading-none mt-0.5">•</span>
              <span className="flex-1 text-slate-900 font-normal leading-relaxed">{parseInlineMarkdown(trimmed.substring(2))}</span>
            </div>
          );
        }

        // 4. Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-3 my-1">
              <span className="text-indigo-600 font-bold font-mono select-none text-xs min-w-[16px] mt-0.5">{numMatch[1]}.</span>
              <span className="flex-1 text-slate-900 font-normal leading-relaxed">{parseInlineMarkdown(numMatch[2])}</span>
            </div>
          );
        }

        // 5. Empty line
        if (trimmed === "") {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // 6. Normal paragraph line
        return (
          <p key={lineIdx} className="text-slate-900 leading-relaxed font-normal">
            {parseInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

// Function to handle inline elements like bold, italic, and code
function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text || typeof text !== "string") return [];

  // Match bold (**), italic (* or _), and inline code (`)
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-900 font-medium">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded-md bg-indigo-50 font-mono text-xs font-semibold text-indigo-950 border border-indigo-200/80 shadow-2xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
