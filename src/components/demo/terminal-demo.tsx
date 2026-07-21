"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const codeLines = [
  'local script = loadstring(game:HttpGet("https://luacrypt.dev/api/scripts/abc123"))',
  'local crypt = LuaCrypt.new({ key = "YOUR_KEY" })',
  "print(\"Script protected successfully!\")",
];

const steps = [
  { label: "Type code", duration: 3000 },
  { label: "Click Obfuscate", duration: 1500 },
  { label: "Loading", duration: 2500 },
  { label: "Complete", duration: 1000 },
];

export function TerminalDemo() {
  const [phase, setPhase] = useState(0);
  const [typedIndex, setTypedIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showCheck, setShowCheck] = useState(false);

  const totalChars = codeLines.reduce((a, l) => a + l.length + 1, 0);

  const reset = useCallback(() => {
    setPhase(0);
    setTypedIndex(0);
    setCharIndex(0);
    setProgress(0);
    setShowCheck(false);
  }, []);

  useEffect(() => {
    if (phase === 0) {
      if (typedIndex < codeLines.length) {
        const line = codeLines[typedIndex];
        if (charIndex < line.length) {
          const t = setTimeout(() => setCharIndex((c) => c + 1), 40 + Math.random() * 30);
          return () => clearTimeout(t);
        } else {
          const t = setTimeout(() => {
            setTypedIndex((i) => i + 1);
            setCharIndex(0);
          }, 400);
          return () => clearTimeout(t);
        }
      } else {
        const t = setTimeout(() => setPhase(1), 800);
        return () => clearTimeout(t);
      }
    }

    if (phase === 2) {
      if (progress < 100) {
        const t = setTimeout(() => setProgress((p) => Math.min(p + 2 + Math.random() * 4, 100)), 40);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase(3), 300);
        return () => clearTimeout(t);
      }
    }

    if (phase === 3) {
      const t = setTimeout(() => setShowCheck(true), 200);
      return () => clearTimeout(t);
    }

    if (phase >= 3 && showCheck) {
      const t = setTimeout(reset, 4000);
      return () => clearTimeout(t);
    }
  }, [phase, typedIndex, charIndex, progress, showCheck, reset]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden border border-emerald-500/20 shadow-2xl shadow-emerald-500/5"
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-[#050a05] border-b border-emerald-500/10">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-xs text-emerald-400/50 font-mono">LuaCrypt v0.1</span>
        </div>

        <div className="bg-[#061006] p-5 min-h-[220px] relative">
          <AnimatePresence mode="wait">
            {phase < 3 && (
              <motion.div
                key="terminal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-sm leading-relaxed"
              >
                {codeLines.map((line, i) => (
                  <div key={i} className="flex">
                    <span className="text-white/20 mr-3 shrink-0 select-none">{`${">"}`}</span>
                    <span>
                      {i < typedIndex ? (
                        <span className="text-white/80">{line}</span>
                      ) : i === typedIndex ? (
                        <>
                          <span className="text-white/80">{line.slice(0, charIndex)}</span>
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                            className="inline-block w-[2px] h-[1em] bg-emerald-400 ml-[1px] align-middle"
                          />
                        </>
                      ) : null}
                    </span>
                  </div>
                ))}

                {typedIndex >= codeLines.length && phase === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 flex justify-center"
                  >
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPhase(1)}
                        className="relative px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-lime-400 text-white text-sm font-semibold cursor-pointer overflow-hidden"
                      >
                        <motion.div
                          className="absolute inset-0 bg-white/20"
                          initial={{ x: "-100%" }}
                          whileHover={{ x: "100%" }}
                          transition={{ duration: 0.6 }}
                        />
                        <span className="relative z-10">Obfuscate Script</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {phase === 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 flex justify-center"
                  >
                    <motion.div
                      className="relative px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-lime-400 text-white text-sm font-semibold"
                      animate={{ boxShadow: ["0 0 0px rgba(16,185,129,0)", "0 0 25px rgba(16,185,129,0.5)", "0 0 0px rgba(16,185,129,0)"] }}
                      transition={{ duration: 0.8 }}
                      onAnimationComplete={() => {
                        const t = setTimeout(() => setPhase(2), 600);
                        return () => clearTimeout(t);
                      }}
                    >
                      <motion.span
                        initial={{ opacity: 1 }}
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.3, times: [0, 0.5, 1] }}
                      >
                        Clicked ✓
                      </motion.span>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {phase >= 2 && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-6"
              >
                {!showCheck ? (
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between text-xs text-white/50 mb-2 font-mono">
                      <span>Obfuscating...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex justify-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-emerald-500"
                          animate={{
                            opacity: progress > i * 20 ? [0.3, 1, 0.3] : 0.1,
                            scale: progress > i * 20 ? [0.8, 1.2, 0.8] : 0.8,
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative">
                      <motion.div
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center"
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(16,185,129,0)",
                          "0 0 40px rgba(16,185,129,0.4)",
                          "0 0 0px rgba(16,185,129,0)",
                        ],
                      }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <motion.svg
                          viewBox="0 0 24 24"
                          className="w-8 h-8 text-white"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        >
                          <motion.path
                            d="M5 13l4 4L19 7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          />
                        </motion.svg>
                      </motion.div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-center"
                    >
                      <div className="text-white font-semibold text-sm">Obfuscation Complete</div>
                      <div className="text-emerald-400 text-xs font-mono mt-1">Script protected ✓</div>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="flex justify-center gap-2 mt-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= phase ? "bg-gradient-to-r from-emerald-500 to-lime-400" : "bg-white/10"
            }`}
            initial={{ width: 32 }}
            animate={{
              width: i === phase ? 48 : 32,
              opacity: i <= phase ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}
