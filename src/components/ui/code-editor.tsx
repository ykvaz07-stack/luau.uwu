"use client";

import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { StreamLanguage, StringStream } from "@codemirror/language";

const luauTheme = EditorView.theme({
  "&": {
    backgroundColor: "oklch(0.08 0.01 250)",
    color: "oklch(0.9 0 0)",
    fontSize: "13px",
    fontFamily: "var(--font-geist-mono), monospace",
  },
  ".cm-content": {
    caretColor: "#10b981",
    padding: "12px 0",
  },
  ".cm-cursor": {
    borderLeftColor: "#10b981",
    borderLeftWidth: "2px",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(99, 102, 241, 0.15) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(99, 102, 241, 0.2) !important",
  },
  ".cm-gutters": {
    backgroundColor: "oklch(0.06 0.01 250)",
    color: "oklch(0.4 0 0)",
    borderRight: "1px solid oklch(0.2 0.02 250)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "oklch(0.12 0.015 250)",
  },
  ".cm-activeLine": {
    backgroundColor: "oklch(0.1 0.012 250)",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    outline: "1px solid rgba(99, 102, 241, 0.4)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "oklch(0.15 0.015 250)",
    color: "oklch(0.7 0.2 250)",
    border: "1px solid oklch(0.25 0.02 250)",
  },
}, { dark: true });

const luauHighlighting = EditorView.baseTheme({
  ".tok-keyword": { color: "#34d399" },
  ".tok-string": { color: "#10b981" },
  ".tok-number": { color: "#fbbf24" },
  ".tok-comment": { color: "oklch(0.45 0 0)", fontStyle: "italic" },
  ".tok-function": { color: "#67e8f9" },
  ".tok-variable": { color: "oklch(0.85 0 0)" },
  ".tok-operator": { color: "#10b981" },
  ".tok-punctuation": { color: "oklch(0.6 0 0)" },
  ".tok-builtin": { color: "#34d399" },
  ".tok-type": { color: "#7dd3fc" },
  ".tok-constant": { color: "#ffd700" },
  ".tok-property": { color: "oklch(0.85 0 0)" },
  ".tok-boolean": { color: "#ffd700" },
  ".tok-nil": { color: "#ffd700" },
});

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  placeholder?: string;
}

function luauLanguage() {
  const keywords = new Set([
    "and", "break", "continue", "do", "else", "elseif", "end", "export", "false",
    "for", "function", "if", "in", "local", "nil", "not", "or", "repeat", "return",
    "then", "true", "until", "while", "type", "as", "typeof", "read", "write",
  ]);

  const builtins = new Set([
    "print", "warn", "error", "assert", "tick", "wait", "spawn", "delay",
    "require", "loadstring", "load", "pcall", "xpcall", "select", "unpack",
    "tonumber", "tostring", "type", "typeof", "pairs", "ipairs", "next",
    "rawequal", "rawget", "rawset", "rawlen", "setfenv", "getfenv",
    "math", "string", "table", "task", "coroutine", "bit32", "utf8",
    "os", "debug", "newproxy", "Enum", "game", "workspace", "script",
    "Instance", "Vector3", "Vector2", "CFrame", "Color3", "UDim2", "UDim",
    "Ray", "BrickColor", "Players",
    "getgenv", "getrenv", "getsenv", "getrawmetatable", "setrawmetatable",
    "hookfunction", "hookmetamethod", "newcclosure", "iscclosure", "islclosure",
    "checkcaller", "cloneref", "getconnections", "firesignal",
    "fireclickdetector", "fireproximityprompt", "setclipboard", "getclipboard",
    "identifyexecutor", "getexecutorname", "isreadonly", "setreadonly",
    "getgc", "getinstances", "getscripts", "getrunservice",
    "Drawing", "crypt", "base64", "http", "syn", "request", "http_request",
    "debug", "collectgarbage",
  ]);

  return {
    token(stream: StringStream) {

      if (stream.match(/^--\[\[[\s\S]*?\]\]/)) return "comment";
      if (stream.match(/^--.*/)) return "comment";
      if (stream.match(/^"[^"]*"|^'[^']*'/)) return "string";
      if (stream.match(/^\[\[[\s\S]*?\]\]/)) return "string";
      if (stream.match(/^\d+\.?\d*([eE][+-]?\d+)?/)) return "number";
      if (stream.match(/^[a-zA-Z_]\w*/)) {
        const word = stream.current();
        if (keywords.has(word)) return "keyword";
        if (builtins.has(word)) return "builtin";
        if (stream.match(/^\s*\(/)) return "function";
        return "variable";
      }
      if (stream.match(/^[=<>~]+|[+\-*/%^#<>.,;:]/)) return "operator";
      if (stream.match(/^[{}()\[\]]/)) return "punctuation";
      stream.next();
      return null;
    },
    startState() {
      return {};
    },
  };
}

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  height = "300px",
}: CodeEditorProps) {
  const handleChange = useCallback((val: string) => {
    onChange?.(val);
  }, [onChange]);

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <CodeMirror
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        height={height}
        extensions={[StreamLanguage.define(luauLanguage()), luauTheme, luauHighlighting, EditorView.lineWrapping]}
        theme="dark"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          indentOnInput: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
