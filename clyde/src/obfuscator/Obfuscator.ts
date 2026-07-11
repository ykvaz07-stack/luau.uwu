import type {
  Chunk,
  Statement,
  LastStatement,
  Expression,
  Var,
  Identifier,
  FuncName,
  Param,
} from "../ast/types.js";

const KEYWORDS = new Set([
  "and", "break", "continue", "do", "else", "elseif", "end", "export", "false",
  "for", "function", "if", "in", "local", "nil", "not", "or",
  "repeat", "return", "then", "true", "until", "while",
]);

const UNICODE_CONFUSABLES: string[] = [
  "\u0430", "\u0435", "\u043E", "\u0440", "\u0441", "\u0443",
  "\u0445", "\u0456", "\u0458", "\u0432", "\u043D", "\u043A",
  "\u043C", "\u0433", "\u0434", "\u0437", "\u0438", "\u0439",
  "\u043B", "\u043F", "\u0442", "\u0444", "\u0447", "\u0448",
  "\u0449", "\u044A", "\u044B", "\u044C", "\u044D", "\u044E",
  "\u044F",
];

const PRESERVED_GLOBALS = new Set([
  "_G", "_ENV", "_VERSION", "game", "workspace", "script", "Players",
  "Instance", "Vector3", "Vector2", "Vector2int16", "Vector3int16",
  "CFrame", "Color3", "Color3fromRGB", "Color3fromHSV", "Color3fromHex",
  "UDim2", "UDim", "Ray", "BrickColor", "Enum", "Region3", "Region3int16",
  "NumberRange", "NumberSequence", "NumberSequenceKeypoint",
  "ColorSequence", "ColorSequenceKeypoint", "Faces", "Axes",
  "Random", "Rect", "TweenInfo", "PhysicalProperties",
  "math", "string", "table", "task", "coroutine", "utf8",
  "typeof", "type", "pairs", "ipairs", "next", "pcall", "xpcall",
  "print", "warn", "error", "assert", "tick", "wait", "spawn",
  "delay", "require", "select", "tonumber", "tostring", "unpack",
  "rawequal", "rawget", "rawset", "rawlen", "rawsetmetatable",
  "getfenv", "setfenv", "newproxy", "collectgarbage",
  "loadstring", "load", "loadfile", "dofile",
  "bit32", "debug", "os", "utf8",
  "setmetatable", "getmetatable",
  "setfenv", "getfenv",
  "Players", "Workspace", "Game", "Lighting", "ReplicatedStorage",
  "ServerScriptService", "ServerStorage", "StarterGui", "StarterPack",
  "StarterPlayer", "TestService", "UserInputService", "RunService",
  "HttpService", "MarketplaceService", "DataStoreService",
  "SoundService", "Chat", "Teams", "ProximityPromptService",
  "TextService", "PathfindingService", "CollectionService",
  "TweenService", "Debris", "AnalyticsService", "ContentProvider",
  "GeometricProfiler", "LogService", "ScriptContext",
  "Stats", "TeleportService", "VRService",
  "getgenv", "getrenv", "getsenv", "getmenv",
  "getrawmetatable", "setrawmetatable", "setreadonly", "isreadonly",
  "hookfunction", "hookmetamethod", "newcclosure", "iscclosure", "islclosure",
  "checkcaller", "cloneref", "getconnections", "firesignal",
  "fireclickdetector", "fireproximityprompt", "firetouchinterest",
  "setclipboard", "getclipboard", "writefile", "readfile", "appendfile",
  "isfile", "isfolder", "makefolder", "delfile", "delfolder", "listfiles",
  "loadcustomasset", "getcustomasset",
  "identifyexecutor", "getexecutorname", "getversion",
  "getgc", "getinstances", "getscripts", "getrunservice", "gethui",
  "getsynasset", "synrequest",
  "Drawing", "crypt", "base64_encode", "base64_decode",
  "http_request", "request", "HttpGet", "HttpPost",
  "queue_on_teleport", "setfpscap", "setclipboard",
  "debug.info", "debug.profilebegin", "debug.profileend",
  "Vector3.new", "Vector2.new", "CFrame.new", "Color3.new",
  "UDim2.new", "Instance.new", "Ray.new", "BrickColor.new",
  "math.abs", "math.acos", "math.asin", "math.atan", "math.atan2",
  "math.ceil", "math.clamp", "math.cos", "math.cosh", "math.exp",
  "math.floor", "math.fmod", "math.frexp", "math.ldexp", "math.log",
  "math.max", "math.min", "math.modf", "math.noise", "math.pi",
  "math.pow", "math.rad", "math.random", "math.randomseed",
  "math.sin", "math.sinh", "math.sqrt", "math.tan", "math.tanh",
  "string.byte", "string.char", "string.dump", "string.find",
  "string.format", "string.gmatch", "string.gsub", "string.len",
  "string.lower", "string.match", "string.rep", "string.reverse",
  "string.sub", "string.upper", "string.split", "string.gsub",
  "table.concat", "table.insert", "table.remove", "table.sort",
  "table.pack", "table.unpack", "table.find", "table.foreach",
  "table.foreachi", "table.move", "table.create",
  "coroutine.create", "coroutine.resume", "coroutine.running",
  "coroutine.status", "coroutine.wrap", "coroutine.yield",
  "task.spawn", "task.delay", "task.wait", "task.cancel",
  "task.defer", "task.desynchronize", "task.synchronize",
  "utf8.char", "utf8.codepoint", "utf8.codes", "utf8.len", "utf8.offset",
]);

function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_\u00C0-\u024F][a-zA-Z0-9_\u00C0-\u024F]*$/.test(name) && !KEYWORDS.has(name);
}

function generateName(index: number): string {
  if (index < 26) return String.fromCharCode(97 + index);
  let s = "";
  let n = index;
  while (n >= 0) {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function generateUnicodeName(index: number): string {
  const base = generateName(index);
  let result = "";
  for (let i = 0; i < base.length; i++) {
    const ch = base[i];
    const code = ch.charCodeAt(0);
    if (code >= 97 && code <= 122) {
      const confusableIndex = code - 97;
      if (confusableIndex < UNICODE_CONFUSABLES.length) {
        result += UNICODE_CONFUSABLES[confusableIndex];
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }
  return result;
}

export interface ObfuscatorOptions {
  renameLocals?: boolean;
  preserveGlobals?: boolean;
  seed?: number;
  useUnicodeNames?: boolean;
}

const DEFAULT_OPTIONS: Required<ObfuscatorOptions> = {
  renameLocals: true,
  preserveGlobals: true,
  seed: 0,
  useUnicodeNames: false,
};

export function obfuscate(ast: Chunk, options: ObfuscatorOptions = {}): Chunk {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!opts.renameLocals) return ast;

  const scope = new ScopeManager(opts);
  return transformChunk(ast, scope) as Chunk;
}

class ScopeManager {
  private flat: Map<string, string> = new Map();
  private undoStack: { name: string; prev: string | undefined }[][] = [[]];
  private nameCounter = 0;
  private opts: Required<ObfuscatorOptions>;

  constructor(opts: Required<ObfuscatorOptions>) {
    this.opts = opts;
  }

  pushScope(): void {
    this.undoStack.push([]);
  }

  popScope(): void {
    const undo = this.undoStack.pop()!;
    for (let i = undo.length - 1; i >= 0; i--) {
      const entry = undo[i]!;
      if (entry.prev === undefined) {
        this.flat.delete(entry.name);
      } else {
        this.flat.set(entry.name, entry.prev);
      }
    }
  }

  declare(name: string): string {
    if (!isValidIdentifier(name)) return name;
    if (this.opts.preserveGlobals && PRESERVED_GLOBALS.has(name)) return name;
    let newName: string;
    do {
      newName = this.opts.useUnicodeNames
        ? generateUnicodeName(this.nameCounter++)
        : generateName(this.nameCounter++);
    } while (KEYWORDS.has(newName));
    const prev = this.flat.get(name);
    this.undoStack[this.undoStack.length - 1]!.push({ name, prev });
    this.flat.set(name, newName);
    return newName;
  }

  resolve(name: string): string {
    if (!isValidIdentifier(name)) return name;
    if (this.opts.preserveGlobals && PRESERVED_GLOBALS.has(name)) return name;
    return this.flat.get(name) ?? name;
  }
}

function transformChunk(chunk: Chunk, scope: ScopeManager): Chunk {
  return {
    ...chunk,
    body: chunk.body.map((s) => transformStatement(s, scope)),
  };
}

function transformStatement(stmt: Statement | LastStatement, scope: ScopeManager): Statement | LastStatement {
  switch (stmt.type) {
    case "LocalStatement": {
      const values = stmt.values?.map((e) => transformExpression(e, scope));
      const vars = stmt.vars.map((v) => ({
        ...v,
        name: scope.declare(v.name),
      }));
      return { ...stmt, vars, values };
    }
    case "LocalFunctionStatement": {
      const name = scope.declare(stmt.name);
      scope.pushScope();
      const params = stmt.params.map((p) => ({
        ...p,
        name: p.variadic ? "..." : scope.declare(p.name),
      }));
      const body = stmt.body.map((s) => transformStatement(s, scope));
      scope.popScope();
      return { ...stmt, name, params, body };
    }
    case "FunctionStatement": {
      const name = transformFuncName(stmt.name, scope);
      scope.pushScope();
      const params = stmt.params.map((p) => ({
        ...p,
        name: p.variadic ? "..." : scope.declare(p.name),
      }));
      const body = stmt.body.map((s) => transformStatement(s, scope));
      scope.popScope();
      return { ...stmt, name, params, body };
    }
    case "ForNumericStatement": {
      scope.pushScope();
      const v = scope.declare(stmt.var.name);
      const varNode: Identifier = { type: "Identifier", name: v, loc: stmt.var.loc };
      const body = stmt.body.map((s) => transformStatement(s, scope));
      scope.popScope();
      return {
        ...stmt,
        var: varNode,
        start: transformExpression(stmt.start, scope),
        end: transformExpression(stmt.end, scope),
        step: stmt.step ? transformExpression(stmt.step, scope) : undefined,
        body,
      };
    }
    case "ForInStatement": {
      scope.pushScope();
      const vars = stmt.vars.map((v) => ({
        ...v,
        name: scope.declare(v.name),
      }));
      const body = stmt.body.map((s) => transformStatement(s, scope));
      scope.popScope();
      return {
        ...stmt,
        vars,
        iter: stmt.iter.map((e) => transformExpression(e, scope)),
        body,
      };
    }
    case "TypeFunctionStatement":
    case "ExportTypeFunctionStatement": {
      scope.pushScope();
      const params = stmt.params.map((p) => ({
        ...p,
        name: p.variadic ? "..." : scope.declare(p.name),
      }));
      const body = stmt.body.map((s) => transformStatement(s, scope));
      scope.popScope();
      return { ...stmt, params, body };
    }
    case "DoStatement":
      scope.pushScope();
      const doBody = stmt.body.map((s) => transformStatement(s, scope));
      scope.popScope();
      return { ...stmt, body: doBody };
    case "WhileStatement":
      scope.pushScope();
      const whileBody = stmt.body.map((s) => transformStatement(s, scope));
      scope.popScope();
      return {
        ...stmt,
        condition: transformExpression(stmt.condition, scope),
        body: whileBody,
      };
    case "RepeatStatement":
      scope.pushScope();
      const repeatBody = stmt.body.map((s) => transformStatement(s, scope));
      scope.popScope();
      return {
        ...stmt,
        body: repeatBody,
        condition: transformExpression(stmt.condition, scope),
      };
    case "IfStatement":
      scope.pushScope();
      const thenBody = stmt.thenBody.map((s) => transformStatement(s, scope));
      const elseifClauses = stmt.elseifClauses.map((c) => ({
        condition: transformExpression(c.condition, scope),
        body: c.body.map((s) => transformStatement(s, scope)),
      }));
      const elseBody = stmt.elseBody?.map((s) => transformStatement(s, scope));
      scope.popScope();
      return {
        ...stmt,
        condition: transformExpression(stmt.condition, scope),
        thenBody,
        elseifClauses,
        elseBody,
      };
    case "AssignmentStatement":
      return {
        ...stmt,
        vars: stmt.vars.map((v) => transformVar(v, scope)),
        values: stmt.values.map((e) => transformExpression(e, scope)),
      };
    case "CompoundAssignmentStatement":
      return {
        ...stmt,
        var: transformVar(stmt.var, scope),
        value: transformExpression(stmt.value, scope),
      };
    case "FunctionCallStatement":
      return {
        ...stmt,
        call: transformExpression(stmt.call, scope) as any,
      };
    case "ReturnStatement":
      return {
        ...stmt,
        values: stmt.values?.map((e) => transformExpression(e, scope)),
      };
    default:
      return stmt;
  }
}

function transformFuncName(fn: FuncName, scope: ScopeManager): FuncName {
  const base = fn.base.type === "Identifier"
    ? { ...fn.base, name: scope.resolve(fn.base.name) }
    : transformExpression(fn.base, scope) as Identifier | import("../ast/types.js").MemberExpression;
  return { ...fn, base };
}

function transformVar(v: Var, scope: ScopeManager): Var {
  switch (v.type) {
    case "Identifier":
      return { ...v, name: scope.resolve(v.name) };
    case "IndexExpression":
      return {
        ...v,
        object: transformExpression(v.object, scope),
        index: transformExpression(v.index, scope),
      };
    case "MemberExpression":
      return {
        ...v,
        object: transformExpression(v.object, scope),
      };
    default:
      return v;
  }
}

function transformExpression(exp: Expression, scope: ScopeManager): Expression {
  switch (exp.type) {
    case "Identifier":
      return { ...exp, name: scope.resolve(exp.name) };
    case "BinaryExpression":
      return {
        ...exp,
        left: transformExpression(exp.left, scope),
        right: transformExpression(exp.right, scope),
      };
    case "UnaryExpression":
      return {
        ...exp,
        argument: transformExpression(exp.argument, scope),
      };
    case "CallExpression":
      return {
        ...exp,
        callee: transformExpression(exp.callee, scope),
        args: exp.args.map((a) => transformExpression(a, scope)),
      };
    case "MethodCallExpression":
      return {
        ...exp,
        object: transformExpression(exp.object, scope),
        args: exp.args.map((a) => transformExpression(a, scope)),
      };
    case "IndexExpression":
      return {
        ...exp,
        object: transformExpression(exp.object, scope),
        index: transformExpression(exp.index, scope),
      };
    case "MemberExpression":
      return {
        ...exp,
        object: transformExpression(exp.object, scope),
      };
    case "TableConstructor":
      return {
        ...exp,
        fields: exp.fields.map((f) => {
          if (f.kind === "index") return { ...f, index: transformExpression(f.index, scope), value: transformExpression(f.value, scope) };
          if (f.kind === "named") return { ...f, value: transformExpression(f.value, scope) };
          return { ...f, value: transformExpression(f.value, scope) };
        }),
      };
    case "FunctionExpression": {
      scope.pushScope();
      const params = exp.params.map((p) => ({
        ...p,
        name: p.variadic ? "..." : scope.declare(p.name),
      }));
      const body = exp.body.map((s) => transformStatement(s, scope));
      scope.popScope();
      return { ...exp, params, body };
    }
    case "ParenExpression":
      return { ...exp, expression: transformExpression(exp.expression, scope) };
    case "TypeAssertion":
      return {
        ...exp,
        expression: transformExpression(exp.expression, scope),
      };
    case "IfElseExpression":
      return {
        ...exp,
        condition: transformExpression(exp.condition, scope),
        thenExp: transformExpression(exp.thenExp, scope),
        elseifClauses: exp.elseifClauses.map((c) => ({
          condition: transformExpression(c.condition, scope),
          value: transformExpression(c.value, scope),
        })),
        elseExp: transformExpression(exp.elseExp, scope),
      };
    case "StringInterpolation":
      return {
        ...exp,
        parts: exp.parts.map((p) => (typeof p === "string" ? p : transformExpression(p, scope))),
      };
    default:
      return exp;
  }
}
