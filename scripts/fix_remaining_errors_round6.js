const fs = require('fs');

// 1. app/(tabs)/messages.tsx: remove activeOpacity
let msgCode = fs.readFileSync('app/(tabs)/messages.tsx', 'utf8');
msgCode = msgCode.replace(/<Pressable\s+key=\{n\.id\}\s+style=\{([^\}]+)\}\s+activeOpacity=\{0\.7\}/g, '<Pressable key={n.id} style={$1}');
msgCode = msgCode.replace(/activeOpacity=\{0\.7\}/g, '');
fs.writeFileSync('app/(tabs)/messages.tsx', msgCode, 'utf8');
console.log('Fixed app/(tabs)/messages.tsx');

// 2. app/screens/payment-details.tsx: import CopyableText
let payDetails = fs.readFileSync('app/screens/payment-details.tsx', 'utf8');
if (!payDetails.includes('import CopyableText from')) {
  payDetails = 'import CopyableText from "../../src/components/ui/CopyableText";\n' + payDetails;
  fs.writeFileSync('app/screens/payment-details.tsx', payDetails, 'utf8');
  console.log('Fixed app/screens/payment-details.tsx');
}

// 3. src/components/dock/ActiveTripDock.tsx: import CopyableText & Linking
let dockCode = fs.readFileSync('src/components/dock/ActiveTripDock.tsx', 'utf8');
if (!dockCode.includes('import CopyableText from')) {
  dockCode = 'import CopyableText from "../ui/CopyableText";\n' + dockCode;
}
dockCode = dockCode.replace(/openLink\(`tel:\$\{tel\}`[^)]*\)/g, 'Linking.openURL(`tel:${tel}`)');
fs.writeFileSync('src/components/dock/ActiveTripDock.tsx', dockCode, 'utf8');
console.log('Fixed src/components/dock/ActiveTripDock.tsx');

// 4. app/screens/payment-failed.tsx: issue and duplicate bookingId
let payFail = fs.readFileSync('app/screens/payment-failed.tsx', 'utf8');
payFail = payFail.replace(
  /issue:\s*`[^`]*\$\{failureInfo\.titleBn\}[^`]*`,/g,
  'issue: `পেমেন্ট ব্যর্থতা: ${reason || "লেনদেন ত্রুটি"} (${amount ? `৳${amount}` : ""})`,'
);
payFail = payFail.replace(
  /source:\s*"payment_failed",\s*\n\s*bookingId:\s*bookingId\s*\|\|\s*"",/g,
  'source: "payment_failed",'
);
fs.writeFileSync('app/screens/payment-failed.tsx', payFail, 'utf8');
console.log('Fixed app/screens/payment-failed.tsx');

// 5. src/screens/CustomerSupportScreen.tsx
let csCode = fs.readFileSync('src/screens/CustomerSupportScreen.tsx', 'utf8');
if (!csCode.includes('useLocalSearchParams')) {
  csCode = csCode.replace('import { router', 'import { router, useLocalSearchParams');
}
if (!csCode.includes('const effectiveBookingRef =')) {
  csCode = csCode.replace(
    'export function CustomerSupportScreen() {',
    'export function CustomerSupportScreen() {\n  const params = useLocalSearchParams<{ bookingRef?: string; issue?: string }>();\n  const effectiveBookingRef = params?.bookingRef || "";\n  const effectiveIssue = params?.issue || "";'
  );
}
fs.writeFileSync('src/screens/CustomerSupportScreen.tsx', csCode, 'utf8');
console.log('Fixed src/screens/CustomerSupportScreen.tsx');

// 6. src/screens/TripPlannerScreen.tsx
let tripCode = fs.readFileSync('src/screens/TripPlannerScreen.tsx', 'utf8');
tripCode = tripCode.replace(
  'setTravelStyle(template.travelStyle);',
  'setTravelStyle(template.travelStyle as any);'
);
tripCode = tripCode.replace(
  'targetActivity.title || "Activity"',
  '(targetActivity as any).title || targetActivity.activity || "Activity"'
);
fs.writeFileSync('src/screens/TripPlannerScreen.tsx', tripCode, 'utf8');
console.log('Fixed src/screens/TripPlannerScreen.tsx');

// 7. src/services/fcmNotificationService.ts
let fcmCode = fs.readFileSync('src/services/fcmNotificationService.ts', 'utf8');
fcmCode = fcmCode.replace(
  /isQuietHourActive\(settings\)/g,
  'isQuietHourActive(settings.quietHoursStart, settings.quietHoursEnd)'
);
fs.writeFileSync('src/services/fcmNotificationService.ts', fcmCode, 'utf8');
console.log('Fixed src/services/fcmNotificationService.ts');

// 8. src/screens/BookingSystemScreen.tsx
let bookCode = fs.readFileSync('src/screens/BookingSystemScreen.tsx', 'utf8');
bookCode = bookCode.replace(
  'createdRecord = await (bookingRepository as any).createBooking(\n          userId,\n          (bookingDetails as any),\n        );',
  'createdRecord = await (bookingRepository as any).createBooking(\n          userId,\n          draftPayload,\n        );'
);
fs.writeFileSync('src/screens/BookingSystemScreen.tsx', bookCode, 'utf8');
console.log('Fixed src/screens/BookingSystemScreen.tsx');

console.log('Round 6 complete!');
