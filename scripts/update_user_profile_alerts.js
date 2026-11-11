const fs = require('fs');

// 1. Expand alert titles & messages in localizedAlert.ts
let alertCode = fs.readFileSync('src/utils/localizedAlert.ts', 'utf8').replace(/\r\n/g, '\n');

const profileAlertTitles = {
  "Save Error": "সংরক্ষণ ত্রুটি",
  "File Selection Failed": "ফাইল নির্বাচন ব্যর্থ",
  "Camera Error": "ক্যামেরা ত্রুটি",
  "KYC Document Submitted": "কেওয়াইসি নথি জমা হয়েছে",
  "Upload Failed": "আপলোড ব্যর্থ",
  "Request Sent": "অনুরোধ পাঠানো হয়েছে",
};

const profileAlertMessages = {
  "Profile and preferences updated successfully!": "প্রোফাইল এবং পছন্দসমূহ সফলভাবে আপডেট হয়েছে!",
  "Please grant photo library access to upload documents.": "নথি আপলোডের জন্য ফটো লাইব্রেরির অনুমতি দিন।",
  "Unable to select document file.": "নথি ফাইল নির্বাচন করা যায়নি।",
  "Camera access is required to photograph ID documents.": "আইডি নথির ছবি তোলার জন্য ক্যামেরা অনুমতি প্রয়োজন।",
  "Could not capture document image.": "নথির ছবি তোলা সম্ভব হয়নি।",
  "Failed to update profile details.": "প্রোফাইল তথ্য আপডেট করা যায়নি।",
  "Failed to upload KYC document to private vault.": "কেওয়াইসি নথি ভল্টে আপলোড করা যায়নি।",
  "Could not send friend request.": "বন্ধুত্বের অনুরোধ পাঠানো যায়নি।",
};

let titlesToInsert = Object.entries(profileAlertTitles)
  .map(([k, v]) => `  "${k}": "${v}",`)
  .join('\n');

let messagesToInsert = Object.entries(profileAlertMessages)
  .map(([k, v]) => `  "${k}": "${v}",`)
  .join('\n');

alertCode = alertCode.replace(
  '"Login failed": "লগইন ব্যর্থ",\n};',
  `"Login failed": "লগইন ব্যর্থ",\n${titlesToInsert}\n};`
);

alertCode = alertCode.replace(
  '"Reset link sent!": "পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে!",\n};',
  `"Reset link sent!": "পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে!",\n${messagesToInsert}\n};`
);

fs.writeFileSync('src/utils/localizedAlert.ts', alertCode, 'utf8');
console.log('Successfully updated localizedAlert.ts with profile messages');

// 2. Update UserProfileScreen.tsx to use showLocalizedAlert
let profileCode = fs.readFileSync('src/screens/UserProfileScreen.tsx', 'utf8').replace(/\r\n/g, '\n');

if (!profileCode.includes('showLocalizedAlert')) {
  profileCode = profileCode.replace(
    'import { router } from "expo-router";',
    'import { router } from "expo-router";\nimport { showLocalizedAlert } from "../utils/localizedAlert";'
  );
  profileCode = profileCode.replace(/Alert\.alert\(/g, 'showLocalizedAlert(');
  fs.writeFileSync('src/screens/UserProfileScreen.tsx', profileCode, 'utf8');
  console.log('Successfully updated UserProfileScreen.tsx with showLocalizedAlert');
}
