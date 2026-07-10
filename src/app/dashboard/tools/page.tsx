"use client";

import { useState } from "react";
import {
  Wrench,
  Play,
  Loader2,
  Copy,
  Check,
  Shield,
  Code,
} from "lucide-react";
import { CodeEditor } from "@/components/ui/code-editor";
import { MotionDiv } from "@/components/motion";

export default function ToolsPage() {
  const [testCode, setTestCode] = useState(
    `-- Test your validation snippet here\nprint("Hello from luau.uwu!")\n\nlocal HttpService = game:GetService("HttpService")\nlocal response = HttpService:RequestAsync({\n          Url = "https://your-domain.com/api/validate",\n  Method = "POST",\n  Headers = { ["Content-Type"] = "application/json" },\n  Body = HttpService:JSONEncode({\n    key = "YOUR_KEY",\n    hwid = "test-hwid"\n  })\n})\n\nprint("Status:", response.StatusCode)\nprint("Body:", response.Body)`
  );
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(testCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <MotionDiv>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Tools
          </h1>
          <p className="text-muted-foreground">
            Utilities for testing and debugging your scripts.
          </p>
        </div>
      </MotionDiv>

      <MotionDiv delay={0.1}>
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Code Playground</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors gap-1.5 px-2.5"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
              <button className="inline-flex h-9 items-center justify-center rounded-lg gradient-accent text-sm font-medium text-white hover:opacity-90 transition-opacity gap-1.5 px-2.5">
                <Play className="h-4 w-4" />
                Run
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Write and test Luau code snippets. Use this to validate your key system integration.
          </p>
          <CodeEditor
            value={testCode}
            onChange={setTestCode}
            height="400px"
          />
        </div>
      </MotionDiv>

      <MotionDiv delay={0.2}>
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Quick Links</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="/api/validate"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                <Key className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Validation API</div>
                <div className="text-xs text-muted-foreground">GET /api/validate</div>
              </div>
            </a>
            <a
              href="/dashboard/scripts"
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                <Code className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Script Manager</div>
                <div className="text-xs text-muted-foreground">Upload & protect scripts</div>
              </div>
            </a>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
}

function Key(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}
