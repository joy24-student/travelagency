/**
 * Profile Completeness Utility
 * Calculates user profile readiness for travel bookings and highlights missing requirements (e.g. passport, phone).
 */

export interface ProfileCompletenessField {
  key: string;
  labelBn: string;
  labelEn: string;
  weight: number;
  isCompleted: boolean;
  actionBn: string;
  actionEn: string;
  priority: number; // lower number = higher priority to show as next action
  route?: string;
}

export interface ProfileCompletenessResult {
  percent: number;
  isComplete: boolean;
  missingFields: ProfileCompletenessField[];
  completedFields: ProfileCompletenessField[];
  nextAction: ProfileCompletenessField | null;
  headlineBn: string;
  headlineEn: string;
  bookingBlockers: string[];
}

export function calculateProfileCompleteness(
  profile: any,
  kycDocuments: any[] = []
): ProfileCompletenessResult {
  // Check if user has passport number in profile or verified/uploaded passport doc
  const hasPassportInProfile = !!(profile?.passport_number && profile.passport_number.trim().length >= 6);
  const hasPassportDoc = kycDocuments.some(
    (doc) => (doc?.document_type?.toLowerCase() === "passport" || doc?.type?.toLowerCase() === "passport")
  );
  const isPassportFilled = hasPassportInProfile || hasPassportDoc;

  // Name check
  const fullName = profile?.full_name || profile?.display_name || "";
  const isNameFilled = !!(fullName.trim().length >= 3);

  // Phone check
  const phone = profile?.phone || "";
  const isPhoneFilled = !!(phone.trim().length >= 8);

  // Email check
  const email = profile?.email || "";
  const isEmailFilled = !!(email.includes("@") && email.includes("."));

  // Date of Birth check
  const dob = profile?.date_of_birth || profile?.dob || "";
  const isDobFilled = !!(dob && dob.trim().length >= 8);

  // Emergency contact check
  const emergencyPhone = profile?.emergency_contact_phone || profile?.emergencyPhone || "";
  const emergencyName = profile?.emergency_contact_name || profile?.emergencyName || "";
  const isEmergencyFilled = !!(emergencyPhone.trim().length >= 6 || emergencyName.trim().length >= 2);

  // National ID / Address check
  const nid = profile?.national_id || profile?.nid || "";
  const address = profile?.address || profile?.city || "";
  const isNidOrAddressFilled = !!(nid.trim().length >= 8 || address.trim().length >= 3);

  const fields: ProfileCompletenessField[] = [
    {
      key: "name",
      labelBn: "পূর্ণ নাম",
      labelEn: "Full Name",
      weight: 15,
      isCompleted: isNameFilled,
      actionBn: "নাম যোগ করুন",
      actionEn: "add name",
      priority: 2,
    },
    {
      key: "phone",
      labelBn: "মোবাইল নম্বর",
      labelEn: "Phone Number",
      weight: 15,
      isCompleted: isPhoneFilled,
      actionBn: "ফোন নম্বর যোগ করুন",
      actionEn: "add phone number",
      priority: 3,
    },
    {
      key: "email",
      labelBn: "ইমেইল ঠিকানা",
      labelEn: "Email Address",
      weight: 10,
      isCompleted: isEmailFilled,
      actionBn: "ইমেইল যোগ করুন",
      actionEn: "add email address",
      priority: 4,
    },
    {
      key: "passport",
      labelBn: "পাসপোর্ট তথ্য",
      labelEn: "Passport Number",
      weight: 25,
      isCompleted: isPassportFilled,
      actionBn: "পাসপোর্ট যোগ করুন",
      actionEn: "add passport",
      priority: 1, // Highest priority: international travel bookings require passport!
    },
    {
      key: "date_of_birth",
      labelBn: "জন্মতারিখ",
      labelEn: "Date of Birth",
      weight: 15,
      isCompleted: isDobFilled,
      actionBn: "জন্মতারিখ যোগ করুন",
      actionEn: "add date of birth",
      priority: 5,
    },
    {
      key: "emergency_contact",
      labelBn: "জরুরি যোগাযোগ",
      labelEn: "Emergency Contact",
      weight: 10,
      isCompleted: isEmergencyFilled,
      actionBn: "জরুরি যোগাযোগ যোগ করুন",
      actionEn: "add emergency contact",
      priority: 6,
    },
    {
      key: "nid_or_address",
      labelBn: "ঠিকানা বা এনআইডি",
      labelEn: "Address or National ID",
      weight: 10,
      isCompleted: isNidOrAddressFilled,
      actionBn: "এনআইডি বা ঠিকানা যোগ করুন",
      actionEn: "add NID or address",
      priority: 7,
    },
  ];

  const completedFields = fields.filter((f) => f.isCompleted);
  const missingFields = fields
    .filter((f) => !f.isCompleted)
    .sort((a, b) => a.priority - b.priority);

  const rawPercent = completedFields.reduce((sum, f) => sum + f.weight, 0);
  const percent = Math.min(100, Math.max(0, rawPercent));
  const isComplete = percent >= 100;

  const nextAction = missingFields.length > 0 ? missingFields[0] : null;

  // Format headline requested: "প্রোফাইল ৬০% সম্পূর্ণ, পাসপোর্ট যোগ করুন"
  const headlineBn = isComplete
    ? "প্রোফাইল ১০০% সম্পূর্ণ"
    : `প্রোফাইল ${percent}% সম্পূর্ণ, ${nextAction ? nextAction.actionBn : "তথ্য সম্পূর্ণ করুন"}`;

  const headlineEn = isComplete
    ? "Profile 100% Complete"
    : `Profile ${percent}% complete, ${nextAction ? nextAction.actionEn : "complete details"}`;

  const bookingBlockers: string[] = [];
  if (!isPassportFilled) {
    bookingBlockers.push("পাসপোর্ট নম্বর ছাড়া আন্তর্জাতিক ফ্লাইট ও হোটেল বুকিং নিশ্চিত করা সম্ভব নয়।");
  }
  if (!isPhoneFilled) {
    bookingBlockers.push("বুকিং কনফার্মেশন ও ই-টিকিট এসএমএস পেতে ফোন নম্বর আবশ্যক।");
  }

  return {
    percent,
    isComplete,
    missingFields,
    completedFields,
    nextAction,
    headlineBn,
    headlineEn,
    bookingBlockers,
  };
}
