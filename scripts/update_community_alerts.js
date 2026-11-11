const fs = require('fs');

// 1. Expand alert titles & messages in localizedAlert.ts
let alertCode = fs.readFileSync('src/utils/localizedAlert.ts', 'utf8').replace(/\r\n/g, '\n');

const communityAlertTitles = {
  "Network Failure": "নেটওয়ার্ক ব্যর্থতা",
  "Bookmark Error": "বুকমার্ক ত্রুটি",
  "Comment Error": "মন্তব্য ত্রুটি",
  "Upload Error": "আপলোড ত্রুটি",
  "Story Upload Error": "স্টোরি আপলোড ত্রুটি",
};

const communityAlertMessages = {
  "Could not sync like. Rolled back to previous state.": "লাইক সিঙ্ক করা যায়নি। পূর্বের অবস্থায় ফিরিয়ে নেওয়া হয়েছে।",
  "Could not update bookmark. Changes rolled back.": "বুকমার্ক আপডেট করা যায়নি। পূর্বের অবস্থায় ফিরিয়ে নেওয়া হয়েছে।",
  "Comment contains disallowed script or markup.": "মন্তব্যে অননুমোদিত স্ক্রিপ্ট বা কোড রয়েছে।",
  "Failed to publish comment.": "মন্তব্য প্রকাশ করা যায়নি।",
  "Media library access is needed to select files.": "ফাইল নির্বাচনের জন্য মিডিয়া লাইব্রেরির অনুমতি প্রয়োজন।",
  "Media library access required.": "মিডিয়া লাইব্রেরির অনুমতি প্রয়োজন।",
  "Failed to upload file to R2 cloud.": "ক্লাউডে ফাইল আপলোড করা যায়নি।",
  "Camera permission is required to capture photos.": "ছবি তোলার জন্য ক্যামেরার অনুমতি প্রয়োজন।",
  "Could not take photo.": "ছবি তোলা যায়নি।",
  "Failed to upload story photo.": "স্টোরির ছবি আপলোড করা যায়নি।",
};

let titlesToInsert = Object.entries(communityAlertTitles)
  .map(([k, v]) => `  "${k}": "${v}",`)
  .join('\n');

let messagesToInsert = Object.entries(communityAlertMessages)
  .map(([k, v]) => `  "${k}": "${v}",`)
  .join('\n');

alertCode = alertCode.replace(
  '"AI Trip Concierge": "এআই ভ্রমণ সহায়ক",\n};',
  `"AI Trip Concierge": "এআই ভ্রমণ সহায়ক",\n${titlesToInsert}\n};`
);

alertCode = alertCode.replace(
  '"Could not save itinerary to device.": "ভ্রমণসূচী ডিভাইসে সংরক্ষণ করা যায়নি।",\n};',
  `"Could not save itinerary to device.": "ভ্রমণসূচী ডিভাইসে সংরক্ষণ করা যায়নি।",\n${messagesToInsert}\n};`
);

fs.writeFileSync('src/utils/localizedAlert.ts', alertCode, 'utf8');

// 2. Update CommunityScreen.tsx to use showLocalizedAlert
let commCode = fs.readFileSync('src/screens/CommunityScreen.tsx', 'utf8').replace(/\r\n/g, '\n');

if (!commCode.includes('showLocalizedAlert')) {
  commCode = commCode.replace(
    'import { router } from "expo-router";',
    'import { router } from "expo-router";\nimport { showLocalizedAlert } from "../utils/localizedAlert";'
  );
  commCode = commCode.replace(/Alert\.alert\(/g, 'showLocalizedAlert(');
  fs.writeFileSync('src/screens/CommunityScreen.tsx', commCode, 'utf8');
  console.log('Successfully updated CommunityScreen.tsx with showLocalizedAlert');
}
