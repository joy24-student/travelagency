import { Alert, AlertButton, AlertOptions } from "react-native";
import i18n from "../locales/i18n";

export const COMMON_ALERT_TITLES_BN: Record<string, string> = {
  error: "ত্রুটি",
  Error: "ত্রুটি",
  success: "সফল",
  Success: "সফল",
  warning: "সতর্কতা",
  Warning: "সতর্কতা",
  info: "তথ্য",
  Info: "তথ্য",
  Notice: "বিজ্ঞপ্তি",
  confirm: "নিশ্চিত করুন",
  Confirm: "নিশ্চিত করুন",
  Confirmation: "নিশ্চিতকরণ",
  delete: "মুছে ফেলুন",
  Delete: "মুছে ফেলুন",
  logout: "লগ আউট",
  Logout: "লগ আউট",
  "Sign Out": "সাইন আউট",
  "Authentication Error": "লগইন ত্রুটি",
  "Validation Error": "যাচাইকরণ ত্রুটি",
  "Network Error": "নেটওয়ার্ক ত্রুটি",
  "Connection Error": "সংযোগ ত্রুটি",
  "Payment Failed": "পেমেন্ট ব্যর্থ",
  "Payment Success": "পেমেন্ট সফল",
  "Booking Confirmed": "বুকিং নিশ্চিত",
  "Permission Required": "অনুমতি প্রয়োজন",
  "Camera Permission": "ক্যামেরার অনুমতি প্রয়োজন",
  "Location Permission": "লোকেশন অনুমতি প্রয়োজন",
  "Verification failed": "যাচাইকরণ ব্যর্থ",
  "Invalid Email": "ভুল ইমেইল",
  "Login failed": "লগইন ব্যর্থ",
  "Save Error": "সংরক্ষণ ত্রুটি",
};

export const COMMON_ALERT_TITLES_AR: Record<string, string> = {
  error: "خطأ",
  Error: "خطأ",
  success: "نجاح",
  Success: "نجاح",
  warning: "تحذير",
  Warning: "تحذير",
  info: "معلومات",
  Info: "معلومات",
  Notice: "إشعار",
  confirm: "تأكيد",
  Confirm: "تأكيد",
  Confirmation: "تأكيد",
  delete: "حذف",
  Delete: "حذف",
  logout: "تسجيل الخروج",
  Logout: "تسجيل الخروج",
  "Sign Out": "تسجيل الخروج",
  "Authentication Error": "خطأ في المصادقة",
  "Validation Error": "خطأ في التحقق",
  "Network Error": "خطأ في الشبكة",
  "Payment Failed": "فشلت عملية الدفع",
  "Payment Success": "تم الدفع بنجاح",
  "Booking Confirmed": "تم تأكيد الحجز",
  "Permission Required": "الإذن مطلوب",
};

export const COMMON_ALERT_TITLES_HI: Record<string, string> = {
  error: "त्रुटि",
  Error: "त्रुटि",
  success: "सफल",
  Success: "सफलता",
  warning: "चेतावनी",
  Warning: "चेतावनी",
  info: "जानकारी",
  Info: "जानकारी",
  Notice: "सूचना",
  confirm: "पुष्टि करें",
  Confirm: "पुष्टि करें",
  delete: "हटाएं",
  Delete: "हटाएं",
  logout: "लॉग आउट",
  Logout: "लॉग आउट",
  "Payment Failed": "भुगतान विफल",
  "Payment Success": "भुगतान सफल",
  "Booking Confirmed": "बुकिंग पक्की हो गई",
};

export const COMMON_ALERT_MESSAGES_BN: Record<string, string> = {
  "Please fill in all required fields": "অনুগ্রহ করে সব প্রয়োজনীয় তথ্য পূরণ করুন।",
  "Please fill all fields": "অনুগ্রহ করে সকল ঘর পূরণ করুন।",
  "Invalid email address": "সঠিক ইমেইল ঠিকানা দিন।",
  "Invalid phone number": "সঠিক ফোন নম্বর দিন।",
  "Passwords do not match": "পাসওয়ার্ড দুটি মিলছে না।",
  "Password must be at least 8 characters": "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।",
  "Something went wrong. Please try again": "কিছু ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
  "Something went wrong": "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।",
  "Failed to load data": "তথ্য লোড করা যায়নি।",
  "Network error. Please check your connection.": "নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।",
  "Please check your internet connection": "অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।",
  "Are you sure you want to log out?": "আপনি কি নিশ্চিত লগ আউট করতে চান?",
  "Are you sure you want to delete this?": "আপনি কি নিশ্চিত এটি মুছে ফেলতে চান?",
  "Changes saved successfully": "পরিবর্তনগুলো সফলভাবে সংরক্ষিত হয়েছে।",
  "Changes saved successfully.": "পরিবর্তনগুলো সফলভাবে সংরক্ষিত হয়েছে।",
  "Profile updated successfully": "প্রোফাইল সফলভাবে আপডেট হয়েছে।",
  "Booking confirmed successfully": "বুকিং সফলভাবে নিশ্চিত হয়েছে।",
  "Payment completed successfully": "পেমেন্ট সফলভাবে সম্পন্ন হয়েছে।",
  "Payment was cancelled": "পেমেন্ট বাতিল করা হয়েছে।",
  "Payment failed. Please try again": "পেমেন্ট ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
  "Logged out successfully": "সফলভাবে লগ আউট হয়েছে।",
};

export const COMMON_ALERT_MESSAGES_AR: Record<string, string> = {
  "Please fill in all required fields": "يرجى ملء جميع الحقول المطلوبة.",
  "Please fill all fields": "يرجى ملء جميع الحقول.",
  "Invalid email address": "عنوان بريد إلكتروني غير صالح.",
  "Invalid phone number": "رقم هاتف غير صالح.",
  "Passwords do not match": "كلمات المرور غير متطابقة.",
  "Password must be at least 8 characters": "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
  "Something went wrong. Please try again": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  "Something went wrong": "حدث خطأ ما. حاول مرة أخرى.",
  "Failed to load data": "فشل تحميل البيانات.",
  "Network error. Please check your connection.": "خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.",
  "Are you sure you want to log out?": "هل أنت متأكد أنك تريد تسجيل الخروج؟",
  "Are you sure you want to delete this?": "هل أنت متأكد أنك تريد حذف هذا؟",
  "Changes saved successfully": "تم حفظ التغييرات بنجاح.",
  "Profile updated successfully": "تم تحديث الملف الشخصي بنجاح.",
  "Booking confirmed successfully": "تم تأكيد الحجز بنجاح.",
  "Payment completed successfully": "تمت عملية الدفع بنجاح.",
  "Payment was cancelled": "تم إلغاء عملية الدفع.",
  "Payment failed. Please try again": "فشلت عملية الدفع. يرجى المحاولة مرة أخرى.",
};

export const COMMON_ALERT_MESSAGES_HI: Record<string, string> = {
  "Please fill in all required fields": "कृपया सभी आवश्यक फ़ील्ड भरें।",
  "Invalid email address": "अमान्य ईमेल पता।",
  "Invalid phone number": "अमान्य फ़ोन नंबर।",
  "Passwords do not match": "पासवर्ड मेल नहीं खाते।",
  "Something went wrong. Please try again": "कुछ गलत हो गया। कृपया पुन: प्रयास करें।",
  "Failed to load data": "डेटा लोड करने में विफल।",
  "Are you sure you want to log out?": "क्या आप वाकई लॉग आउट करना चाहते हैं?",
  "Changes saved successfully": "परिवर्तन सफलतापूर्वक सहेजे गए।",
  "Booking confirmed successfully": "बुकिंग की पुष्टि सफलतापूर्वक हो गई।",
  "Payment completed successfully": "भुगतान सफलतापूर्वक पूरा हुआ।",
};

export const COMMON_BUTTON_LABELS_BN: Record<string, string> = {
  ok: "ঠিক আছে",
  OK: "ঠিক আছে",
  Ok: "ঠিক আছে",
  cancel: "বাতিল",
  Cancel: "বাতিল",
  confirm: "নিশ্চিত",
  Confirm: "নিশ্চিত",
  yes: "হ্যাঁ",
  Yes: "হ্যাঁ",
  no: "না",
  No: "না",
  delete: "মুছুন",
  Delete: "মুছুন",
  retry: "আবার চেষ্টা",
  Retry: "আবার চেষ্টা",
  dismiss: "ঠিক আছে",
  Dismiss: "ঠিক আছে",
  close: "বন্ধ",
  Close: "বন্ধ",
  save: "সংরক্ষণ",
  Save: "সংরক্ষণ",
  continue: "চালিয়ে যান",
  Continue: "চালিয়ে যান",
};

export const COMMON_BUTTON_LABELS_AR: Record<string, string> = {
  ok: "حسناً",
  OK: "حسناً",
  Ok: "حسناً",
  cancel: "إلغاء",
  Cancel: "إلغاء",
  confirm: "تأكيد",
  Confirm: "تأكيد",
  yes: "نعم",
  Yes: "نعم",
  no: "لا",
  No: "لا",
  delete: "حذف",
  Delete: "حذف",
  retry: "إعادة المحاولة",
  Retry: "إعادة المحاولة",
  close: "إغلاق",
  Close: "إغلاق",
  save: "حفظ",
  Save: "حفظ",
  continue: "متابعة",
  Continue: "متابعة",
};

export const COMMON_BUTTON_LABELS_HI: Record<string, string> = {
  ok: "ठीक है",
  OK: "ठीक है",
  Ok: "ठीक है",
  cancel: "रद्द करें",
  Cancel: "रद्द करें",
  confirm: "पुष्टि करें",
  Confirm: "पुष्टि करें",
  yes: "हाँ",
  Yes: "हाँ",
  no: "नहीं",
  No: "नहीं",
  delete: "हटाएं",
  Delete: "हटाएं",
  retry: "पुनः प्रयास",
  Retry: "पुनः प्रयास",
  close: "बंद करें",
  Close: "बंद करें",
  save: "सहेजें",
  Save: "सहेजें",
  continue: "जारी रखें",
  Continue: "जारी रखें",
};

/**
 * Localize a string using i18n, dictionary or fallback
 */
export function localizeText(text: string, localeOrIsBengali?: string | boolean): string {
  if (!text) return "";

  const activeLang = typeof localeOrIsBengali === "boolean"
    ? (localeOrIsBengali ? "bn" : "en")
    : (localeOrIsBengali || i18n.language || "en").toLowerCase();

  // 1. If i18n has this key directly
  if (i18n.exists(text)) {
    return i18n.t(text);
  }

  // 2. Dictionaries
  if (activeLang.startsWith("bn")) {
    if (COMMON_ALERT_TITLES_BN[text]) return COMMON_ALERT_TITLES_BN[text];
    if (COMMON_ALERT_MESSAGES_BN[text]) return COMMON_ALERT_MESSAGES_BN[text];
    if (COMMON_BUTTON_LABELS_BN[text]) return COMMON_BUTTON_LABELS_BN[text];
  }

  if (activeLang.startsWith("ar")) {
    if (COMMON_ALERT_TITLES_AR[text]) return COMMON_ALERT_TITLES_AR[text];
    if (COMMON_ALERT_MESSAGES_AR[text]) return COMMON_ALERT_MESSAGES_AR[text];
    if (COMMON_BUTTON_LABELS_AR[text]) return COMMON_BUTTON_LABELS_AR[text];
  }

  if (activeLang.startsWith("hi")) {
    if (COMMON_ALERT_TITLES_HI[text]) return COMMON_ALERT_TITLES_HI[text];
    if (COMMON_ALERT_MESSAGES_HI[text]) return COMMON_ALERT_MESSAGES_HI[text];
    if (COMMON_BUTTON_LABELS_HI[text]) return COMMON_BUTTON_LABELS_HI[text];
  }

  // 3. Fallback
  return i18n.t(text, { defaultValue: text });
}

function getDefaultOkLabel(locale: string): string {
  if (locale.startsWith("bn")) return "ঠিক আছে";
  if (locale.startsWith("ar")) return "حسناً";
  if (locale.startsWith("hi")) return "ठीक है";
  return "OK";
}

/**
 * Unified Localized Alert that automatically translates titles, messages, and buttons
 */
export function showLocalizedAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
): void {
  const currentLang = (i18n.language || "en").toLowerCase();

  const localizedTitle = localizeText(title, currentLang);
  const localizedMessage = message ? localizeText(message, currentLang) : undefined;
  const okLabel = getDefaultOkLabel(currentLang);

  let localizedButtons: AlertButton[] | undefined = undefined;

  if (buttons && buttons.length > 0) {
    localizedButtons = buttons.map((btn) => ({
      ...btn,
      text: btn.text ? localizeText(btn.text, currentLang) : okLabel,
    }));
  } else {
    localizedButtons = [{ text: okLabel }];
  }

  Alert.alert(localizedTitle, localizedMessage, localizedButtons, options);
}

/**
 * Convenience helper for error alerts
 */
export function showErrorAlert(
  message: string,
  title: string = "Error",
  onOk?: () => void
): void {
  showLocalizedAlert(title, message, [{ text: "OK", onPress: onOk }]);
}

/**
 * Convenience helper for success alerts
 */
export function showSuccessAlert(
  message: string,
  title: string = "Success",
  onOk?: () => void
): void {
  showLocalizedAlert(title, message, [{ text: "OK", onPress: onOk }]);
}

/**
 * Convenience helper for destructive / confirmation alerts
 */
export function showConfirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText: string = "Confirm",
  cancelText: string = "Cancel"
): void {
  showLocalizedAlert(title, message, [
    { text: cancelText, style: "cancel" },
    { text: confirmText, style: "destructive", onPress: onConfirm },
  ]);
}
