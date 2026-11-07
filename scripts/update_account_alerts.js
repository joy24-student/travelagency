const fs = require('fs');

// 1. Expand alert titles & messages in localizedAlert.ts
let alertCode = fs.readFileSync('src/utils/localizedAlert.ts', 'utf8').replace(/\r\n/g, '\n');

const accountAlertMessages = {
  "Failed to save setting": "সেটিংস সংরক্ষণ করা যায়নি।",
  "All fields are required": "সকল তথ্য পূরণ করা আবশ্যক।",
  "Password changed successfully": "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।",
  "Failed to change password": "পাসওয়ার্ড পরিবর্তন করা যায়নি।",
  "Are you sure you want to logout?": "আপনি কি নিশ্চিত লগআউট করতে চান?",
  "Failed to logout": "লগআউট করা যায়নি।",
};

let messagesToInsert = Object.entries(accountAlertMessages)
  .map(([k, v]) => `  "${k}": "${v}",`)
  .join('\n');

alertCode = alertCode.replace(
  '"Failed to upload story photo.": "স্টোরির ছবি আপলোড করা যায়নি।",\n};',
  `"Failed to upload story photo.": "স্টোরির ছবি আপলোড করা যায়নি।",\n${messagesToInsert}\n};`
);

fs.writeFileSync('src/utils/localizedAlert.ts', alertCode, 'utf8');

// 2. Update app/(tabs)/account.tsx to use showLocalizedAlert
let accCode = fs.readFileSync('app/(tabs)/account.tsx', 'utf8').replace(/\r\n/g, '\n');

if (!accCode.includes('showLocalizedAlert')) {
  accCode = accCode.replace(
    'import { router } from "expo-router";',
    'import { router } from "expo-router";\nimport { showLocalizedAlert } from "../../src/utils/localizedAlert";'
  );
  accCode = accCode.replace(/Alert\.alert\(/g, 'showLocalizedAlert(');
  fs.writeFileSync('app/(tabs)/account.tsx', accCode, 'utf8');
  console.log('Successfully updated account.tsx with showLocalizedAlert');
}
