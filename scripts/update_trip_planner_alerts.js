const fs = require('fs');

// 1. Expand alert titles & messages in localizedAlert.ts
let alertCode = fs.readFileSync('src/utils/localizedAlert.ts', 'utf8').replace(/\r\n/g, '\n');

const plannerAlertTitles = {
  "Destination Required": "গন্তব্য আবশ্যক",
  "Remove Activity": "কার্যক্রম মুছুন",
  "Removed": "মুছে ফেলা হয়েছে",
  "AI Trip Concierge": "এআই ভ্রমণ সহায়ক",
};

const plannerAlertMessages = {
  "Please choose or enter a destination to plan your trip.": "ভ্রমণ পরিকল্পনা করার জন্য একটি গন্তব্য বেছে নিন বা লিখুন।",
  "Are you sure you want to delete this activity from your itinerary?": "আপনি কি নিশ্চিত এই কার্যক্রমটি আপনার ভ্রমণসূচী থেকে মুছে ফেলতে চান?",
  "Itinerary removed from your saved trips.": "ভ্রমণসূচী আপনার সংরক্ষিত তালিকা থেকে সরানো হয়েছে।",
  "Could not save itinerary to device.": "ভ্রমণসূচী ডিভাইসে সংরক্ষণ করা যায়নি।",
};

let titlesToInsert = Object.entries(plannerAlertTitles)
  .map(([k, v]) => `  "${k}": "${v}",`)
  .join('\n');

let messagesToInsert = Object.entries(plannerAlertMessages)
  .map(([k, v]) => `  "${k}": "${v}",`)
  .join('\n');

alertCode = alertCode.replace(
  '"Upload Failed": "আপলোড ব্যর্থ",\n};',
  `"Upload Failed": "আপলোড ব্যর্থ",\n${titlesToInsert}\n};`
);

alertCode = alertCode.replace(
  '"Could not send friend request.": "বন্ধুত্বের অনুরোধ পাঠানো যায়নি।",\n};',
  `"Could not send friend request.": "বন্ধুত্বের অনুরোধ পাঠানো যায়নি।",\n${messagesToInsert}\n};`
);

fs.writeFileSync('src/utils/localizedAlert.ts', alertCode, 'utf8');

// 2. Update TripPlannerScreen.tsx to use showLocalizedAlert
let plannerCode = fs.readFileSync('src/screens/TripPlannerScreen.tsx', 'utf8').replace(/\r\n/g, '\n');

if (!plannerCode.includes('showLocalizedAlert')) {
  plannerCode = plannerCode.replace(
    'import { router } from "expo-router";',
    'import { router } from "expo-router";\nimport { showLocalizedAlert } from "../utils/localizedAlert";'
  );
  plannerCode = plannerCode.replace(/Alert\.alert\(/g, 'showLocalizedAlert(');
  fs.writeFileSync('src/screens/TripPlannerScreen.tsx', plannerCode, 'utf8');
  console.log('Successfully updated TripPlannerScreen.tsx with showLocalizedAlert');
}
