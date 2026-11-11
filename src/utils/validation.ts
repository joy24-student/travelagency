import i18n from "../locales/i18n";

export const VALIDATION_MESSAGES_BN: Record<string, string> = {
  // Email errors
  "Email is required": "ইমেইল ঠিকানা আবশ্যক",
  "Enter a valid email address": "সঠিক ইমেইল ঠিকানা দিন",
  "Invalid email format": "ইমেইলের ফরম্যাট সঠিক নয়",
  "Email or phone is required": "ইমেইল অথবা ফোন নম্বর আবশ্যক",
  
  // Password errors
  "Password is required": "পাসওয়ার্ড আবশ্যক",
  "Password must be at least 8 characters": "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে",
  "Password needs one uppercase letter": "পাসওয়ার্ডে অন্তত একটি বড় হাতের অক্ষর থাকতে হবে",
  "Password needs one lowercase letter": "পাসওয়ার্ডে অন্তত একটি ছোট হাতের অক্ষর থাকতে হবে",
  "Password needs one number": "পাসওয়ার্ডে অন্তত একটি সংখ্যা থাকতে হবে",
  "Confirm your password": "পাসওয়ার্ড নিশ্চিত করুন",
  "Confirm your new password": "নতুন পাসওয়ার্ডটি নিশ্চিত করুন",
  "Passwords do not match": "পাসওয়ার্ড দুটি মিলছে না",

  // Profile / Name errors
  "First name is required": "প্রথম নাম আবশ্যক",
  "Last name is required": "শেষ নাম আবশ্যক",
  "Full name is required": "পুরো নাম আবশ্যক",
  "Phone number is required": "ফোন নম্বর আবশ্যক",
  "Enter a valid phone number": "সঠিক ফোন নম্বর দিন",

  // OTP / Verification
  "Enter the 6 digit code": "৬ সংখ্যার কোডটি দিন",
  "Code is too long": "কোডটি অতিরিক্ত দীর্ঘ",
  "Invalid OTP code": "ভুল ওটিপি কোড",
  "OTP has expired": "ওটিপির মেয়াদ শেষ হয়ে গেছে",

  // General field validation
  "This field is required": "এই তথ্যটি পূরণ করা আবশ্যক",
  "Required field": "আবশ্যক তথ্য",
  "Field cannot be empty": "ঘরটি খালি রাখা যাবে না",
  "Invalid value": "সঠিক মান লিখুন",
  "Please select a date": "একটি তারিখ নির্বাচন করুন",
  "Please select a destination": "একটি গন্তব্য নির্বাচন করুন",
};

export const VALIDATION_MESSAGES_AR: Record<string, string> = {
  "Email is required": "البريد الإلكتروني مطلوب",
  "Enter a valid email address": "أدخل عنوان بريد إلكتروني صالح",
  "Invalid email format": "صيغة البريد الإلكتروني غير صالحة",
  "Email or phone is required": "البريد الإلكتروني أو رقم الهاتف مطلوب",
  "Password is required": "كلمة المرور مطلوبة",
  "Password must be at least 8 characters": "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل",
  "Confirm your password": "تأكيد كلمة المرور",
  "Passwords do not match": "كلمات المرور غير متطابقة",
  "First name is required": "الاسم الأول مطلوب",
  "Last name is required": "اسم العائلة مطلوب",
  "Full name is required": "الاسم الكامل مطلوب",
  "Phone number is required": "رقم الهاتف مطلوب",
  "Enter a valid phone number": "أدخل رقم هاتف صالح",
  "Enter the 6 digit code": "أدخل الرمز المكون من 6 أرقام",
  "Invalid OTP code": "رمز التحقق غير صالح",
  "OTP has expired": "انتهت صلاحية رمز التحقق",
  "This field is required": "هذا الحقل مطلوب",
  "Required field": "حقل مطلوب",
  "Field cannot be empty": "لا يمكن ترك هذا الحقل فارغاً",
  "Invalid value": "قيمة غير صالحة",
  "Please select a date": "يرجى تحديد التاريخ",
  "Please select a destination": "يرجى اختيار الوجهة",
};

export const VALIDATION_MESSAGES_HI: Record<string, string> = {
  "Email is required": "ईमेल आवश्यक है",
  "Enter a valid email address": "एक वैध ईमेल पता दर्ज करें",
  "Invalid email format": "अमान्य ईमेल प्रारूप",
  "Email or phone is required": "ईमेल या फोन नंबर आवश्यक है",
  "Password is required": "पासवर्ड आवश्यक है",
  "Password must be at least 8 characters": "पासवर्ड कम से कम 8 वर्णों का होना चाहिए",
  "Confirm your password": "पासवर्ड की पुष्टि करें",
  "Passwords do not match": "पासवर्ड मेल नहीं खाते",
  "First name is required": "पहला नाम आवश्यक है",
  "Last name is required": "अंतिम नाम आवश्यक है",
  "Full name is required": "पूरा नाम आवश्यक है",
  "Phone number is required": "फोन नंबर आवश्यक है",
  "Enter a valid phone number": "एक मान्य फ़ोन नंबर दर्ज करें",
  "Enter the 6 digit code": "6 अंकों का कोड दर्ज करें",
  "Invalid OTP code": "अमान्य ओटीपी कोड",
  "OTP has expired": "ओटीपी की समय सीमा समाप्त हो गई है",
  "This field is required": "यह फ़ील्ड आवश्यक है",
  "Required field": "आवश्यक फ़ील्ड",
  "Field cannot be empty": "फ़ील्ड खाली नहीं हो सकती",
  "Invalid value": "अमान्य मान",
  "Please select a date": "कृपया एक तारीख चुनें",
  "Please select a destination": "कृपया एक गंतव्य चुनें",
};

export const COMMON_PLACEHOLDERS_BN: Record<string, string> = {
  "Search destinations...": "গন্তব্য অনুসন্ধান করুন...",
  "Search flights, hotels, trains...": "ফ্লাইট, হোটেল, ট্রেন খুঁজুন...",
  "Search here...": "এখানে খুঁজুন...",
  "Search...": "অনুসন্ধান...",
  "Where to?": "কোথায় যেতে চান?",
  "Enter your email": "আপনার ইমেইল লিখুন",
  "Enter email": "ইমেইল লিখুন",
  "Enter your password": "পাসওয়ার্ড দিন",
  "Enter password": "পাসওয়ার্ড দিন",
  "Confirm password": "পাসওয়ার্ড নিশ্চিত করুন",
  "Enter first name": "প্রথম নাম লিখুন",
  "Enter last name": "শেষ নাম লিখুন",
  "Enter phone number": "ফোন নম্বর দিন",
  "Phone number": "ফোন নম্বর",
  "Enter 6-digit code": "৬ সংখ্যার কোড দিন",
  "Departure date": "যাত্রার তারিখ",
  "Return date": "ফেরার তারিখ",
  "Select dates": "তারিখ নির্বাচন করুন",
  "Select departure date": "যাত্রার তারিখ নির্বাচন করুন",
  "Select return date": "ফেরার তারিখ নির্বাচন করুন",
  "From (City or Airport)": "কোথা থেকে (শহর বা বিমানবন্দর)",
  "To (City or Airport)": "কোথায় (শহর বা বিমানবন্দর)",
  "Guests & Rooms": "অতিথি ও রুম",
  "Enter promo code": "প্রমো কোড দিন",
  "Write a message...": "মেসেজ লিখুন...",
  "Type your message...": "আপনার বার্তা লিখুন...",
  "Type a message": "বার্তা লিখুন",
};

export const COMMON_PLACEHOLDERS_AR: Record<string, string> = {
  "Search destinations...": "ابحث عن الوجهات...",
  "Search flights, hotels, trains...": "ابحث عن رحلات الطيران، الفنادق، والقطارات...",
  "Search here...": "ابحث هنا...",
  "Search...": "بحث...",
  "Where to?": "إلى أين وجهتك؟",
  "Enter your email": "أدخل بريدك الإلكتروني",
  "Enter email": "أدخل البريد الإلكتروني",
  "Enter your password": "أدخل كلمة المرور",
  "Enter password": "أدخل كلمة المرور",
  "Confirm password": "تأكيد كلمة المرور",
  "Enter first name": "أدخل الاسم الأول",
  "Enter last name": "أدخل اسم العائلة",
  "Enter phone number": "أدخل رقم الهاتف",
  "Phone number": "رقم الهاتف",
  "Enter 6-digit code": "أدخل الرمز المكون من 6 أرقام",
  "Departure date": "تاريخ المغادرة",
  "Return date": "تاريخ العودة",
  "Select dates": "اختر التواريخ",
  "From (City or Airport)": "من (المدينة أو المطار)",
  "To (City or Airport)": "إلى (المدينة أو المطار)",
  "Guests & Rooms": "النزلاء والغرف",
  "Enter promo code": "أدخل الرمز الترويجي",
  "Write a message...": "اكتب رسالة...",
};

export const COMMON_PLACEHOLDERS_HI: Record<string, string> = {
  "Search destinations...": "गंतव्य खोजें...",
  "Search flights, hotels, trains...": "उड़ानें, होटल, ट्रेनें खोजें...",
  "Search here...": "यहाँ खोजें...",
  "Search...": "खोजें...",
  "Where to?": "कहाँ जाना चाहते हैं?",
  "Enter your email": "अपना ईमेल दर्ज करें",
  "Enter email": "ईमेल दर्ज करें",
  "Enter your password": "पासवर्ड दर्ज करें",
  "Confirm password": "पासवर्ड की पुष्टि करें",
  "Enter phone number": "फ़ोन नंबर दर्ज करें",
  "Phone number": "फ़ोन नंबर",
  "Enter 6-digit code": "6 अंकों का कोड दर्ज करें",
  "Departure date": "प्रस्थान तिथि",
  "Return date": "वापसी तिथि",
  "Select dates": "तिथियां चुनें",
  "From (City or Airport)": "कहाँ से (शहर या हवाई अड्डा)",
  "To (City or Airport)": "कहाँ तक (शहर या हवाई अड्डा)",
  "Guests & Rooms": "अतिथि और कमरे",
  "Enter promo code": "प्रोमो कोड दर्ज करें",
  "Write a message...": "संदेश लिखें...",
};

/**
 * Resolves a validation error message into the active language
 */
export function getLocalizedValidationError(message?: string | null, locale?: string): string {
  if (!message) return "";

  const currentLang = (locale || i18n.language || "en").toLowerCase();
  if (currentLang.startsWith("bn") && VALIDATION_MESSAGES_BN[message]) {
    return VALIDATION_MESSAGES_BN[message];
  }
  if (currentLang.startsWith("ar") && VALIDATION_MESSAGES_AR[message]) {
    return VALIDATION_MESSAGES_AR[message];
  }
  if (currentLang.startsWith("hi") && VALIDATION_MESSAGES_HI[message]) {
    return VALIDATION_MESSAGES_HI[message];
  }

  return i18n.t(message, { defaultValue: message });
}

/**
 * Resolves a form placeholder into the active language
 */
export function getLocalizedPlaceholder(placeholder?: string, locale?: string): string | undefined {
  if (!placeholder) return undefined;

  const currentLang = (locale || i18n.language || "en").toLowerCase();
  if (currentLang.startsWith("bn") && COMMON_PLACEHOLDERS_BN[placeholder]) {
    return COMMON_PLACEHOLDERS_BN[placeholder];
  }
  if (currentLang.startsWith("ar") && COMMON_PLACEHOLDERS_AR[placeholder]) {
    return COMMON_PLACEHOLDERS_AR[placeholder];
  }
  if (currentLang.startsWith("hi") && COMMON_PLACEHOLDERS_HI[placeholder]) {
    return COMMON_PLACEHOLDERS_HI[placeholder];
  }

  return i18n.t(placeholder, { defaultValue: placeholder });
}
