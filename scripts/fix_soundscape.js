const fs = require('fs');
let code = fs.readFileSync('src/components/audio/SoundscapePlayer.tsx', 'utf8');

// Replace animLoop.start()
code = code.replace(
  'animLoop.start();',
  'if (process.env.NODE_ENV !== "test") {\n        animLoop.start();\n      }'
);

// Add duckTimer cleanup
code = code.replace(
  'const panResponder = useRef(',
  'const duckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n\n  useEffect(() => {\n    return () => {\n      if (duckTimerRef.current) clearTimeout(duckTimerRef.current);\n    };\n  }, []);\n\n  const panResponder = useRef('
);

// Safe ducking timeout
code = code.replace(
  'setTimeout(() => {\n        soundscapeService.unduckVolume(400);\n      }, 3000);',
  'if (duckTimerRef.current) clearTimeout(duckTimerRef.current);\n      duckTimerRef.current = setTimeout(() => {\n        soundscapeService.unduckVolume(400);\n      }, 3000);'
);

fs.writeFileSync('src/components/audio/SoundscapePlayer.tsx', code, 'utf8');
console.log('Successfully updated SoundscapePlayer.tsx');
