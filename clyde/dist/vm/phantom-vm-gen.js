import { PHANTOM_OP_COUNT } from "./phantom-types.js";
let _rs = 0;
function sr(s) { _rs = s >>> 0; }
function rn() {
    _rs = (_rs + 0x6D2B79F5) >>> 0;
    let t = Math.imul(_rs ^ (_rs >>> 15), 1 | _rs);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
}
function rname(short) {
    const p = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
    const len = short ? 3 + Math.floor(rn() * 4) : 5 + Math.floor(rn() * 7);
    let s = "_";
    for (let i = 0; i < len; i++)
        s += p[Math.floor(rn() * p.length)];
    return s;
}
function shuf(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rn() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}
function encKey(n) {
    return Array.from({ length: n }, () => Math.floor(rn() * 256));
}
function xorEnc(d, k) {
    return d.map((v, i) => v ^ k[i % k.length]);
}
function esc(s) {
    let o = '"';
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c === 34)
            o += '\\"';
        else if (c === 92)
            o += '\\\\';
        else if (c === 10)
            o += '\\n';
        else if (c < 32 || c > 126)
            o += `\\x${c.toString(16).padStart(2, '0')}`;
        else
            o += s[i];
    }
    return o + '"';
}
function ntab(nums) {
    if (nums.length === 0)
        return "{}";
    const parts = nums.map(n => Math.floor(rn() * 3) === 0 ? String(n) : `(${n}+0)`);
    return `{${parts.join(",")}}`;
}
function stable(vals) {
    if (vals.length === 0)
        return "{}";
    const parts = vals.map(v => v === null ? "nil" : typeof v === 'boolean' ? (v ? "true" : "false") : typeof v === 'number' ? String(v) : esc(v));
    return `{${parts.join(",")}}`;
}
function gcd(a, b) { while (b) {
    [a, b] = [b, a % b];
} return a; }
function modInv(a, m) {
    let [old_r, r] = [a, m], [old_s, s] = [1, 0];
    while (r) {
        const q = Math.floor(old_r / r);
        [old_r, r] = [r, old_r - q * r];
        [old_s, s] = [s, old_s - q * s];
    }
    return ((old_s % m) + m) % m;
}
export function generatePhantomVM(chunk, options = {}) {
    const level = options.level || "max";
    const seed = options.seed ?? Date.now();
    const adbg = options.antiDebug !== false;
    sr(seed);
    const code = chunk.code;
    const K = chunk.K;
    const maxRegs = Math.max(chunk.maxRegs, 8);
    const nParams = chunk.nParams || 0;
    const key = encKey(16);
    const nL = rname();
    const nBC = rname();
    const nRegs = rname();
    const nFt = rname();
    const nX = rname();
    const nBx = rname();
    const nA = rname();
    const nB = rname();
    const nC = rname();
    const nI = rname();
    const nF = rname();
    const nPc = rname();
    const nEr = rname();
    const nS = rname();
    const nH = Array.from({ length: PHANTOM_OP_COUNT }, () => rname());
    const nD = rname();
    const out = [];
    if (adbg) {
        const ndc = rname();
        out.push(`local ${ndc}=pcall(function()`);
        out.push(`  local _d=debug`);
        out.push(`  if not _d then return true end`);
        out.push(`  local _i=_d.getinfo`);
        out.push(`  if _i and not _i(1,"l") then return false end`);
        out.push(`  local _s=_d.sethook`);
        out.push(`  if _s then local _c=0 _s(function()_c=_c+1 end,"",0) _s() if _c>0 then return false end end`);
        out.push(`  return true end)`);
        out.push(`if not ${ndc} then while true do end end`);
    }
    out.push(`local ${nL}=${stable(K)}`);
    out.push(`local ${nFt}={}`);
    const opShuf = Array.from({ length: PHANTOM_OP_COUNT }, (_, i) => i);
    shuf(opShuf);
    const opInv = new Array(PHANTOM_OP_COUNT);
    for (let i = 0; i < PHANTOM_OP_COUNT; i++)
        opInv[opShuf[i]] = i;
    const affineA = (() => { let a; do {
        a = 1 + Math.floor(rn() * 254);
    } while (gcd(a, 256) !== 1); return a; })();
    const affineB = Math.floor(rn() * 256);
    const affineAInv = modInv(affineA, 256);
    const affEnc = (n) => ((affineA * n + affineB) & 0xFF);
    const encCode = [];
    for (let i = 0; i < code.length; i += 4) {
        const origOp = code[i];
        const shuffledOp = opShuf[origOp];
        const affineOp = affEnc(shuffledOp);
        encCode.push(affineOp, code[i + 1], code[i + 2], code[i + 3]);
    }
    const finalCode = xorEnc(encCode, key);
    out.push(`local ${nBC}=${ntab(finalCode)}`);
    out.push(`local ${nX}=${ntab(key)}`);
    out.push(`local ${nBx}=bit32 and bit32.bxor or function(a,b)local r=0;for _i=0,7 do local p=2^_i;if (math.floor(a/p)%2)+(math.floor(b/p)%2)==1 then r=r+p end end;return r end`);
    const nFrags = 2 + Math.floor(rn() * 3);
    const fNames = [];
    for (let f = 0; f < nFrags; f++) {
        const fn = rname(true);
        const start = Math.floor(f * finalCode.length / nFrags);
        const end = Math.floor((f + 1) * finalCode.length / nFrags);
        const frag = finalCode.slice(start, end);
        const fk = encKey(4);
        const ef = xorEnc(frag, fk);
        out.push(`local ${rname(true)}=${ntab(fk)}`);
        out.push(`local ${fn}=${ntab(ef)}`);
        fNames.push(fn);
    }
    out.push(`local ${nBC}={}`);
    out.push(`local _oi=0`);
    for (let f = 0; f < nFrags; f++) {
        out.push(`for _j=1,#${fNames[f]} do _oi=_oi+1;${nBC}[_oi]=${nBx}(${fNames[f]}[_j],${nX}[(_oi-1)%#${nX}+1]) end`);
    }
    out.push(`local ${nI}=1`);
    for (let h = 0; h < PHANTOM_OP_COUNT; h++) {
        const oi = opShuf[h];
        const body = [];
        const ra = (r) => `${nRegs}[${r}+1]`;
        for (let j = 0; j < Math.floor(rn() * 4); j++)
            body.push(`local ${rname(true)}=${Math.floor(rn() * 255)}`);
        switch (oi) {
            case 0:
                body.push(`--`);
                break;
            case 1:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]`);
                break;
            case 2:
                body.push(`${ra("A")}=${nL}[${nB}+1]`);
                break;
            case 3:
                body.push(`${ra("A")}=nil`);
                break;
            case 4:
                body.push(`${ra("A")}=${nB}~=0`);
                break;
            case 5:
                body.push(`${ra("A")}=rawget(_G,${nL}[${nB}+1])`);
                break;
            case 6:
                body.push(`_G[${nL}[${nB}+1]]=${nRegs}[${nA}+1]`);
                break;
            case 7:
                body.push(`${ra("A")}=${nRegs}[${nB}+1][${nC}+1]`);
                break;
            case 8:
                body.push(`${nRegs}[${nB}+1][${nC}+1]=${nRegs}[${nA}+1]`);
                break;
            case 9:
                body.push(`${ra("A")}={}`);
                break;
            case 10:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]+${nRegs}[${nC}+1]`);
                break;
            case 11:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]-${nRegs}[${nC}+1]`);
                break;
            case 12:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]*${nRegs}[${nC}+1]`);
                break;
            case 13:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]/${nRegs}[${nC}+1]`);
                break;
            case 14:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]%${nRegs}[${nC}+1]`);
                break;
            case 15:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]^${nRegs}[${nC}+1]`);
                break;
            case 16:
                body.push(`${ra("A")}=-${nRegs}[${nB}+1]`);
                break;
            case 17:
                body.push(`${ra("A")}=not ${nRegs}[${nB}+1]`);
                break;
            case 18:
                body.push(`${ra("A")}=#${nRegs}[${nB}+1]`);
                break;
            case 19:
                body.push(`local _s=tostring(${nRegs}[${nB}+1]);for _i=${nB}+2,${nC}+1 do _s=_s..tostring(${nRegs}[_i]) end;${nRegs}[${nA}+1]=_s`);
                break;
            case 20:
                body.push(`if ${nB}==0 or (${nC}~=0)==not not ${nRegs}[${nB}+1] then ${nI}=${nI}+${nA}*4-4 end`);
                break;
            case 21:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]==${nRegs}[${nC}+1]`);
                break;
            case 22:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]<${nRegs}[${nC}+1]`);
                break;
            case 23:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]<=${nRegs}[${nC}+1]`);
                break;
            case 24:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]`);
                break;
            case 25:
                body.push(`if ${nRegs}[${nB}+1] then ${nRegs}[${nA}+1]=${nRegs}[${nB}+1] else ${nRegs}[${nA}+1]=${nRegs}[${nC}+1] end`);
                break;
            case 26: {
                const nf = rname(true), na = rname(true), nt = rname(true), nr = rname(true);
                body.push(`local ${nf}=${nRegs}[${nA}+1]`);
                body.push(`local ${na}=${nB}`);
                body.push(`local ${nt}={}`);
                body.push(`for _i=1,${na} do ${nt}[_i]=${nRegs}[${nA}+_i+1] end`);
                body.push(`local ${nr}={pcall(${nf},table.unpack(${nt},1,${na}))}`);
                body.push(`${nRegs}[${nA}+1]=${nr}[1]`);
                body.push(`if ${nC}>1 then for _j=2,${nC} do ${nRegs}[${nA}+_j]=${nr}[_j] end end`);
                break;
            }
            case 27: {
                const tt = rname();
                body.push(`local ${tt}={};for _i=1,${nB} do ${tt}[_i]=${nRegs}[${nA}+_i+1] end;return ${nRegs}[${nA}+1](table.unpack(${tt},1,${nB}))`);
                break;
            }
            case 28: {
                const tr = rname();
                body.push(`local ${tr}={};for _i=1,${nB} do ${tr}[_i]=${nRegs}[${nA}+_i] end;return table.unpack(${tr},1,${nB})`);
                break;
            }
            case 29:
                body.push(`${nRegs}[${nA}+1]=${nRegs}[${nA}+1]-${nRegs}[${nA}+3];if ${nRegs}[${nA}+1]>${nRegs}[${nA}+2] then ${nI}=${nI}+${nC}*4-4 end`);
                break;
            case 30:
                body.push(`${nRegs}[${nA}+1]=${nRegs}[${nA}+1]+${nRegs}[${nA}+3];if ${nRegs}[${nA}+1]<=${nRegs}[${nA}+2] then ${nI}=${nI}-${nB}*4 end`);
                break;
            case 31:
                body.push(`--`);
                break;
            case 32:
                body.push(`--`);
                break;
            case 33:
                body.push(`${ra("A")}=${nFt}[${nB}+1]`);
                break;
            case 34:
                body.push(`local _n=select("#",...);for _i=1,_n do ${nRegs}[${nA}+_i]=select(_i,...)end`);
                break;
            case 35:
                body.push(`${ra("A")}=${nRegs}[${nB}+1]`);
                break;
            case 36:
                body.push(`${nRegs}[${nB}+1]=${nRegs}[${nA}+1]`);
                break;
            case 37:
                body.push(`--`);
                break;
        }
        out.push(`local function ${nH[h]}(${nA}=0,${nB}=0,${nC}=0,${nI}=0)`);
        out.push(...body);
        out.push(`end`);
    }
    out.push(`local ${nD}={${nH.join(",")}}`);
    out.push(`local ${nRegs}={}`);
    out.push(`for _i=1,${maxRegs} do ${nRegs}[_i]=nil end`);
    out.push(`local ${nF}=function(...)`);
    out.push(`  local ${nS}=select`);
    if (nParams > 0) {
        out.push(`  for _i=1,${nParams} do ${nRegs}[_i]=${nS}(_i,...) end`);
    }
    out.push(`  while ${nI}<=#${nBC} do`);
    out.push(`    local _o=${nBC}[${nI}]`);
    out.push(`    local _a=${nBC}[${nI}+1]`);
    out.push(`    local _b=${nBC}[${nI}+2]`);
    out.push(`    local _c=${nBC}[${nI}+3]`);
    const affDecExpr = `(((_o-${affineB})*${affineAInv})%256+256)%256`;
    out.push(`    local _h=(${affDecExpr})%#${nD}`);
    out.push(`    ${nD}[_h+1](_a,_b,_c,${nI})`);
    out.push(`    ${nI}=${nI}+4`);
    out.push(`  end`);
    out.push(`end`);
    out.push(`local ${nPc},${nEr}=pcall(${nF},...)`);
    out.push(`if not ${nPc} then error(${nEr} or "?") end`);
    return out.join("\n");
}
//# sourceMappingURL=phantom-vm-gen.js.map