const fs = require('fs');

let code = fs.readFileSync('src/components/gamification/MysteryBoxModal.tsx', 'utf8');

// Add timers tracking
if (!code.includes('activeTimersRef')) {
  code = code.replace(
    'const cardOpacity = useSharedValue(0);',
    'const cardOpacity = useSharedValue(0);\n  const activeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);\n\n  const registerSafeTimeout = (fn: () => void, ms: number) => {\n    const id = setTimeout(() => {\n      activeTimersRef.current = activeTimersRef.current.filter((t) => t !== id);\n      fn();\n    }, ms);\n    activeTimersRef.current.push(id);\n    return id;\n  };\n\n  const clearAllActiveTimers = () => {\n    activeTimersRef.current.forEach((t) => clearTimeout(t));\n    activeTimersRef.current = [];\n  };\n\n  useEffect(() => {\n    return () => {\n      clearAllActiveTimers();\n    };\n  }, []);'
  );

  // Replace raw setTimeout in handleOpenBox and handleCopyCode
  code = code.replace(
    'setTimeout(() => {\n        setBoxState("revealed");',
    'registerSafeTimeout(() => {\n        setBoxState("revealed");'
  );
  code = code.replace(
    'setTimeout(() => {\n      triggerHaptic("heavy");\n    }, 450);',
    'registerSafeTimeout(() => {\n      triggerHaptic("heavy");\n    }, 450);'
  );
  code = code.replace(
    'setTimeout(() => {\n      triggerHaptic("heavy");\n    }, 850);',
    'registerSafeTimeout(() => {\n      triggerHaptic("heavy");\n    }, 850);'
  );
  code = code.replace(
    'setTimeout(() => {\n      setBoxState("bursting");',
    'registerSafeTimeout(() => {\n      setBoxState("bursting");'
  );
  code = code.replace(
    'setTimeout(() => {\n        setBoxState("revealed");\n        cardScale.value = withSpring(1',
    'registerSafeTimeout(() => {\n        setBoxState("revealed");\n        cardScale.value = withSpring(1'
  );
  code = code.replace(
    'setTimeout(() => setCopiedCode(false), 2500);',
    'registerSafeTimeout(() => setCopiedCode(false), 2500);'
  );
}

// Clear timers on modal close
code = code.replace(
  'const handleClose = () => {\n    if (isOpening) return;',
  'const handleClose = () => {\n    if (isOpening) return;\n    clearAllActiveTimers();'
);

fs.writeFileSync('src/components/gamification/MysteryBoxModal.tsx', code, 'utf8');
console.log('Successfully updated MysteryBoxModal.tsx');
