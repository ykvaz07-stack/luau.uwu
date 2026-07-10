import { NextResponse } from "next/server";
import path from "path";

interface ObfuscateRequest {
  script_id: string;
  options?: {
    vmType?: "none" | "stack" | "register";
    vmLevel?: "debug" | "normal" | "maximum";
    encodeStrings?: boolean;
    scramble?: boolean;
  };
}

interface ObfuscateResult {
  success: boolean;
  output?: string;
  error?: string;
}

const clydeBase = path.join(process.cwd(), "clyde", "dist");

async function obfuscateCode(code: string, options: ObfuscateRequest["options"] = {}): Promise<ObfuscateResult> {
  const opts = {
    vmType: "register" as const,
    vmLevel: "maximum" as const,
    encodeStrings: true,
    scramble: true,
    oneLine: false,
    noRename: false,
    noPreserve: false,
    ...options,
  };

  const { lex } = await import(/* webpackIgnore: true */ path.join(clydeBase, "lexer", "Lexer.js"));
  const { parse } = await import(/* webpackIgnore: true */ path.join(clydeBase, "parser", "Parser.js"));
  const { obfuscate } = await import(/* webpackIgnore: true */ path.join(clydeBase, "obfuscator", "Obfuscator.js"));
  const { encodeStrings } = await import(/* webpackIgnore: true */ path.join(clydeBase, "obfuscator", "StringEncoder.js"));
  const { scrambleControlFlow } = await import(/* webpackIgnore: true */ path.join(clydeBase, "obfuscator", "ControlFlowScrambler.js"));
  const { printChunk, printChunkOneLine } = await import(/* webpackIgnore: true */ path.join(clydeBase, "obfuscator", "Printer.js"));
  const { compile } = await import(/* webpackIgnore: true */ path.join(clydeBase, "vm", "Compiler.js"));
  const { regCompile } = await import(/* webpackIgnore: true */ path.join(clydeBase, "vm", "RegCompiler.js"));
  const { generateVM } = await import(/* webpackIgnore: true */ path.join(clydeBase, "vm", "vm-gen.js"));
  const { generateRegVM } = await import(/* webpackIgnore: true */ path.join(clydeBase, "vm", "reg-vm-gen.js"));

  const { tokens, errors: lexErrors } = lex(code);
  if (lexErrors.length > 0) {
    return { success: false, error: "Lexer error: " + lexErrors.map((e: any) => e.message || e).join(", ") };
  }

  let ast = parse(tokens);

  if (opts.encodeStrings) {
    ast = encodeStrings(ast, { enabled: true });
  }

  if (opts.scramble) {
    ast = scrambleControlFlow(ast, { enabled: true });
  }

  let output: string;
  if (opts.vmType === "stack") {
    const obfuscated = obfuscate(ast, {
      renameLocals: !opts.noRename,
      preserveGlobals: !opts.noPreserve,
    });
    const chunk = compile(obfuscated);
    output = generateVM(chunk, {
      level: opts.vmLevel,
      executorGlobals: opts.vmLevel !== "debug",
    });
  } else if (opts.vmType === "register") {
    const obfuscated = obfuscate(ast, {
      renameLocals: !opts.noRename,
      preserveGlobals: !opts.noPreserve,
    });
    const chunk = regCompile(obfuscated);
    const disableFeatures: string[] = [];
    if (opts.vmLevel === "debug") disableFeatures.push("controlFlowFlattening");
    output = generateRegVM(chunk, {
      level: opts.vmLevel,
      executorGlobals: opts.vmLevel !== "debug",
      polymorphicSeed: Date.now(),
      disableFeatures,
    });
  } else {
    const obfuscated = obfuscate(ast, {
      renameLocals: !opts.noRename,
      preserveGlobals: !opts.noPreserve,
    });
    output = opts.oneLine ? printChunkOneLine(obfuscated) : printChunk(obfuscated);
  }

  return { success: true, output };
}

export async function POST(request: Request) {
  try {
    const body: ObfuscateRequest = await request.json();

    if (!body.script_id) {
      return NextResponse.json(
        { success: false, error: "Missing script_id" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: script, error: fetchError } = await supabase
      .from("scripts")
      .select("id, content")
      .eq("id", body.script_id)
      .single();

    if (fetchError || !script) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    const result = await obfuscateCode(script.content, body.options);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    const obfuscationLevel = body.options?.vmType === "none"
      ? "basic"
      : `${body.options?.vmType || "register"}_${body.options?.vmLevel || "maximum"}`;

    const { error: updateError } = await supabase
      .from("scripts")
      .update({
        obfuscated_content: result.output,
        obfuscation_level: obfuscationLevel,
      })
      .eq("id", body.script_id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Failed to save obfuscated script" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      obfuscation_level: obfuscationLevel,
      output_length: result.output?.length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
