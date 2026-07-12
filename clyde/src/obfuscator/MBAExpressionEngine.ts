import type { Expression } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";

function makeLoc(start: SourceLocation["start"], end: SourceLocation["end"]): SourceLocation {
  return { start, end };
}

function cloneLoc(loc?: SourceLocation): SourceLocation {
  return loc ?? { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };
}

function intExp(value: number, loc: SourceLocation): Expression {
  return { type: "NumberLiteral", value: String(value), raw: String(value), loc };
}

function binExp(left: Expression, operator: string, right: Expression, loc: SourceLocation): Expression {
  return { type: "BinaryExpression", operator, left, right, loc };
}

export interface MBAConfig {
  depth?: number;
  seed?: number;
}

export class MBAEngine {
  private rng: () => number;
  private seed: number;

  constructor(config: MBAConfig = {}) {
    this.seed = config.seed ?? 0;
    this.rng = this.createRng(this.seed);
  }

  private createRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  private randInt(min: number, max: number): number {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  obfuscateNumber(n: number, loc?: SourceLocation): Expression {
    const l = cloneLoc(loc);
    const variant = this.randInt(0, 8);

    switch (variant) {
      case 0: {
        const a = this.randInt(1, Math.max(1, Math.abs(n) + 100));
        return binExp(intExp(a, l), "+", intExp(n - a, l), l);
      }
      case 1: {
        const b = this.randInt(1, 500);
        return binExp(intExp(n + b, l), "-", intExp(b, l), l);
      }
      case 2: {
        const a = this.randInt(2, 20);
        const rem = ((n % a) + a) % a;
        const q = (n - rem) / a;
        if (q < 0) {
          const pad = this.randInt(100, 1000);
          return binExp(intExp(n + pad, l), "-", intExp(pad, l), l);
        }
        const expr = binExp(intExp(a, l), "*", intExp(q, l), l);
        return binExp(expr, "+", intExp(rem, l), l);
      }
      case 3: {
        const a = this.randInt(2, 10);
        const b = Math.ceil(Math.abs(n) / a) + this.randInt(1, 50);
        const c = a * b - n;
        const expr = binExp(intExp(a, l), "*", intExp(b, l), l);
        return binExp(expr, "-", intExp(c, l), l);
      }
      case 4: {
        const a = this.randInt(1, 50);
        const b = this.randInt(1, 50);
        const c = this.randInt(1, 50);
        const d = this.randInt(1, 50);
        const left = binExp(intExp(a, l), "*", intExp(b, l), l);
        const right = binExp(intExp(c, l), "*", intExp(d, l), l);
        const total = a * b - c * d;
        const diff = n - total;
        if (diff >= 0) return binExp(binExp(left, "-", right, l), "+", intExp(diff, l), l);
        return binExp(binExp(left, "-", right, l), "-", intExp(-diff, l), l);
      }
      case 5: {
        const x = this.randInt(1, 100);
        const y = this.randInt(1, 100);
        const target = n - (x + y);
        const sum = binExp(intExp(x, l), "+", intExp(y, l), l);
        if (target >= 0) return binExp(sum, "+", intExp(target, l), l);
        return binExp(sum, "-", intExp(-target, l), l);
      }
      case 6: {
        const a = this.randInt(2, 15);
        const b = this.randInt(2, 15);
        const prod = a * b;
        const diff = n - prod;
        if (diff >= 0) {
          const expr = binExp(intExp(a, l), "*", intExp(b, l), l);
          return binExp(expr, "+", intExp(diff, l), l);
        }
        const expr = binExp(intExp(a, l), "*", intExp(b, l), l);
        return binExp(expr, "-", intExp(-diff, l), l);
      }
      default: {
        const a = this.randInt(2, 12);
        const pad = this.randInt(1, 100);
        const total = n + pad;
        const q = Math.floor(total / a);
        const r = total - a * q;
        const expr = binExp(intExp(a, l), "*", intExp(q, l), l);
        return binExp(binExp(expr, "+", intExp(r, l), l), "-", intExp(pad, l), l);
      }
    }
  }

  obfuscateNumberWithBitops(n: number, loc?: SourceLocation): Expression {
    const l = cloneLoc(loc);
    const variant = this.randInt(0, 3);

    switch (variant) {
      case 0: {
        const a = this.randInt(1, 64);
        const b = 1 << a;
        const mask = (1 << a) - 1;
        const low = n & mask;
        const high = (n >> a) & ((1 << (32 - a)) - 1);
        const shifted = binExp(intExp(high, l), "<<", intExp(a, l), l);
        return binExp(shifted, "|", intExp(low, l), l);
      }
      case 1: {
        const a = this.randInt(1, 31);
        const b = n ^ (1 << a);
        return binExp(intExp(b, l), "~", intExp(1 << a, l), l);
      }
      case 2: {
        const a = this.randInt(1, 100);
        const b = this.randInt(1, 100);
        const lhs = binExp(intExp(a, l), "+", intExp(b, l), l);
        const rhs = binExp(intExp(a, l), "-", intExp(b, l), l);
        const prod = a + b;
        const diff = a - b;
        const total = prod * diff;
        const target = n - total;
        const expr = binExp(lhs, "*", rhs, l);
        if (target >= 0) return binExp(expr, "+", intExp(target, l), l);
        return binExp(expr, "-", intExp(-target, l), l);
      }
      default: {
        const a = this.randInt(1, 255);
        const b = this.randInt(1, 255);
        const axb = a ^ b;
        return binExp(binExp(intExp(n ^ axb, l), "~", intExp(a, l), l), "~", intExp(b, l), l);
      }
    }
  }

  createOpaquePredicate(loc?: SourceLocation): { condition: Expression; expected: boolean } {
    const l = cloneLoc(loc);
    const isTrue = this.rng() > 0.5;
    const variant = this.randInt(0, 7);

    switch (variant) {
      case 0: {
        const a = this.randInt(2, 100);
        const b = this.randInt(2, 100);
        const c = isTrue ? a + b : a + b + this.randInt(1, 50);
        return {
          condition: binExp(binExp(intExp(a, l), "+", intExp(b, l), l), "==", intExp(c, l), l),
          expected: isTrue,
        };
      }
      case 1: {
        const a = this.randInt(2, 50);
        const b = this.randInt(2, 50);
        const c = isTrue ? a * b : a * b + this.randInt(1, 100);
        return {
          condition: binExp(binExp(intExp(a, l), "*", intExp(b, l), l), "==", intExp(c, l), l),
          expected: isTrue,
        };
      }
      case 2: {
        const a = this.randInt(10, 1000);
        const b = this.randInt(2, 50);
        const rem = a % b;
        const c = isTrue ? rem : rem + this.randInt(1, b - 1);
        return {
          condition: binExp(binExp(intExp(a, l), "%", intExp(b, l), l), "==", intExp(c, l), l),
          expected: isTrue,
        };
      }
      case 3: {
        const base = this.randInt(2, 20);
        const exp = this.randInt(2, 6);
        const result = Math.pow(base, exp);
        const c = isTrue ? result : result + this.randInt(1, 100);
        return {
          condition: binExp(binExp(intExp(base, l), "^", intExp(exp, l), l), "==", intExp(c, l), l),
          expected: isTrue,
        };
      }
      case 4: {
        const a = this.randInt(2, 200);
        const b = this.randInt(2, 200);
        const axb = a ^ b;
        const c = isTrue ? axb : axb ^ this.randInt(1, 255);
        return {
          condition: binExp(binExp(intExp(a, l), "~", intExp(b, l), l), "==", intExp(c, l), l),
          expected: isTrue,
        };
      }
      case 5: {
        const a = this.randInt(1, 50);
        const b = this.randInt(1, 50);
        const c = this.randInt(1, 50);
        const lhs = binExp(intExp(a, l), "+", intExp(b, l), l);
        const rhs = binExp(intExp(c, l), "*", intExp(2, l), l);
        const target = isTrue ? a + b : a + b + this.randInt(1, 20);
        return {
          condition: binExp(lhs, "==", binExp(rhs, "+", intExp(target - 2 * c, l), l), l),
          expected: isTrue,
        };
      }
      case 6: {
        const a = this.randInt(20, 100);
        const b = this.randInt(20, 100);
        const top = binExp(intExp(a, l), ">", intExp(b, l), l);
        const bot = binExp(intExp(b, l), ">", intExp(a, l), l);
        if (isTrue) {
          return {
            condition: binExp(top, "or", bot, l),
            expected: true,
          };
        }
        return {
          condition: binExp(top, "and", bot, l),
          expected: false,
        };
      }
      default: {
        const a = this.randInt(1, 10);
        const b = this.randInt(1, 10);
        const lhs = binExp(intExp(a, l), "^", intExp(this.randInt(2, 4), l), l);
        const rhs = binExp(intExp(b, l), "^", intExp(this.randInt(2, 4), l), l);
        const val1 = Math.pow(a, 2);
        const val2 = Math.pow(b, 2);
        const diff = Math.abs(val1 - val2);
        const target = isTrue ? lhs : rhs;
        return {
          condition: binExp(binExp(lhs, ">", rhs, l), "and", binExp(intExp(diff, l), ">", intExp(0, l), l), l),
          expected: isTrue,
        };
      }
    }
  }

  createAntiDSEPredicate(loc?: SourceLocation): Expression {
    const l = cloneLoc(loc);
    const variant = this.randInt(0, 4);

    switch (variant) {
      case 0: {
        const a = this.randInt(1, 3);
        const b = this.randInt(1, 3);
        return binExp(
          binExp(intExp(a, l), "+", intExp(b, l), l),
          "==",
          binExp(intExp(Math.sqrt(a * a + 2 * a * b + b * b), l), "+",
            intExp(0, l), l),
          l
        );
      }
      case 1: {
        const a = this.randInt(1, 5000);
        const b = this.randInt(1, 5000);
        return binExp(
          binExp(intExp(a, l), "%", intExp(b, l), l),
          "==",
          binExp(intExp(a, l), "-",
            binExp(intExp(Math.floor(a / b), l), "*", intExp(b, l), l), l),
          l
        );
      }
      default: {
        const a = this.randInt(3, 15);
        const b = this.randInt(3, 15);
        const term1 = binExp(intExp(a, l), "+", intExp(b, l), l);
        const term2 = binExp(intExp(a * a, l), "-", binExp(intExp(b * b, l), "/", intExp(a - b || 1, l), l), l);
        return binExp(term1, "==", term2, l);
      }
    }
  }

  createMBAInt(n: number, loc?: SourceLocation): Expression {
    const l = cloneLoc(loc);
    const variant = this.randInt(0, 9);

    switch (variant) {
      case 0: {
        const a = this.randInt(1, 255);
        const b = this.randInt(1, 255);
        const axb = a ^ b;
        return binExp(binExp(intExp(n ^ axb, l), "~", intExp(a, l), l), "~", intExp(b, l), l);
      }
      case 1: {
        const a = this.randInt(1, 32);
        const mask = (1 << a) - 1;
        const low = n & mask;
        const high = (n >> a) & ((1 << (32 - a)) - 1);
        const shifted = binExp(intExp(high, l), "<<", intExp(a, l), l);
        return binExp(shifted, "|", intExp(low, l), l);
      }
      case 2: {
        const a = this.randInt(2, 50);
        const b = this.randInt(2, 50);
        const c = a * b;
        const left = binExp(intExp(a, l), "*", intExp(b, l), l);
        const diff = n - c;
        if (diff >= 0) return binExp(left, "+", intExp(diff, l), l);
        return binExp(left, "-", intExp(-diff, l), l);
      }
      case 3: {
        const a = this.randInt(1, 100);
        const b = this.randInt(1, 100);
        const sumExpr = binExp(intExp(a, l), "+", intExp(b, l), l);
        const diffExpr = binExp(intExp(a, l), "-", intExp(b, l), l);
        const prod = (a + b) * (a - b);
        const diff2 = n - prod;
        const expr = binExp(sumExpr, "*", diffExpr, l);
        if (diff2 >= 0) return binExp(expr, "+", intExp(diff2, l), l);
        return binExp(expr, "-", intExp(-diff2, l), l);
      }
      case 4: {
        const a = this.randInt(2, 10);
        const b = this.randInt(2, 10);
        const lhs = binExp(intExp(a, l), "~", intExp(b, l), l);
        const rhs = binExp(intExp(a, l), "&", intExp(b, l), l);
        const sum = (a ^ b) + (a & b);
        const diff = n - sum;
        const expr = binExp(lhs, "+", rhs, l);
        if (diff >= 0) return binExp(expr, "+", intExp(diff, l), l);
        return binExp(expr, "-", intExp(-diff, l), l);
      }
      case 5: {
        const a = this.randInt(1, 50);
        const b = this.randInt(1, 50);
        const lhs = binExp(intExp(a, l), "|", intExp(b, l), l);
        const rhs = binExp(intExp(a, l), "&", intExp(b, l), l);
        const sum = (a | b) + (a & b);
        const diff = n - sum;
        const expr = binExp(lhs, "+", rhs, l);
        if (diff >= 0) return binExp(expr, "+", intExp(diff, l), l);
        return binExp(expr, "-", intExp(-diff, l), l);
      }
      case 6: {
        const a = this.randInt(2, 8);
        const b = this.randInt(1, 50);
        const c = a * b;
        const divExpr = binExp(intExp(c, l), "/", intExp(a, l), l);
        const diff = n - b;
        if (diff >= 0) return binExp(divExpr, "+", intExp(diff, l), l);
        return binExp(divExpr, "-", intExp(-diff, l), l);
      }
      case 7: {
        const a = this.randInt(3, 15);
        const b = this.randInt(2, 10);
        const tot = a * b;
        const rhs = binExp(intExp(tot, l), "/", intExp(b, l), l);
        const diff = n - a;
        if (diff >= 0) return binExp(rhs, "+", intExp(diff, l), l);
        return binExp(rhs, "-", intExp(-diff, l), l);
      }
      case 8: {
        const a = this.randInt(2, 100);
        const b = this.randInt(2, 100);
        const lhs = binExp(intExp(a + b, l), "-", intExp(b, l), l);
        const diff = n - a;
        if (diff >= 0) return binExp(lhs, "+", intExp(diff, l), l);
        return binExp(lhs, "-", intExp(-diff, l), l);
      }
      default: {
        const a = this.randInt(2, 10);
        const pad = this.randInt(1, 100);
        const total = n + pad;
        const q = Math.floor(total / a);
        const r = total - a * q;
        const expr = binExp(intExp(a, l), "*", intExp(q, l), l);
        return binExp(binExp(expr, "+", intExp(r, l), l), "-", intExp(pad, l), l);
      }
    }
  }

  createIdentityOpaque(loc?: SourceLocation): { condition: Expression; expected: boolean } {
    const l = cloneLoc(loc);
    const isTrue = this.rng() > 0.5;
    const variant = this.randInt(0, 8);

    switch (variant) {
      case 0: {
        // (x+1)*(x-1) == x*x - 1
        const x = this.randInt(3, 100);
        return {
          condition: binExp(
            binExp(binExp(intExp(x, l), "+", intExp(1, l), l), "*", binExp(intExp(x, l), "-", intExp(1, l), l), l),
            "==",
            binExp(binExp(intExp(x * x, l), "-", intExp(1, l), l), "+", intExp(0, l), l),
            l
          ),
          expected: true,
        };
      }
      case 1: {
        // (a+b)^2 == a^2 + 2ab + b^2
        const a = this.randInt(2, 30);
        const b = this.randInt(2, 30);
        const lhs = binExp(
          binExp(intExp(a, l), "+", intExp(b, l), l),
          "^", intExp(2, l), l
        );
        const rhs = binExp(
          binExp(binExp(intExp(a * a, l), "+", binExp(intExp(2 * a * b, l), "+", intExp(b * b, l), l), l), "+", intExp(0, l), l),
          "-", intExp(0, l), l
        );
        return { condition: binExp(lhs, "==", rhs, l), expected: true };
      }
      case 2: {
        // (a-b)^2 == a^2 - 2ab + b^2
        const a = this.randInt(5, 50);
        const b = this.randInt(2, a - 1);
        const lhs = binExp(
          binExp(intExp(a, l), "-", intExp(b, l), l),
          "^", intExp(2, l), l
        );
        const rhs = binExp(
          binExp(intExp(a * a, l), "-", binExp(intExp(2 * a * b, l), "+", intExp(b * b, l), l), l),
          "+", intExp(0, l), l
        );
        return { condition: binExp(lhs, "==", rhs, l), expected: true };
      }
      case 3: {
        // (a^3 - b^3) == (a-b)*(a^2 + ab + b^2)
        const a = this.randInt(3, 20);
        const b = this.randInt(2, a - 1);
        const lhs = binExp(intExp(a * a * a, l), "-", intExp(b * b * b, l), l);
        const inner = binExp(
          binExp(intExp(a * a, l), "+", binExp(intExp(a * b, l), "+", intExp(b * b, l), l), l),
          "+", intExp(0, l), l
        );
        const rhs = binExp(
          binExp(intExp(a, l), "-", intExp(b, l), l),
          "*", inner, l
        );
        return { condition: binExp(lhs, "==", rhs, l), expected: true };
      }
      case 4: {
        // sin^2(x) + cos^2(x) == 1 (but approximated for ints using identity)
        // Using: (x mod 2) == 0 → never true to create always-true
        const x = this.randInt(2, 50);
        const y = this.randInt(1, 10);
        // (x^y mod x) == 0 → always true
        const powApprox = Math.pow(x, Math.min(y, 5));
        return {
          condition: binExp(
            binExp(intExp(powApprox, l), "%", intExp(x, l), l),
            "==", intExp(0, l), l
          ),
          expected: true,
        };
      }
      case 5: {
        // 2 * (a + b) == (a + b) * 2
        const a = this.randInt(3, 50);
        const b = this.randInt(3, 50);
        const sum = binExp(intExp(a, l), "+", intExp(b, l), l);
        return {
          condition: binExp(
            binExp(intExp(2, l), "*", sum, l),
            "==",
            binExp(sum, "*", intExp(2, l), l),
            l
          ),
          expected: true,
        };
      }
      case 6: {
        // (a & b) | (a & ~b) == a
        const a = this.randInt(1, 255);
        const b = this.randInt(1, 255);
        const notB = binExp(intExp(~b & 0xFF, l), "&", intExp(0xFF, l), l);
        return {
          condition: binExp(
            binExp(
              binExp(intExp(a & b, l), "|", binExp(intExp(a, l), "&", notB, l), l),
              "+", intExp(0, l), l
            ),
            "==",
            binExp(intExp(a, l), "+", intExp(0, l), l),
            l
          ),
          expected: true,
        };
      }
      default: {
        // (a | b) + (a & b) == a + b
        const a = this.randInt(5, 100);
        const b = this.randInt(5, 100);
        return {
          condition: binExp(
            binExp(
              binExp(intExp(a, l), "|", intExp(b, l), l),
              "+",
              binExp(intExp(a, l), "&", intExp(b, l), l),
              l
            ),
            "==",
            binExp(intExp(a, l), "+", intExp(b, l), l),
            l
          ),
          expected: true,
        };
      }
    }
  }

  createVMBasedOpaque(vmProps: { stackTop?: string; ip?: string; code?: string }, loc?: SourceLocation): Expression {
    const l = cloneLoc(loc);
    const variant = this.randInt(0, 5);

    switch (variant) {
      case 0: {
        const a = this.randInt(1, 100);
        const b = this.randInt(1, 100);
        return binExp(
          binExp(intExp(a, l), "+", intExp(b, l), l),
          "==",
          binExp(intExp(a + b, l), "+", intExp(0, l), l),
          l
        );
      }
      case 1: {
        const a = this.randInt(2, 50);
        const b = this.randInt(2, 50);
        return binExp(
          binExp(intExp(a, l), "*", intExp(b, l), l),
          ">=",
          binExp(intExp(a, l), "+", intExp(b, l), l),
          l
        );
      }
      case 2: {
        const a = this.randInt(1, 255);
        return binExp(
          binExp(intExp(a, l), "~", intExp(a, l), l),
          "==",
          intExp(0, l),
          l
        );
      }
      case 3: {
        const a = this.randInt(2, 10);
        const b = this.randInt(2, 10);
        const lhs = binExp(intExp(a, l), "|", intExp(b, l), l);
        const rhs = binExp(intExp(a, l), "&", intExp(b, l), l);
        return binExp(
          binExp(lhs, "-", rhs, l),
          "==",
          binExp(intExp(a, l), "~", intExp(b, l), l),
          l
        );
      }
      case 4: {
        const a = this.randInt(1, 10);
        const b = this.randInt(1, 10);
        return binExp(
          binExp(intExp(a * a, l), "-", intExp(b * b, l), l),
          "==",
          binExp(
            binExp(intExp(a, l), "-", intExp(b, l), l),
            "*",
            binExp(intExp(a, l), "+", intExp(b, l), l),
            l
          ),
          l
        );
      }
      default: {
        return binExp(intExp(1, l), "==", intExp(1, l), l);
      }
    }
  }
}
