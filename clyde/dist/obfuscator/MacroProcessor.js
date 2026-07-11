const noVirtualizeRegex = /--\s*@no-vm:?(\S+)?/;
const encryptFuncRegex = /--\s*@enc-func:?(\S+)?/;
const functionDefRegex = /(?:local\s+)?function\s+(\w+)\s*\(/;
const assignFuncRegex = /(\w+)\s*=\s*function\s*\(/;
const arrowFuncRegex = /(\w+)\s*=\s*\([^)]*\)\s*=>/;
function extractFunctionName(line) {
    for (const regex of [functionDefRegex, assignFuncRegex, arrowFuncRegex]) {
        const match = line.match(regex);
        if (match)
            return match[1];
    }
    return null;
}
export function processMacros(source, options) {
    const enabled = options?.enabled !== false;
    const noVirtualize = new Set();
    const encryptFunction = new Set();
    if (!enabled)
        return { noVirtualize, encryptFunction };
    const lines = source.split("\n");
    let pendingNoVirtualize = false;
    let pendingEncryptFunc = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nvMatch = line.match(noVirtualizeRegex);
        if (nvMatch) {
            const value = nvMatch[1];
            if (value !== undefined) {
                if (value.toLowerCase() === "all") {
                    noVirtualize.add("*");
                }
                else {
                    noVirtualize.add(value.toLowerCase());
                }
            }
            else {
                pendingNoVirtualize = true;
            }
            continue;
        }
        const efMatch = line.match(encryptFuncRegex);
        if (efMatch) {
            const value = efMatch[1];
            if (value !== undefined) {
                encryptFunction.add(value.toLowerCase());
            }
            else {
                pendingEncryptFunc = true;
            }
            continue;
        }
        if (pendingNoVirtualize || pendingEncryptFunc) {
            const name = extractFunctionName(line);
            if (name) {
                if (pendingNoVirtualize)
                    noVirtualize.add(name.toLowerCase());
                if (pendingEncryptFunc)
                    encryptFunction.add(name.toLowerCase());
            }
            pendingNoVirtualize = false;
            pendingEncryptFunc = false;
        }
    }
    return { noVirtualize, encryptFunction };
}
export function shouldVirtualize(name, annotations) {
    return annotations.noVirtualize.has(name.toLowerCase()) || annotations.noVirtualize.has("*");
}
export function shouldEncrypt(name, annotations) {
    return annotations.encryptFunction.has(name.toLowerCase());
}
//# sourceMappingURL=MacroProcessor.js.map