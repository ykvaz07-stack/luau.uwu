let _sng: () => number = Math.random;

export function seedSoaRng(seed: number): void {
  let s = seed | 0;
  _sng = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rn(): number { return _sng ? _sng() : Math.random(); }

function rname(len: number = 6): string {
  const p = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
  let s = "_";
  for (let i = 0; i < len; i++) s += p[Math.floor(rn() * p.length)];
  return s;
}

function hx(v: number): string {
  return "0x" + (v >>> 0).toString(16).toUpperCase();
}

export interface SoaArray {
  I: number[];
  A: number[];
  B: number[];
  C: number[];
}

export function newSoa(): SoaArray {
  return { I: [], A: [], B: [], C: [] };
}

export function soaEmit(soa: SoaArray, op: number, a: number, b: number, c: number): void {
  soa.I.push(op); soa.A.push(a); soa.B.push(b); soa.C.push(c);
}

export function soaFromFlatCode(code: number[], registerShuffle: boolean): SoaArray {
  const soa = newSoa();
  let i = 0;
  while (i < code.length) {
    const op = code[i++] ?? 0;
    const a = code[i++] ?? 0;
    const b = code[i++] ?? 0;
    const c = code[i++] ?? 0;
    soa.I.push(op);
    if (registerShuffle) {
      const perm = Math.floor(rn() * 6);
      switch (perm) {
        case 0: soa.A.push(c); soa.B.push(a); soa.C.push(b); break;
        case 1: soa.A.push(b); soa.B.push(c); soa.C.push(a); break;
        case 2: soa.A.push(c); soa.B.push(b); soa.C.push(a); break;
        case 3: soa.A.push(b); soa.B.push(a); soa.C.push(c); break;
        case 4: soa.A.push(a); soa.B.push(c); soa.C.push(b); break;
        default: soa.A.push(a); soa.B.push(b); soa.C.push(c); break;
      }
    } else {
      soa.A.push(a); soa.B.push(b); soa.C.push(c);
    }
  }
  return soa;
}

export function soaSerializeXor(soa: SoaArray, xk: number): string {
  const xI = soa.I.map(v => v ^ xk);
  const xA = soa.A.map(v => v ^ xk);
  const xB = soa.B.map(v => v ^ xk);
  const xC = soa.C.map(v => v ^ xk);
  return `{I={${xI.join(",")}},A={${xA.join(",")}},B={${xB.join(",")}},C={${xC.join(",")}}}`;
}

export function soaToFlat(soa: SoaArray): number[] {
  const flat: number[] = [];
  for (let i = 0; i < soa.I.length; i++) {
    flat.push(soa.I[i], soa.A[i], soa.B[i], soa.C[i]);
  }
  return flat;
}

function encSC(s: string): string {
  return Array.from(s).map(c => c.charCodeAt(0)).join(",");
}

export function generateSoaLoader(
  soaVar: string,
  exportedVar: string,
): string {
  const nI = rname(4);
  const nA = rname(4);
  const nB = rname(4);
  const nC = rname(4);
  const nSb = rname(3);
  const nSc = rname(3);
  const nBx = rname(3);
  const nB32 = rname(4);
  const nEnv = rname(3);
  const nIp = rname(3);
  const nBp = rname(4);

  const lines: string[] = [
    `local ${nSb}=string.byte;local ${nSc}=string.char`,
    `local ${nEnv}=(type(getgenv)=="function" and getgenv()) or (type(getgenv)=="table" and getgenv) or _G`,
    `local ${nB32}=${nEnv}[${nSc}(${encSC("bit32")})]`,
    `local ${nBx}=${nB32} and ${nB32}[${nSc}(${encSC("bxor")})] or function(a,b) local r,p=0,1 for _i=0,31 do if math.floor(a/(2^_i))%2~=math.floor(b/(2^_i))%2 then r=r+p end p=p*2 end return r end`,
    `local ${nI},${nA},${nB},${nC}=${exportedVar}.I,${exportedVar}.A,${exportedVar}.B,${exportedVar}.C`,
    `local ${nIp}=1`,
    `local ${nBp}=${soaVar}`,
  ];
  return lines.join("\n");
}

export function generateSoABeautifyTrap(): string {
  const trapTypes = [
    `local ____=(function() return; end)()`,
    `local __xx=(select(1,44))`,
    ';()  ;local __zZ=_G and _G["\\x73\\x70\\x61\\x77\\x6e"]',
    `local __nx="###";local __y=()`,
    `if (1) then ;;; end`,
  ];
  return trapTypes[Math.floor(rn() * trapTypes.length)];
}