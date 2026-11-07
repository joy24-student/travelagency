const fs = require('fs');

// 1. Toast.tsx
{
  let code = fs.readFileSync('src/components/ui/Toast.tsx', 'utf8');
  if (!code.includes('private timers = new Map')) {
    code = code.replace(
      'private listeners: ((toasts: ToastItem[]) => void)[] = [];',
      'private listeners: ((toasts: ToastItem[]) => void)[] = [];\n  private timers = new Map<string, ReturnType<typeof setTimeout>>();'
    );
    code = code.replace(
      'if (newItem.duration && newItem.duration > 0) {\n      setTimeout(() => {\n        this.dismiss(id);\n      }, newItem.duration);\n    }',
      'if (newItem.duration && newItem.duration > 0) {\n      const timer = setTimeout(() => {\n        this.dismiss(id);\n      }, newItem.duration);\n      this.timers.set(id, timer);\n    }'
    );
    code = code.replace(
      'dismiss(id: string) {\n    this.toasts = this.toasts.filter((t) => t.id !== id);\n    this.notify();\n  }',
      'dismiss(id: string) {\n    const timer = this.timers.get(id);\n    if (timer) {\n      clearTimeout(timer);\n      this.timers.delete(id);\n    }\n    this.toasts = this.toasts.filter((t) => t.id !== id);\n    this.notify();\n  }'
    );
    fs.writeFileSync('src/components/ui/Toast.tsx', code, 'utf8');
    console.log('Fixed Toast.tsx timer cleanup');
  }
}

// 2. DirectChatModal.tsx
{
  let code = fs.readFileSync('src/components/DirectChatModal.tsx', 'utf8');
  if (!code.includes('scrollTimerRef')) {
    code = code.replace(
      'const flatListRef = useRef<FlatList>(null);',
      'const flatListRef = useRef<FlatList>(null);\n  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  useEffect(() => {\n    return () => {\n      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);\n    };\n  }, []);'
    );
    code = code.replace(
      'setTimeout(() => {\n        flatListRef.current?.scrollToEnd({ animated: true });\n      }, 100);',
      'if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);\n      scrollTimerRef.current = setTimeout(() => {\n        flatListRef.current?.scrollToEnd({ animated: true });\n      }, 100);'
    );
    fs.writeFileSync('src/components/DirectChatModal.tsx', code, 'utf8');
    console.log('Fixed DirectChatModal.tsx timer cleanup');
  }
}

// 3. DestructiveConfirmModal.tsx
{
  let code = fs.readFileSync('src/screens/admin/DestructiveConfirmModal.tsx', 'utf8');
  if (!code.includes('copyTimerRef')) {
    code = code.replace(
      'const [copiedAuditRef, setCopiedAuditRef] = useState(false);',
      'const [copiedAuditRef, setCopiedAuditRef] = useState(false);\n  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  useEffect(() => {\n    return () => {\n      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);\n    };\n  }, []);'
    );
    code = code.replace(
      'setTimeout(() => setCopiedAuditRef(false), 2000);',
      'if (copyTimerRef.current) clearTimeout(copyTimerRef.current);\n    copyTimerRef.current = setTimeout(() => setCopiedAuditRef(false), 2000);'
    );
    fs.writeFileSync('src/screens/admin/DestructiveConfirmModal.tsx', code, 'utf8');
    console.log('Fixed DestructiveConfirmModal.tsx timer cleanup');
  }
}

// 4. FeatureDiscoveryModal.tsx
{
  let code = fs.readFileSync('src/components/FeatureDiscoveryModal.tsx', 'utf8');
  if (!code.includes('navTimerRef')) {
    code = code.replace(
      'export function FeatureDiscoveryModal({ visible, onClose }: FeatureDiscoveryModalProps) {',
      'export function FeatureDiscoveryModal({ visible, onClose }: FeatureDiscoveryModalProps) {\n  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  useEffect(() => {\n    return () => {\n      if (navTimerRef.current) clearTimeout(navTimerRef.current);\n    };\n  }, []);'
    );
    code = code.replace(
      'setTimeout(() => {\n      router.push(route as any);\n    }, 150);',
      'if (navTimerRef.current) clearTimeout(navTimerRef.current);\n    navTimerRef.current = setTimeout(() => {\n      router.push(route as any);\n    }, 150);'
    );
    fs.writeFileSync('src/components/FeatureDiscoveryModal.tsx', code, 'utf8');
    console.log('Fixed FeatureDiscoveryModal.tsx timer cleanup');
  }
}

// 5. HomeScreen.tsx
{
  let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
  if (!code.includes('tourTimer')) {
    code = code.replace(
      'useEffect(() => {\n    AsyncStorage.getItem("@app:has_seen_first_time_tour").then((val) => {\n      if (!val) {\n        setTimeout(() => {\n          setShowAllServicesModal(true);\n          AsyncStorage.setItem("@app:has_seen_first_time_tour", "true");\n        }, 1500);\n      }\n    });\n  }, []);',
      'useEffect(() => {\n    let tourTimer: ReturnType<typeof setTimeout> | null = null;\n    AsyncStorage.getItem("@app:has_seen_first_time_tour").then((val) => {\n      if (!val) {\n        tourTimer = setTimeout(() => {\n          setShowAllServicesModal(true);\n          AsyncStorage.setItem("@app:has_seen_first_time_tour", "true");\n        }, 1500);\n      }\n    });\n    return () => {\n      if (tourTimer) clearTimeout(tourTimer);\n    };\n  }, []);'
    );
    fs.writeFileSync('src/screens/HomeScreen.tsx', code, 'utf8');
    console.log('Fixed HomeScreen.tsx timer cleanup');
  }
}

// 6. ServiceChatScreen.tsx
{
  let code = fs.readFileSync('src/screens/ServiceChatScreen.tsx', 'utf8');
  if (!code.includes('scrollTimeoutRef')) {
    code = code.replace(
      'const scrollViewRef = useRef<ScrollView>(null);',
      'const scrollViewRef = useRef<ScrollView>(null);\n  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  useEffect(() => {\n    return () => {\n      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);\n    };\n  }, []);'
    );
    code = code.replace(
      'setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);',
      'if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);\n      scrollTimeoutRef.current = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);'
    );
    fs.writeFileSync('src/screens/ServiceChatScreen.tsx', code, 'utf8');
    console.log('Fixed ServiceChatScreen.tsx timer cleanup');
  }
}

// 7. ActiveTripDock.tsx
{
  let code = fs.readFileSync('src/components/dock/ActiveTripDock.tsx', 'utf8');
  if (!code.includes('wifiTimerRef')) {
    code = code.replace(
      'const [copiedWifi, setCopiedWifi] = useState(false);',
      'const [copiedWifi, setCopiedWifi] = useState(false);\n  const wifiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  useEffect(() => {\n    return () => {\n      if (wifiTimerRef.current) clearTimeout(wifiTimerRef.current);\n    };\n  }, []);'
    );
    code = code.replace(
      'setTimeout(() => setCopiedWifi(false), 2500);',
      'if (wifiTimerRef.current) clearTimeout(wifiTimerRef.current);\n                            wifiTimerRef.current = setTimeout(() => setCopiedWifi(false), 2500);'
    );
    fs.writeFileSync('src/components/dock/ActiveTripDock.tsx', code, 'utf8');
    console.log('Fixed ActiveTripDock.tsx timer cleanup');
  }
}

// 8. FaceVerifyModal.tsx
{
  let code = fs.readFileSync('src/components/scanner/FaceVerifyModal.tsx', 'utf8');
  if (!code.includes('otpNoticeTimerRef')) {
    code = code.replace(
      'const [otpSentNotice, setOtpSentNotice] = useState<string | null>(null);',
      'const [otpSentNotice, setOtpSentNotice] = useState<string | null>(null);\n  const otpNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  useEffect(() => {\n    return () => {\n      if (otpNoticeTimerRef.current) clearTimeout(otpNoticeTimerRef.current);\n    };\n  }, []);'
    );
    code = code.replace(
      'setTimeout(() => setOtpSentNotice(null), 4500);',
      'if (otpNoticeTimerRef.current) clearTimeout(otpNoticeTimerRef.current);\n    otpNoticeTimerRef.current = setTimeout(() => setOtpSentNotice(null), 4500);'
    );
    fs.writeFileSync('src/components/scanner/FaceVerifyModal.tsx', code, 'utf8');
    console.log('Fixed FaceVerifyModal.tsx timer cleanup');
  }
}

// 9. PassportScannerModal.tsx
{
  let code = fs.readFileSync('src/components/scanner/PassportScannerModal.tsx', 'utf8');
  if (!code.includes('presetScanTimerRef')) {
    code = code.replace(
      'export function PassportScannerModal({',
      'export function PassportScannerModal({\n'
    );
    code = code.replace(
      'const [statusMessage, setStatusMessage] = useState<string>(',
      'const presetScanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  useEffect(() => {\n    return () => {\n      if (presetScanTimerRef.current) clearTimeout(presetScanTimerRef.current);\n    };\n  }, []);\n  const [statusMessage, setStatusMessage] = useState<string>('
    );
    code = code.replace(
      'setTimeout(() => {\n      const parsed = parseMRZ(preset.lines);',
      'if (presetScanTimerRef.current) clearTimeout(presetScanTimerRef.current);\n    presetScanTimerRef.current = setTimeout(() => {\n      const parsed = parseMRZ(preset.lines);'
    );
    fs.writeFileSync('src/components/scanner/PassportScannerModal.tsx', code, 'utf8');
    console.log('Fixed PassportScannerModal.tsx timer cleanup');
  }
}
