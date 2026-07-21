import { NextResponse } from "next/server";
import {
  lex,
  parse,
  runPipeline,
  runPipelineWithPhantomVM,
  compile,
  regCompile,
  generateVM,
  generateRegVM,
  printChunk,
} from "../../../../clyde/dist/index.js";

interface ObfuscateRequest {
  script_id: string;
  options?: {
    vmType?: "none" | "stack" | "register" | "phantom";
    vmLevel?: "debug" | "normal" | "max" | "maximum";
    perfLevel?: 1 | 2 | 3;
    encodeStrings?: boolean;
    scramble?: boolean;
  };
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

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    const opts = {
      vmType: "register" as const,
      vmLevel: "max" as "debug" | "normal" | "max" | "maximum",
      perfLevel: 3 as 1|2|3,
      ...body.options,
    };

    const { tokens, errors: lexErrors } = lex(script.content);
    if (lexErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: "Lexer error: " + lexErrors.map((e: any) => e.message || e).join(", ") },
        { status: 500 }
      );
    }

    let ast = parse(tokens);

    // Apply pipeline
    const obfuscatedAst = runPipeline(ast, {
        protectionLevel: "max",
        encodeStrings: { enabled: !!opts.encodeStrings },
        scrambleControlFlow: { enabled: !!opts.scramble },
        optimizePerformance: {
            enabled: true,
            level: opts.perfLevel,
            constantFolding: true,
            deadStoreElimination: true,
            gcOptimizations: opts.perfLevel === 3
        }
    });

    let output: string;
    if (opts.vmType === "stack") {
      const chunk = compile(obfuscatedAst);
      output = generateVM(chunk, {
        level: opts.vmLevel as any,
        executorGlobals: opts.vmLevel !== "debug",
      });
    } else if (opts.vmType === "register") {
      const chunk = regCompile(obfuscatedAst);
      const disableFeatures: any[] = [];
      if (opts.vmLevel === "debug") disableFeatures.push("controlFlowFlattening");
      output = generateRegVM(chunk, {
        level: opts.vmLevel as any,
        executorGlobals: opts.vmLevel !== "debug",
        polymorphicSeed: Date.now() ^ Math.floor(Math.random() * 0x7fffffff),
        disableFeatures,
      });
    } else if (opts.vmType === "phantom") {
      output = runPipelineWithPhantomVM(ast, {
        protectionLevel: opts.vmLevel === "debug" ? "medium" : "max",
        seed: Date.now() ^ Math.floor(Math.random() * 0x7fffffff),
        phantomVM: {
          level: opts.vmLevel === "debug" ? "min" : "max",
          seed: Date.now() ^ Math.floor(Math.random() * 0x7fffffff),
          antiDebug: opts.vmLevel === "max",
        },
      });
    } else {
      output = printChunk(obfuscatedAst);
    }

    const vmType = body.options?.vmType || "register";
    const vmLevel = body.options?.vmLevel || "maximum";
    const obfuscationLevel = vmType === "none"
      ? "basic"
      : `${vmType}_${vmLevel}`;

    const { error: updateError } = await supabase
      .from("scripts")
      .update({
        obfuscated_content: output,
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
      output_length: output?.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Obfuscation failed" },
      { status: 500 }
    );
  }
}
