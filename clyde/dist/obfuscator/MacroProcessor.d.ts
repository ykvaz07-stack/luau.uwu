export interface MacroProcessorOptions {
    enabled?: boolean;
}
export interface MacroAnnotations {
    noVirtualize: Set<string>;
    encryptFunction: Set<string>;
}
export declare function processMacros(source: string, options?: MacroProcessorOptions): MacroAnnotations;
export declare function shouldVirtualize(name: string, annotations: MacroAnnotations): boolean;
export declare function shouldEncrypt(name: string, annotations: MacroAnnotations): boolean;
//# sourceMappingURL=MacroProcessor.d.ts.map