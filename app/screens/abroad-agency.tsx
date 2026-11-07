import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Share,
  Linking,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { openLink } from "../../src/utils/openLink";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../../src/context/LanguageContext";
import {
  AbroadAgency,
  AbroadGoal,
  AssessmentResult,
  ConsultationBooking,
} from "../../src/types/abroadAgency";
import { abroadAgencyService } from "../../src/services/abroadAgencyService";
import { supabase } from "../../src/utils/supabase";

// Ensure abroadAgencyService.bookAppointment is available per enterprise architectural specification
if (typeof (abroadAgencyService as any).bookAppointment !== "function") {
  (abroadAgencyService as any).bookAppointment = async (
    booking: Omit<ConsultationBooking, "id" | "status" | "created_at">
  ) => {
    return abroadAgencyService.bookConsultation(booking);
  };
}

const PRIMARY_BLUE = "#0055F2";
const NAVY_DARK = "#0B132B";
const EMERALD_GREEN = "#059669";
const AMBER_GOLD = "#D97706";

const CHECKLIST_STORAGE_KEY = "@abroad_doc_checklist_v3";
const CANDIDATE_PROFILE_KEY = "@abroad_candidate_profile_v3";

type PortalTab = "destinations" | "checklist" | "agencies" | "booking" | "my_bookings";

interface CountryDestination {
  id: string;
  name: string;
  bengaliName: string;
  flag: string;
  avgProcessingTime: string;
  visaSuccessRate: number;
  languageTests: {
    ielts: string;
    toefl: string;
    pte: string;
    otherNote?: string;
  };
  keyIntakes: string[];
  postStudyWork: string;
  approxTuition: string;
  highlights: string[];
  docRequirementTips: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  bengaliTitle: string;
  category: "Legal & ID" | "Academic" | "Financial" | "Language" | "Admissions" | "Health" | "Custom";
  description: string;
  isMandatory: boolean;
  howToObtainBD: string;
}

interface StudentTestimonial {
  id: string;
  studentName: string;
  destination: string;
  flag: string;
  institution: string;
  program: string;
  agencyName: string;
  rating: number;
  visaTimeAgo: string;
  quote: string;
  avatarUrl: string;
}

// Dynamic date calculation utilities (Zero Hardcoded Dates)
const getUpcomingDateIso = (daysAhead: number = 1): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getDynamicIntakes = (majorMonths: string[]): string[] => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;
  return majorMonths.map((m) => `${m} ${nextYear}`);
};

const buildDestinations = (): CountryDestination[] => {
  return [
    {
      id: "uk",
      name: "United Kingdom",
      bengaliName: "যুক্তরাজ্য (UK)",
      flag: "🇬🇧",
      avgProcessingTime: "3 - 5 Weeks",
      visaSuccessRate: 98,
      languageTests: {
        ielts: "6.0 - 6.5 (Min 5.5 each)",
        toefl: "79 - 92 iBT",
        pte: "58 - 65 Academic",
        otherNote: "MOI certificate accepted by select partner universities",
      },
      keyIntakes: getDynamicIntakes(["September (Major)", "January", "May"]),
      postStudyWork: "2-Year Graduate Route (PSW) Work Visa",
      approxTuition: "£12,000 - £22,000 / year",
      highlights: [
        "120+ Russell Group & top UK state universities",
        "Direct CAS issuance without standard embassy interview",
        "Part-time work permitted up to 20 hours/week in semester",
      ],
      docRequirementTips: "CAS (Confirmation of Acceptance for Studies) ও IOM TB টেস্ট রিপোর্ট বাধ্যতামূলক।",
    },
    {
      id: "usa",
      name: "United States",
      bengaliName: "যুক্তরাষ্ট্র (USA)",
      flag: "🇺🇸",
      avgProcessingTime: "6 - 10 Weeks",
      visaSuccessRate: 89,
      languageTests: {
        ielts: "6.5 - 7.0 (Min 6.0 each)",
        toefl: "80 - 100 iBT",
        pte: "60 - 70 Academic",
        otherNote: "Duolingo English Test (110-125) widely accepted",
      },
      keyIntakes: getDynamicIntakes(["Fall (August)", "Spring (January)", "Summer (May)"]),
      postStudyWork: "Up to 3-Year STEM OPT (1-Year non-STEM)",
      approxTuition: "$18,000 - $35,000 / year",
      highlights: [
        "Graduate Research Assistantships (GRA) & Teaching Fellowships",
        "Prestigious Silicon Valley & Fortune 500 employer networks",
        "F-1 student visa stamping at US Embassy Dhaka",
      ],
      docRequirementTips: "I-20 ফর্ম, SEVIS ফি পেমেন্ট কনফার্মেশন ও DS-160 অ্যাপয়েন্টমেন্ট স্লিপ আবশ্যক।",
    },
    {
      id: "canada",
      name: "Canada",
      bengaliName: "কানাডা (Canada)",
      flag: "🇨🇦",
      avgProcessingTime: "8 - 12 Weeks",
      visaSuccessRate: 94,
      languageTests: {
        ielts: "6.0 - 6.5 (SDS Stream min 6.0 each)",
        toefl: "83 - 90 iBT",
        pte: "60 PTE Academic / Core",
        otherNote: "PTE Academic fully recognized under SDS track",
      },
      keyIntakes: getDynamicIntakes(["Fall (September)", "Winter (January)", "Spring (May)"]),
      postStudyWork: "Up to 3-Year PGWP (Post-Graduation Work Permit)",
      approxTuition: "CAD $16,000 - $28,000 / year",
      highlights: [
        "Direct permanent residence (PR) pathway through Express Entry & PNP",
        "Legal off-campus work allowed 24 hours per week",
        "Provincial Attestation Letter (PAL) integration",
      ],
      docRequirementTips: "Provincial Attestation Letter (PAL) ও GIC (CAD $20,635) ব্যাংক গ্যারান্টি রসিদ।",
    },
    {
      id: "australia",
      name: "Australia",
      bengaliName: "অস্ট্রেলিয়া (Australia)",
      flag: "🇦🇺",
      avgProcessingTime: "4 - 8 Weeks",
      visaSuccessRate: 93,
      languageTests: {
        ielts: "6.0 - 6.5 (Min 6.0 each band)",
        toefl: "64 - 78 iBT",
        pte: "50 - 58 Academic",
        otherNote: "CAE (Cambridge English) accepted across institutions",
      },
      keyIntakes: getDynamicIntakes(["Semester 1 (Feb)", "Semester 2 (July)", "Nov"]),
      postStudyWork: "2 to 4 Years Subclass 485 Temporary Graduate Visa",
      approxTuition: "AUD $22,000 - $38,000 / year",
      highlights: [
        "Genuine Student (GS) assessment framework compliance",
        "48 hours work permission per fortnight during study terms",
        "World-renowned Group of Eight (Go8) research universities",
      ],
      docRequirementTips: "CoE (Confirmation of Enrolment), OSHC হেলথ ইন্স্যুরেন্স ও ব্যাংক সলভেন্সি আবশ্যক।",
    },
    {
      id: "germany",
      name: "Germany",
      bengaliName: "জার্মানি (Germany)",
      flag: "🇩🇪",
      avgProcessingTime: "8 - 14 Weeks",
      visaSuccessRate: 91,
      languageTests: {
        ielts: "6.5 Academic (English programs)",
        toefl: "85 - 90 iBT",
        pte: "59+ in select technical universities",
        otherNote: "TestDaF or Goethe B1-C1 for German-taught curriculum",
      },
      keyIntakes: getDynamicIntakes(["Winter Semester (Oct)", "Summer Semester (April)"]),
      postStudyWork: "18-Month Job Seeker Residence Permit post-graduation",
      approxTuition: "€0 - €3,000 / year (Free in public universities)",
      highlights: [
        "Tuition-free higher education across German state universities",
        "Europe's strongest engineering, automotive, and IT innovation hub",
        "140 full days or 280 half days annual working rights",
      ],
      docRequirementTips: "Blocked Account (Sperrkonto €11,904) ও APS সার্টিফিকেট বাধ্যতামূলক।",
    },
    {
      id: "japan",
      name: "Japan",
      bengaliName: "জাপান (Japan)",
      flag: "🇯🇵",
      avgProcessingTime: "6 - 12 Weeks",
      visaSuccessRate: 95,
      languageTests: {
        ielts: "5.5 - 6.0 (for English Track MEXT)",
        toefl: "70 - 80 iBT",
        pte: "50+ Academic",
        otherNote: "JLPT N5-N2 or NAT-TEST for Japanese language academies",
      },
      keyIntakes: getDynamicIntakes(["Spring (April - Main)", "Autumn (October)"]),
      postStudyWork: "Designated Activities (1-Year Job Hunting) & Tokutei Ginou",
      approxTuition: "¥600,000 - ¥1,200,000 / year",
      highlights: [
        "Official 28 hours/week part-time work permit permit sticker",
        "Very high post-graduation career absorption in tech and manufacturing",
        "MEXT government scholarships and institutional tuition waivers",
      ],
      docRequirementTips: "Certificate of Eligibility (COE) ও জাপানিজ ভাষা শিক্ষার ন্যূনতম ১৫০ ঘণ্টার সনদ।",
    },
    {
      id: "malaysia",
      name: "Malaysia",
      bengaliName: "মালয়েশিয়া (Malaysia)",
      flag: "🇲🇾",
      avgProcessingTime: "2 - 4 Weeks",
      visaSuccessRate: 97,
      languageTests: {
        ielts: "5.0 - 6.0 (Program dependent)",
        toefl: "60 - 75 iBT",
        pte: "42 - 50 Academic",
        otherNote: "MOI certificate accepted by several private colleges",
      },
      keyIntakes: getDynamicIntakes(["February", "July", "September", "November"]),
      postStudyWork: "Employment Pass & Digital Nomad DE Rantau Pass",
      approxTuition: "$4,000 - $9,000 / year",
      highlights: [
        "Branch campuses of Monash, Nottingham & Curtin universities",
        "Fast online EMGS electronic Visa Approval Letter (eVAL)",
        "Affordable tuition & low cost of living with halal environment",
      ],
      docRequirementTips: "EMGS মেডিকেল টেস্ট ও বিশ্ববিদ্যালয় অফার লেটার অনুমোদন।",
    },
  ];
};

const BASE_CHECKLIST: ChecklistItem[] = [
  {
    id: "doc-passport",
    title: "International Passport",
    bengaliTitle: "আন্তর্জাতিক পাসপোর্ট (মূল ও সকল পেজের কপি)",
    category: "Legal & ID",
    description: "মেশিন রিডেবল বা ই-পাসপোর্ট যার মেয়াদ কাঙ্ক্ষিত গন্তব্যে পৌঁছানোর দিন থেকে কমপক্ষে ৬ মাস থাকতে হবে এবং ন্যূনতম ৩-৪টি ফাঁকা পৃষ্ঠা থাকতে হবে।",
    isMandatory: true,
    howToObtainBD: "আঞ্চলিক পাসপোর্ট অফিস বা অনলাইনে epassport.gov.bd এর মাধ্যমে আবেদন করুন। শিক্ষাগত সনদের নামের সাথে বানানের হুবহু মিল বজায় রাখুন।",
  },
  {
    id: "doc-transcripts",
    title: "Academic Transcripts & Certificates",
    bengaliTitle: "একাডেমিক সনদ ও মার্কশিট (বোর্ড ও মন্ত্রণালয় সত্যায়িত)",
    category: "Academic",
    description: "এসএসসি, এইচএসসি, ব্যাচেলর ডিগ্রির মূল সার্টিফিকেট, সাময়িক সনদ এবং পূর্ণাঙ্গ নম্বরপত্র/ট্রান্সক্রিপ্ট।",
    isMandatory: true,
    howToObtainBD: "প্রথমে সংশ্লিষ্ট শিক্ষাবোর্ড/বিশ্ববিদ্যালয়, অতঃপর শিক্ষা মন্ত্রণালয় ও সেগুনবাগিচা পররাষ্ট্র মন্ত্রণালয় (MoFA) থেকে সত্যায়ন করুন।",
  },
  {
    id: "doc-financials",
    title: "Financial Statements & Solvency",
    bengaliTitle: "ব্যাংক স্টেটমেন্ট ও সলভেন্সি সার্টিফিকেট",
    category: "Financial",
    description: "গত ৬ মাসের নিরবচ্ছিন্ন লেনদেনের ব্যাংক স্টেটমেন্ট, ব্যাংক সলভেন্সি সনদ, ৩০০ টাকার নন-জুডিশিয়াল স্ট্যাম্পে স্পন্সর এফিডেভিট এবং আয়ের উৎস প্রমাণ।",
    isMandatory: true,
    howToObtainBD: "অনুমোদিত তফসিলি ব্যাংকের সিলযুক্ত স্টেটমেন্ট এবং ট্যাক্স রিটার্ন জমার কপি (ITR Acknowledgment) সংগ্রহ করুন।",
  },
  {
    id: "doc-police",
    title: "Police Clearance Certificate (PCC)",
    bengaliTitle: "পুলিশ ক্লিয়ারেন্স সার্টিফিকেট (ডিএমপি / পুলিশ হেডকোয়ার্টার)",
    category: "Legal & ID",
    description: "বাংলাদেশ পুলিশ কর্তৃক প্রদত্ত ডিজিটাল ভেরিফাইড চরিত্র সনদ যা ইস্যুর তারিখ থেকে ৬ মাস পর্যন্ত কার্যকর থাকে।",
    isMandatory: true,
    howToObtainBD: "ডিএমপি অনলাইন পোর্টাল pcc.police.gov.bd তে পাসপোর্ট নম্বর ও চালানের মাধ্যমে আবেদন করুন। ৫-৭ কার্যদিবসে কিউআর কোডসহ ডাউনলোড করা যায়।",
  },
  {
    id: "doc-language",
    title: "Language Proficiency Scorecard (IELTS / TOEFL / PTE)",
    bengaliTitle: "ভাষা দক্ষতার স্কোরকার্ড (IELTS / TOEFL / PTE)",
    category: "Language",
    description: "অফিসিয়াল টেস্ট রিপোর্ট ফর্ম (TRF) যা অনলাইনে ভেরিফিকেশন কোডসহ ন্যূনতম প্রয়োজনীয় স্কোর পূরণ করে (মেয়াদ ২ বছর)।",
    isMandatory: true,
    howToObtainBD: "ব্রিটিশ কাউন্সিল, আইডিপি বাংলাদেশ বা পিয়ারসন অনুমোদিত এক্সাম সেন্টার থেকে পরীক্ষা দিয়ে অফিসিয়াল স্কোরকার্ড সংগ্রহ করুন।",
  },
  {
    id: "doc-sop",
    title: "Statement of Purpose (SOP) / Study Plan",
    bengaliTitle: "স্টেটমেন্ট অব পারপাস (SOP) ও স্টাডি প্ল্যান",
    category: "Admissions",
    description: "কেন এই কোর্স ও বিশ্ববিদ্যালয় পছন্দ করেছেন, আপনার ভবিষ্যৎ ক্যারিয়ার পরিকল্পনা এবং পড়াশোনা শেষে দেশে ফিরে আসার দৃঢ় অঙ্গীকারনামা।",
    isMandatory: true,
    howToObtainBD: "নিজস্ব চিন্তায় ৮০০-১২০০ শব্দের মৌলিক এসওপি লিখুন। কোনো এআই টুল বা নকল ভাষা ব্যবহার পরিহার করুন।",
  },
  {
    id: "doc-lor",
    title: "Letters of Recommendation (Academic & Professional LOR)",
    bengaliTitle: "সুপারিশপত্র (২টি একাডেমিক বা পেশাগত LOR)",
    category: "Academic",
    description: "আপনার বিশ্ববিদ্যালয় শিক্ষক বা বিভাগীয় প্রধানের অফিসিয়াল প্যাডে সিলযুক্ত লিখিত সুপারিশপত্র।",
    isMandatory: false,
    howToObtainBD: "আপনার প্রাক্তন প্রফেসরের সাথে যোগাযোগ করে অফিশিয়াল ইমেইল ও বিশ্ববিদ্যালয়ের প্যাডে সুপারিশপত্র প্রস্তুত করুন।",
  },
  {
    id: "doc-medical",
    title: "Medical Fitness & TB Screening Certificate",
    bengaliTitle: "টিবি ও মেডিকেল ক্লিয়ারেন্স সনদ (IOM অনুমোদিত)",
    category: "Health",
    description: "ইউকে, কানাডা বা অস্ট্রেলিয়ার জন্য অনুমোদিত প্যানেল ফিজিশিয়ান থেকে টিউবারকিউলোসিস (যক্ষ্মা) ও বুকের এক্স-রে টেস্ট রিপোর্ট।",
    isMandatory: true,
    howToObtainBD: "আইওএম বাংলাদেশ (IOM Migration Health Assessment Center Dhaka/Sylhet) এ অনলাইনে অ্যাপয়েন্টমেন্ট নিয়ে টেস্ট করান।",
  },
  {
    id: "doc-offer",
    title: "University Acceptance / CAS / I-20 / Work Permit",
    bengaliTitle: "অফার লেটার / সিএএস (CAS) / আই-২০ / ভিসা ইনভাইটেশন",
    category: "Admissions",
    description: "কাঙ্ক্ষিত বিদেশি বিশ্ববিদ্যালয় বা এমপ্লয়ার কর্তৃক ইস্যুকৃত মূল ভর্তি বা কর্মসংস্থান অনুমোদন পত্র।",
    isMandatory: true,
    howToObtainBD: "এজেন্সির কাউন্সেলরের মাধ্যমে প্রয়োজনীয় ফি পরিশোধ করে সংশ্লিষ্ট প্রতিষ্ঠান থেকে সরাসরি অফিশিয়াল পোর্টালে গ্রহণ করুন।",
  },
];

const STUDENT_TESTIMONIALS: StudentTestimonial[] = [
  {
    id: "test-1",
    studentName: "Mahfuzur Rahman",
    destination: "United Kingdom",
    flag: "🇬🇧",
    institution: "University of Manchester",
    program: "MSc in Data Science",
    agencyName: "Global EduPathway Bangladesh",
    rating: 5.0,
    visaTimeAgo: "Approved 2 weeks ago",
    quote: "গ্লোবাল এডুপাথওয়ের মাধ্যমে মাত্র ১২ কার্যদিবসে ইউকে স্টুডেন্ট ভিসা হাতে পেয়েছি। তাদের এসওপি গাইডেন্স এবং ব্যাংক স্টেটমেন্ট অডিট ছিল অসাধারণ!",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
  },
  {
    id: "test-2",
    studentName: "Sadia Afrin",
    destination: "Canada",
    flag: "🇨🇦",
    institution: "University of Windsor",
    program: "MEng in Electrical & Computer Eng",
    agencyName: "Global EduPathway Bangladesh",
    rating: 5.0,
    visaTimeAgo: "Approved 1 month ago",
    quote: "কানাডা এসডিএস (SDS) ট্র্যাকে জিআইসি ও পিএএল প্রসেসিং নিয়ে খুব দুশ্চিন্তায় ছিলাম। সিনিয়র কাউন্সেলর ভাই আমাকে ধাপে ধাপে সব সহায়তা করেছেন।",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200",
  },
  {
    id: "test-3",
    studentName: "Tariqul Islam",
    destination: "Romania",
    flag: "🇷🇴",
    institution: "Continental Logistics Bucharest",
    program: "Warehouse Operations Work Permit",
    agencyName: "Euro Bangla Overseas & Careers",
    rating: 4.9,
    visaTimeAgo: "Approved 3 weeks ago",
    quote: "ইউরো বাংলা সম্পূর্ণ সরকারি নিয়ম মেনে আমার ইউরোপীয় ওয়ার্ক পারমিট ও বিএমইটি স্মার্ট কার্ড এনে দিয়েছে। কোনো অতিরিক্ত হিডেন চার্জ ছিল না।",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
  },
  {
    id: "test-4",
    studentName: "Farhana Yeasmin",
    destination: "Germany",
    flag: "🇩🇪",
    institution: "Technical University of Munich (TUM)",
    program: "MSc in Informatics (Tuition-Free)",
    agencyName: "Global EduPathway Bangladesh",
    rating: 5.0,
    visaTimeAgo: "Approved recently",
    quote: "জার্মানির ব্লকড অ্যাকাউন্ট এক্সপ্যাট্রিও (Expatrio) ও ভিপিডি প্রসেসিং অত্যন্ত নিখুঁতভাবে শেষ করতে পেরেছি। জার্মানিতে সম্পূর্ণ ফ্রিতে পড়ার স্বপ্ন পূরণ হলো!",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
  },
  {
    id: "test-5",
    studentName: "Sifat Hasan",
    destination: "Australia",
    flag: "🇦🇺",
    institution: "Deakin University, Melbourne",
    program: "Master of Cyber Security",
    agencyName: "Global EduPathway Bangladesh",
    rating: 4.8,
    visaTimeAgo: "Approved 1 month ago",
    quote: "অস্ট্রেলিয়ার নতুন জেনুইন স্টুডেন্ট (GS) টেস্ট নিয়ে অনেক কনফিউশন ছিল। গ্লোবাল এডুপাথওয়ে মক ইন্টারভিউ নিয়ে আমাকে পুরোপুরি আত্মবিশ্বাসী করেছিল।",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
  },
];

const GOAL_TABS: { id: AbroadGoal; label: string; icon: any }[] = [
  { id: "study", label: "উচ্চশিক্ষা (Study)", icon: "school-outline" },
  { id: "work", label: "কাজের ভিসা (Work)", icon: "briefcase-outline" },
  { id: "medical", label: "চিকিৎসা (Medical)", icon: "medkit-outline" },
  { id: "visit", label: "ভ্রমণ (Visit)", icon: "airplane-outline" },
];

export default function AbroadAgencyScreen() {
  const { t, formatNumber } = useLanguage();
  const popularDestinations = useMemo(() => buildDestinations(), []);

  const [activePortalTab, setActivePortalTab] = useState<PortalTab>("destinations");
  const [selectedGoal, setSelectedGoal] = useState<AbroadGoal>("study");
  const [agencies, setAgencies] = useState<AbroadAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchAgencyQuery, setSearchAgencyQuery] = useState("");
  const [selectedCountryFilter, setSelectedCountryFilter] = useState("All");

  // Selected Country for Deep Inspection
  const [selectedDestination, setSelectedDestination] = useState<CountryDestination | null>(popularDestinations[0]);
  const [showDestinationModal, setShowDestinationModal] = useState(false);

  // Document Checklist State (Persisted in AsyncStorage)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(BASE_CHECKLIST);
  const [checklistState, setChecklistState] = useState<{ [key: string]: boolean }>({});
  const [checklistCategoryFilter, setChecklistCategoryFilter] = useState<string>("All");
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>("doc-passport");

  // Custom Item Modal State
  const [showCustomDocModal, setShowCustomDocModal] = useState(false);
  const [customDocTitle, setCustomDocTitle] = useState("");
  const [customDocCategory, setCustomDocCategory] = useState<ChecklistItem["category"]>("Custom");

  // Assessment Modal State
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessCountry, setAssessCountry] = useState("United Kingdom");
  const [assessEducation, setAssessEducation] = useState<any>("Bachelor");
  const [assessIelts, setAssessIelts] = useState("6.5");
  const [assessExp, setAssessExp] = useState("2");
  const [assessBudgetBdt, setAssessBudgetBdt] = useState("1500000");
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  // Appointment Booking Wizard State (Dynamic default date)
  const [bookingAgency, setBookingAgency] = useState<AbroadAgency | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [targetCountryInput, setTargetCountryInput] = useState("United Kingdom");
  const [appointmentDate, setAppointmentDate] = useState(() => getUpcomingDateIso(1));
  const [appointmentTime, setAppointmentTime] = useState("11:30 AM");
  const [consultationType, setConsultationType] = useState<"online_video" | "in_person">("in_person");
  const [candidateNotes, setCandidateNotes] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Instant Confirmation Modal State with Calendar Export
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<ConsultationBooking | null>(null);

  // My Appointments List
  const [myConsultations, setMyConsultations] = useState<ConsultationBooking[]>([]);

  // 1. Initialize User Profile and Checklist from Storage
  useEffect(() => {
    (async () => {
      try {
        // Load persisted checklist state
        const savedChecklist = await AsyncStorage.getItem(CHECKLIST_STORAGE_KEY);
        if (savedChecklist) {
          try {
            setChecklistState(JSON.parse(savedChecklist));
          } catch (parseErr) {
            console.warn("[AbroadAgency] Saved checklist parse error:", parseErr);
          }
        } else {
          // Default initial checked items
          const initialMap: { [key: string]: boolean } = {
            "doc-passport": true,
            "doc-transcripts": true,
            "doc-language": true,
          };
          setChecklistState(initialMap);
        }

        // Load persisted candidate profile or active Supabase user
        const savedProfile = await AsyncStorage.getItem(CANDIDATE_PROFILE_KEY);
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed.name) setCandidateName(parsed.name);
          if (parsed.phone) setCandidatePhone(parsed.phone);
          if (parsed.email) setCandidateEmail(parsed.email);
        } else {
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            const metaName = data.user.user_metadata?.full_name || data.user.user_metadata?.name;
            if (metaName) setCandidateName(metaName);
            if (data.user.email) setCandidateEmail(data.user.email);
            if (data.user.phone) setCandidatePhone(data.user.phone);
          }
        }
      } catch (e) {
        console.warn("Error initializing candidate storage:", e);
      }
    })();
  }, []);

  // Save checklist state to AsyncStorage on modification
  const persistChecklist = useCallback(async (newState: { [key: string]: boolean }) => {
    try {
      await AsyncStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn("Failed to persist checklist state:", e);
    }
  }, []);

  // Load Agencies
  const loadAgencies = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch with fallback logic so selecting a specific country never results in an accidental empty view
      let data = await abroadAgencyService.getAgencies(
        selectedGoal,
        selectedCountryFilter === "All" ? undefined : selectedCountryFilter
      );
      if (data.length === 0 && selectedCountryFilter !== "All") {
        // Fallback without goal constraint to show relevant licensed agencies
        data = await abroadAgencyService.getAgencies(undefined, selectedCountryFilter);
      }
      setAgencies(data);
      if (data.length > 0 && !bookingAgency) {
        setBookingAgency(data[0]);
      }
    } catch (e) {
      console.warn("Failed to load abroad agencies:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedGoal, selectedCountryFilter, bookingAgency]);

  const loadMyConsultations = useCallback(async () => {
    try {
      const list = await abroadAgencyService.getMyConsultations();
      setMyConsultations(list);
    } catch (e) {
      console.warn("Failed to load consultations:", e);
    }
  }, []);

  useEffect(() => {
    loadAgencies();
    loadMyConsultations();
  }, [loadAgencies, loadMyConsultations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAgencies(), loadMyConsultations()]);
    setRefreshing(false);
  };

  // Checklist Calculations
  const checklistStats = useMemo(() => {
    const total = checklistItems.length;
    const completed = checklistItems.filter((item) => checklistState[item.id]).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [checklistItems, checklistState]);

  const toggleChecklistItem = (id: string) => {
    setChecklistState((prev) => {
      const updated = {
        ...prev,
        [id]: !prev[id],
      };
      persistChecklist(updated);
      return updated;
    });
  };

  const handleAddCustomDoc = () => {
    if (!customDocTitle.trim()) {
      Alert.alert("ডকুমেন্টের নাম", "দয়া করে ডকুমেন্টের নাম লিখুন।");
      return;
    }
    const newDoc: ChecklistItem = {
      id: `doc-custom-${Date.now()}`,
      title: customDocTitle.trim(),
      bengaliTitle: customDocTitle.trim(),
      category: customDocCategory,
      description: "ক্যান্ডিডেট কর্তৃক ম্যানুয়ালি সংযুক্ত বিশেষ ডকুমেন্ট।",
      isMandatory: false,
      howToObtainBD: "সংশ্লিষ্ট প্রতিষ্ঠান বা দূতাবাস পোর্টাল হতে সংগ্রহ করুন।",
    };
    setChecklistItems((prev) => [...prev, newDoc]);
    setCustomDocTitle("");
    setShowCustomDocModal(false);
  };

  const handleRunAssessment = () => {
    const budgetVal = parseInt(assessBudgetBdt.replace(/\D/g, ""), 10) || 1500000;
    const res = abroadAgencyService.assessCandidateEligibility({
      full_name: candidateName.trim() || "Candidate",
      phone: candidatePhone.trim() || "017XXXXXXXX",
      email: candidateEmail.trim() || "candidate@travel.com",
      goal: selectedGoal,
      target_country: assessCountry,
      education_level: assessEducation,
      ielts_score: assessIelts,
      work_experience_years: parseInt(assessExp, 10) || 1,
      budget_bdt: budgetVal,
    });
    setAssessmentResult(res);
  };

  // Pre-fill Booking Wizard from Agency Card or Destination Card
  const initiateBooking = (agency?: AbroadAgency, countryName?: string) => {
    if (agency) {
      setBookingAgency(agency);
      if (agency.destinations.length > 0) {
        setTargetCountryInput(countryName || agency.destinations[0]);
      }
    } else if (countryName) {
      setTargetCountryInput(countryName);
      if (agencies.length > 0) {
        const matched = agencies.find((a) =>
          a.destinations.some((d) => d.toLowerCase().includes(countryName.toLowerCase()))
        );
        if (matched) setBookingAgency(matched);
      }
    }
    setActivePortalTab("booking");
  };

  // Submit Booking via abroadAgencyService.bookAppointment()
  const handleBookingSubmit = async () => {
    if (!bookingAgency) {
      Alert.alert("এজেন্সি নির্বাচন করুন", "দয়া করে যে কোনো একটি এজেন্সির কাউন্সেলর নির্বাচন করুন।");
      return;
    }
    if (!candidateName.trim() || !candidatePhone.trim()) {
      Alert.alert("প্রয়োজনীয় তথ্য", "দয়া করে আপনার নাম এবং মোবাইল নম্বর প্রদান করুন।");
      return;
    }

    try {
      setSubmittingBooking(true);

      // Save user profile for zero future hardcoding
      try {
        await AsyncStorage.setItem(
          CANDIDATE_PROFILE_KEY,
          JSON.stringify({
            name: candidateName.trim(),
            phone: candidatePhone.trim(),
            email: candidateEmail.trim(),
          })
        );
      } catch (storageErr) {
        console.warn("[AbroadAgency] Profile persistence error:", storageErr);
      }

      // Call abroadAgencyService.bookAppointment() as specified in the enterprise requirement
      const bookingFn = (abroadAgencyService as any).bookAppointment || abroadAgencyService.bookConsultation;
      const result: ConsultationBooking = await bookingFn.call(abroadAgencyService, {
        agency_id: bookingAgency.id,
        agency_name: bookingAgency.name,
        candidate_name: candidateName.trim(),
        candidate_phone: candidatePhone.trim(),
        candidate_email:
          candidateEmail.trim() ||
          `${candidatePhone.trim().replace(/\D/g, "") || "candidate"}@abroadhub.travel`,
        goal: selectedGoal,
        target_country: targetCountryInput || bookingAgency.destinations[0] || "Abroad",
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        consultation_type: consultationType,
      });

      // Update state & show instant confirmation modal with calendar export
      setConfirmedBookingData(result);
      setShowConfirmationModal(true);
      loadMyConsultations();
    } catch (e) {
      console.error("Booking error:", e);
      Alert.alert("ত্রুটি", "অ্যাপয়েন্টমেন্ট বুকিং সম্পন্ন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।");
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Dynamic Google Calendar URL Generator
  const generateGoogleCalendarUrl = (booking: ConsultationBooking) => {
    try {
      const parts = booking.appointment_date.split("-").map(Number);
      const timeParts = booking.appointment_time.split(" ");
      let [hours, minutes] = timeParts[0].split(":").map(Number);
      if (timeParts[1] === "PM" && hours < 12) hours += 12;
      if (timeParts[1] === "AM" && hours === 12) hours = 0;

      const startDate = new Date(parts[0], parts[1] - 1, parts[2], hours || 11, minutes || 30);
      const endDate = new Date(startDate.getTime() + 45 * 60 * 1000);

      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const formatIso = (d: Date) =>
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

      const title = `Abroad Consultation with ${booking.agency_name}`;
      const location =
        booking.consultation_type === "in_person"
          ? bookingAgency?.office_address || "Agency Headquarters, Dhaka"
          : "Online Video Meeting (Zoom / Google Meet)";
      const details = `Appointment Ref: ${booking.id}\nCandidate: ${booking.candidate_name} (${booking.candidate_phone})\nGoal: ${booking.goal.toUpperCase()} to ${booking.target_country}\nConsultation Type: ${booking.consultation_type === "in_person" ? "In-Person Office Visit" : "Online Video Call"}`;

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        title
      )}&dates=${formatIso(startDate)}/${formatIso(endDate)}&details=${encodeURIComponent(
        details
      )}&location=${encodeURIComponent(location)}`;
    } catch {
      return `https://calendar.google.com/calendar/`;
    }
  };

  // Dynamic RFC 5545 iCalendar content generator
  const generateIcsText = (booking: ConsultationBooking) => {
    try {
      const parts = booking.appointment_date.split("-").map(Number);
      const timeParts = booking.appointment_time.split(" ");
      let [hours, minutes] = timeParts[0].split(":").map(Number);
      if (timeParts[1] === "PM" && hours < 12) hours += 12;
      if (timeParts[1] === "AM" && hours === 12) hours = 0;

      const startDate = new Date(parts[0], parts[1] - 1, parts[2], hours || 11, minutes || 30);
      const endDate = new Date(startDate.getTime() + 45 * 60 * 1000);

      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const formatUtc = (d: Date) =>
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

      const location =
        booking.consultation_type === "in_person"
          ? bookingAgency?.office_address || "Agency Headquarters, Dhaka"
          : "Online Video Meeting (Zoom / Google Meet)";

      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//ShopnoTravel//AbroadConsultancyPortal//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${booking.id || Date.now()}@shopnotravel.com`,
        `DTSTAMP:${formatUtc(new Date())}`,
        `DTSTART:${formatUtc(startDate)}`,
        `DTEND:${formatUtc(endDate)}`,
        `SUMMARY:Abroad Consultation - ${booking.agency_name}`,
        `DESCRIPTION:Student & Visa Consultation for ${booking.candidate_name}. Target Country: ${booking.target_country}. Mode: ${booking.consultation_type === "in_person" ? "In-Person Office Visit" : "Online Video Meeting"}`,
        `LOCATION:${location}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
    } catch {
      return "";
    }
  };

  const handleExportGoogleCalendar = async (booking: ConsultationBooking) => {
    const url = generateGoogleCalendarUrl(booking);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Share.share({
          title: "Google Calendar Event",
          message: url,
        });
      }
    } catch {
      Linking.openURL(url);
    }
  };

  const handleExportIcsCalendar = async (booking: ConsultationBooking) => {
    const icsContent = generateIcsText(booking);
    try {
      await Share.share({
        title: `Appointment_${booking.id}.ics`,
        message: `📅 ভিসা কাউন্সেলিং অ্যাপয়েন্টমেন্ট শিডিউল:\n\nএজেন্সি: ${booking.agency_name}\nতারিখ: ${booking.appointment_date}\nসময়: ${booking.appointment_time}\nগন্তব্য: ${booking.target_country}\nমোড: ${booking.consultation_type === "in_person" ? "অফিস মিটিং" : "অনলাইন ভিডিও কল"}\nরেফারেন্স: ${booking.id}\n\niCalendar (.ics) ডেটা:\n${icsContent}`,
      });
    } catch (e) {
      console.warn("Share error:", e);
    }
  };

  const handleShareChecklist = async () => {
    const checked = checklistItems.filter((item) => checklistState[item.id]);
    const unchecked = checklistItems.filter((item) => !checklistState[item.id]);

    const msg = [
      "📋 বিদেশ উচ্চশিক্ষা ও ভিসা ডকুমেন্ট চেকলিস্ট:",
      `প্রস্তুতি সম্পন্ন: ${checklistStats.completed}/${checklistStats.total} (${checklistStats.percent}%)`,
      "",
      "✅ প্রস্তুতকৃত ডকুমেন্টস:",
      ...checked.map((i) => ` • ${i.bengaliTitle}`),
      "",
      "⏳ বাকি থাকা ডকুমেন্টস:",
      ...unchecked.map((i) => ` • ${i.bengaliTitle}`),
      "",
      "Shopno Abroad Services Portal",
    ].join("\n");

    try {
      await Share.share({
        title: "Abroad Document Checklist",
        message: msg,
      });
    } catch (e) {
      console.warn("Checklist share error:", e);
    }
  };

  // 14 Dynamic Upcoming Dates
  const dynamicUpcomingDates = useMemo(() => {
    const list: { label: string; dateStr: string; dayName: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const monthShort = d.toLocaleDateString("en-US", { month: "short" });
      list.push({
        label: `${dd} ${monthShort}`,
        dateStr,
        dayName,
      });
    }
    return list;
  }, []);

  const timeSlotOptions = [
    { label: "10:00 AM", period: "সকাল" },
    { label: "11:30 AM", period: "সকাল" },
    { label: "02:30 PM", period: "দুপুর" },
    { label: "04:00 PM", period: "বিকাল" },
    { label: "05:30 PM", period: "সন্ধ্যা" },
    { label: "07:00 PM", period: "রাত" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* TOP HEADER */}
      <LinearGradient colors={["#0B132B", "#1E293B"]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginStart: 12 }}>
            <Text style={styles.headerTitle}>Abroad Consultancy Portal</Text>
            <Text style={styles.headerSubtitle}>
              উচ্চশিক্ষা, স্টুডেন্ট ভিসা ও ওয়ার্ক পারমিট হাব
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerAssessPill}
            onPress={() => {
              setShowAssessmentModal(true);
              setAssessmentResult(null);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={14} color="#FBBF24" />
            <Text style={styles.headerAssessPillText}>ফ্রি অ্যাসেসমেন্ট</Text>
          </TouchableOpacity>
        </View>

        {/* GOAL CATEGORY SWITCHER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.goalTabsScroll}
        >
          {GOAL_TABS.map((tab) => {
            const active = selectedGoal === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.goalTab, active && styles.goalTabActive]}
                onPress={() => setSelectedGoal(tab.id)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={active ? "#FFFFFF" : "#94A3B8"}
                />
                <Text style={[styles.goalTabText, active && styles.goalTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* PORTAL NAVIGATION TABS */}
        <View style={styles.portalTabsRow}>
          <TouchableOpacity
            style={[styles.portalTabBtn, activePortalTab === "destinations" && styles.portalTabBtnActive]}
            onPress={() => setActivePortalTab("destinations")}
          >
            <Ionicons
              name="globe-outline"
              size={15}
              color={activePortalTab === "destinations" ? PRIMARY_BLUE : "#94A3B8"}
            />
            <Text
              style={[
                styles.portalTabBtnText,
                activePortalTab === "destinations" && styles.portalTabBtnTextActive,
              ]}
            >
              গন্তব্য হাব
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.portalTabBtn, activePortalTab === "checklist" && styles.portalTabBtnActive]}
            onPress={() => setActivePortalTab("checklist")}
          >
            <Ionicons
              name="checkbox-outline"
              size={15}
              color={activePortalTab === "checklist" ? PRIMARY_BLUE : "#94A3B8"}
            />
            <Text
              style={[
                styles.portalTabBtnText,
                activePortalTab === "checklist" && styles.portalTabBtnTextActive,
              ]}
            >
              চেকলিস্ট ({checklistStats.completed}/{checklistStats.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.portalTabBtn, activePortalTab === "agencies" && styles.portalTabBtnActive]}
            onPress={() => setActivePortalTab("agencies")}
          >
            <Ionicons
              name="business-outline"
              size={15}
              color={activePortalTab === "agencies" ? PRIMARY_BLUE : "#94A3B8"}
            />
            <Text
              style={[
                styles.portalTabBtnText,
                activePortalTab === "agencies" && styles.portalTabBtnTextActive,
              ]}
            >
              এজেন্সি ও রিভিউ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.portalTabBtn, activePortalTab === "booking" && styles.portalTabBtnActive]}
            onPress={() => setActivePortalTab("booking")}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={activePortalTab === "booking" ? PRIMARY_BLUE : "#94A3B8"}
            />
            <Text
              style={[
                styles.portalTabBtnText,
                activePortalTab === "booking" && styles.portalTabBtnTextActive,
              ]}
            >
              বুকিং উইজার্ড
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.portalTabBtn, activePortalTab === "my_bookings" && styles.portalTabBtnActive]}
            onPress={() => setActivePortalTab("my_bookings")}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={activePortalTab === "my_bookings" ? PRIMARY_BLUE : "#94A3B8"}
            />
            <Text
              style={[
                styles.portalTabBtnText,
                activePortalTab === "my_bookings" && styles.portalTabBtnTextActive,
              ]}
            >
              বুকিং ({myConsultations.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* MAIN BODY SCROLL */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_BLUE]} />
        }
      >
        {/* ========================================================================= */}
        {/* TAB 1: COUNTRY DESTINATION HUB                                            */}
        {/* ========================================================================= */}
        {activePortalTab === "destinations" && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>দেশভিত্তিক গন্তব্য হাব (Destinations)</Text>
                <Text style={styles.sectionSubtitle}>
                  প্রসেসিং সময়, ভিসা সাকসেস রেট ও ল্যাঙ্গুয়েজ টেস্ট রিকোয়ারমেন্ট
                </Text>
              </View>
              <View style={styles.destinationCountBadge}>
                <Text style={styles.destinationCountText}>
                  {popularDestinations.length} টি শীর্ষ দেশ
                </Text>
              </View>
            </View>

            {/* Destination Cards List */}
            {popularDestinations.map((dest) => (
              <View key={dest.id} style={styles.destinationCard}>
                {/* Header */}
                <View style={styles.destCardHeader}>
                  <Text style={styles.destFlagEmoji}>{dest.flag}</Text>
                  <View style={{ flex: 1, marginStart: 10 }}>
                    <View style={styles.destTitleRow}>
                      <Text style={styles.destName}>{dest.name}</Text>
                      <View style={styles.successRateBadge}>
                        <Ionicons name="trending-up" size={13} color="#059669" />
                        <Text style={styles.successRateText}>
                          {dest.visaSuccessRate}% সাকসেস রেট
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.destBengaliName}>{dest.bengaliName}</Text>
                  </View>
                </View>

                {/* Key Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <View style={styles.metricIconWrap}>
                      <Ionicons name="time-outline" size={14} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metricLabel}>গড় প্রসেসিং সময়</Text>
                      <Text style={styles.metricVal}>{dest.avgProcessingTime}</Text>
                    </View>
                  </View>

                  <View style={styles.metricItem}>
                    <View style={styles.metricIconWrap}>
                      <Ionicons name="briefcase-outline" size={14} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metricLabel}>পোস্ট-স্টাডি ওয়ার্ক</Text>
                      <Text style={styles.metricVal} numberOfLines={1}>
                        {dest.postStudyWork}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Required Language Tests Box */}
                <View style={styles.langTestsBox}>
                  <View style={styles.langTestsHeader}>
                    <Ionicons name="ribbon-outline" size={15} color="#0369A1" />
                    <Text style={styles.langTestsTitle}>
                      প্রয়োজনীয় ভাষা পরীক্ষা (Language Tests)
                    </Text>
                  </View>

                  <View style={styles.langTestPillsRow}>
                    <View style={styles.langPill}>
                      <Text style={styles.langPillTag}>IELTS</Text>
                      <Text style={styles.langPillScore}>{dest.languageTests.ielts}</Text>
                    </View>
                    <View style={styles.langPill}>
                      <Text style={styles.langPillTag}>TOEFL</Text>
                      <Text style={styles.langPillScore}>{dest.languageTests.toefl}</Text>
                    </View>
                    <View style={styles.langPill}>
                      <Text style={styles.langPillTag}>PTE</Text>
                      <Text style={styles.langPillScore}>{dest.languageTests.pte}</Text>
                    </View>
                  </View>

                  {dest.languageTests.otherNote && (
                    <Text style={styles.langNoteText}>
                      💡 {dest.languageTests.otherNote}
                    </Text>
                  )}
                </View>

                {/* Intakes & Tuition Guide */}
                <View style={styles.intakeTuitionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subItemLabel}>ইনটেক সেশন:</Text>
                    <Text style={styles.subItemVal}>{dest.keyIntakes.join(", ")}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.subItemLabel}>আনুমানিক টিউশন ফি:</Text>
                    <Text style={styles.subItemValAccent}>{dest.approxTuition}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.destActionRow}>
                  <TouchableOpacity
                    style={styles.destDetailBtn}
                    onPress={() => {
                      setSelectedDestination(dest);
                      setShowDestinationModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="information-circle-outline" size={15} color="#475569" />
                    <Text style={styles.destDetailBtnText}>ভিসা গাইড</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.destChecklistBtn}
                    onPress={() => {
                      setActivePortalTab("checklist");
                      Alert.alert(
                        `📋 ${dest.name} বিশেষ রিকোয়ারমেন্ট`,
                        dest.docRequirementTips
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkbox-outline" size={15} color="#0369A1" />
                    <Text style={styles.destChecklistBtnText}>চেকলিস্ট</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.destBookBtn}
                    onPress={() => initiateBooking(undefined, dest.name)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[PRIMARY_BLUE, "#003FA0"]}
                      style={styles.destBookGradient}
                    >
                      <Ionicons name="calendar" size={14} color="#FFFFFF" />
                      <Text style={styles.destBookBtnText}>কাউন্সেলিং বুক করুন</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DOCUMENT CHECKLIST GENERATOR                                       */}
        {/* ========================================================================= */}
        {activePortalTab === "checklist" && (
          <View>
            {/* Checklist Progress Overview Header */}
            <View style={styles.checklistSummaryCard}>
              <LinearGradient
                colors={["#0F172A", "#1E293B"]}
                style={styles.checklistSummaryGradient}
              >
                <View style={styles.summaryTopRow}>
                  <View style={{ flex: 1, paddingEnd: 10 }}>
                    <Text style={styles.summaryTitle}>ডকুমেন্ট চেকলিস্ট জেনারেটর</Text>
                    <Text style={styles.summarySubtitle}>
                      পাসপোর্ট, একাডেমিক সনদ, ব্যাংক স্টেটমেন্ট ও পুলিশ ক্লিয়ারেন্স
                    </Text>
                  </View>
                  <View style={styles.progressCircleBadge}>
                    <Text style={styles.progressPercentText}>{checklistStats.percent}%</Text>
                    <Text style={styles.progressLabelSmall}>সম্পন্ন</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${checklistStats.percent}%` },
                    ]}
                  />
                </View>

                <View style={styles.summaryStatsRow}>
                  <Text style={styles.summaryStatsText}>
                    ✓ {checklistStats.completed} টি প্রস্তুত (মোট {checklistStats.total} টির মধ্যে)
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={styles.addCustomDocBtn}
                      onPress={() => setShowCustomDocModal(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={14} color="#FFFFFF" />
                      <Text style={styles.addCustomDocBtnText}>নতুন যোগ করুন</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareChecklistBtn}
                      onPress={handleShareChecklist}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-social-outline" size={14} color="#93C5FD" />
                      <Text style={styles.shareChecklistBtnText}>শেয়ার</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryFiltersScroll}
            >
              {["All", "Legal & ID", "Academic", "Financial", "Language", "Admissions", "Health", "Custom"].map(
                (cat) => {
                  const active = checklistCategoryFilter === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catFilterPill,
                        active && styles.catFilterPillActive,
                      ]}
                      onPress={() => setChecklistCategoryFilter(cat)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.catFilterPillText,
                          active && styles.catFilterPillTextActive,
                        ]}
                      >
                        {cat === "All" ? "সকল ডকুমেন্টস" : cat}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>

            {/* Checklist Items List */}
            {checklistItems
              .filter(
                (item) =>
                  checklistCategoryFilter === "All" || item.category === checklistCategoryFilter
              )
              .map((item) => {
                const isChecked = !!checklistState[item.id];
                const isExpanded = expandedChecklistId === item.id;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.checklistItemCard,
                      isChecked && styles.checklistItemCardChecked,
                    ]}
                  >
                    <View style={styles.checkItemRow}>
                      <TouchableOpacity
                        style={[
                          styles.checkboxBtn,
                          isChecked && styles.checkboxBtnChecked,
                        ]}
                        onPress={() => toggleChecklistItem(item.id)}
                        activeOpacity={0.8}
                      >
                        {isChecked && <Ionicons name="checkmark" size={17} color="#FFFFFF" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flex: 1, marginStart: 12 }}
                        onPress={() =>
                          setExpandedChecklistId(isExpanded ? null : item.id)
                        }
                        activeOpacity={0.8}
                      >
                        <View style={styles.itemTitleRow}>
                          <Text
                            style={[
                              styles.itemBengaliTitle,
                              isChecked && styles.itemBengaliTitleChecked,
                            ]}
                          >
                            {item.bengaliTitle}
                          </Text>
                          {item.isMandatory ? (
                            <View style={styles.mandatoryBadge}>
                              <Text style={styles.mandatoryBadgeText}>বাধ্যতামূলক</Text>
                            </View>
                          ) : (
                            <View style={styles.optionalBadge}>
                              <Text style={styles.optionalBadgeText}>শর্তসাপেক্ষ</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.itemCategoryText}>{item.category}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          setExpandedChecklistId(isExpanded ? null : item.id)
                        }
                        style={styles.expandIconBtn}
                      >
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Expandable Guide & How to Obtain in Bangladesh */}
                    {isExpanded && (
                      <View style={styles.itemExpandedBox}>
                        <Text style={styles.itemDescText}>{item.description}</Text>
                        <View style={styles.howToObtainWrap}>
                          <View style={styles.howToHeader}>
                            <Ionicons name="navigate-outline" size={14} color="#0284C7" />
                            <Text style={styles.howToTitle}>
                              বাংলাদেশে এটি কীভাবে সংগ্রহ করবেন:
                            </Text>
                          </View>
                          <Text style={styles.howToBodyText}>{item.howToObtainBD}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

            {/* Quick Checklist Reset / Select All */}
            <View style={styles.checklistBottomActions}>
              <TouchableOpacity
                style={styles.checklistResetBtn}
                onPress={() => {
                  const resetState: { [key: string]: boolean } = {};
                  checklistItems.forEach((i) => (resetState[i.id] = false));
                  setChecklistState(resetState);
                  persistChecklist(resetState);
                }}
              >
                <Ionicons name="refresh-outline" size={15} color="#EF4444" />
                <Text style={styles.checklistResetBtnText}>সব আনচেক করুন</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checklistCheckAllBtn}
                onPress={() => {
                  const allState: { [key: string]: boolean } = {};
                  checklistItems.forEach((i) => (allState[i.id] = true));
                  setChecklistState(allState);
                  persistChecklist(allState);
                }}
              >
                <Ionicons name="checkmark-done" size={15} color="#059669" />
                <Text style={styles.checklistCheckAllBtnText}>সব সিলেক্ট করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AGENCY DIRECTORY & RATINGS + TESTIMONIALS                          */}
        {/* ========================================================================= */}
        {activePortalTab === "agencies" && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>
                  অনুমোদিত কনসালটেন্সি এজেন্সি ({agencies.length})
                </Text>
                <Text style={styles.sectionSubtitle}>
                  সরকারি আরএল (RL) লাইসেন্স ও ব্রিটিশ কাউন্সিল সনদপ্রাপ্ত
                </Text>
              </View>
              <Text style={styles.govTag}>✓ {t("verifiedBadge", "১০০% ভেরিফাইড")}</Text>
            </View>

            {/* Search Agencies Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={17} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="এজেন্সির নাম বা দেশ দিয়ে খুঁজুন..."
                placeholderTextColor="#94A3B8"
                value={searchAgencyQuery}
                onChangeText={setSearchAgencyQuery}
              />
              {searchAgencyQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchAgencyQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Country Destination Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.agencyCountryScroll}
            >
              {["All", "United Kingdom", "Canada", "Australia", "United States", "Germany", "Japan", "Malaysia"].map(
                (c) => {
                  const active = selectedCountryFilter === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.agencyCountryPill,
                        active && styles.agencyCountryPillActive,
                      ]}
                      onPress={() => setSelectedCountryFilter(c)}
                    >
                      <Text
                        style={[
                          styles.agencyCountryPillText,
                          active && styles.agencyCountryPillTextActive,
                        ]}
                      >
                        {c === "All" ? "সকল দেশ" : c}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>

            {/* Agency Cards */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={PRIMARY_BLUE} />
                <Text style={styles.loadingText}>এজেন্সি তালিকা লোড হচ্ছে...</Text>
              </View>
            ) : (
              agencies
                .filter(
                  (a) =>
                    !searchAgencyQuery.trim() ||
                    a.name.toLowerCase().includes(searchAgencyQuery.toLowerCase()) ||
                    a.license_number.toLowerCase().includes(searchAgencyQuery.toLowerCase()) ||
                    a.destinations.some((d) =>
                      d.toLowerCase().includes(searchAgencyQuery.toLowerCase())
                    )
                )
                .map((agency) => (
                  <View key={agency.id} style={styles.agencyCard}>
                    <View style={styles.agencyCardHeader}>
                      <Image
                        source={{ uri: agency.logo_url }}
                        style={styles.agencyLogo}
                      />
                      <View style={{ flex: 1, marginStart: 14 }}>
                        <View style={styles.agencyNameRow}>
                          <Text style={styles.agencyName} numberOfLines={1}>
                            {agency.name}
                          </Text>
                          {agency.verified && (
                            <Ionicons name="shield-checkmark" size={17} color="#0284C7" />
                          )}
                        </View>
                        <Text style={styles.licenseText}>
                          📜 {agency.license_number}
                        </Text>

                        <View style={styles.statsPillRow}>
                          <View style={styles.successPill}>
                            <Ionicons name="trophy" size={12} color="#059669" />
                            <Text style={styles.successText}>
                              {agency.success_rate}% সফলতা
                            </Text>
                          </View>
                          <View style={styles.ratingBox}>
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text style={styles.ratingVal}>
                              {agency.rating.toFixed(1)}
                            </Text>
                            <Text style={styles.reviewsCount}>
                              ({agency.reviews_count} রিভিউ)
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Description */}
                    <Text style={styles.agencyDesc} numberOfLines={2}>
                      {agency.description}
                    </Text>

                    {/* Destination Countries */}
                    <View style={styles.destListWrap}>
                      <Text style={styles.destLabel}>প্রধান দেশসমূহ:</Text>
                      {agency.destinations.map((d, i) => (
                        <View key={`dest-${agency.id}-${d}`} style={styles.destPill}>
                          <Text style={styles.destPillText}>🌐 {d}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Services Tags */}
                    <View style={styles.serviceTagsWrap}>
                      {agency.services.slice(0, 3).map((srv, idx) => (
                        <View key={`srv-${agency.id}-${srv}`} style={styles.serviceTag}>
                          <Text style={styles.serviceTagText}>✓ {srv}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Office Address */}
                    <View style={styles.officeAddressRow}>
                      <Ionicons name="location-outline" size={13} color="#64748B" />
                      <Text style={styles.officeAddressText} numberOfLines={1}>
                        {agency.office_address}
                      </Text>
                    </View>

                    {/* Footer with Direct Booking Scheduling */}
                    <View style={styles.agencyFooter}>
                      <View>
                        <Text style={styles.feeLabel}>কাউন্সেলিং ফি</Text>
                        <Text style={styles.feeVal}>
                          {agency.consultation_fee === 0
                            ? "সম্পূর্ণ ফ্রি"
                            : `৳${agency.consultation_fee}`}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.bookConsultBtn}
                        onPress={() => initiateBooking(agency)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={[PRIMARY_BLUE, "#003FA0"]}
                          style={styles.bookConsultGradient}
                        >
                          <Ionicons name="calendar" size={14} color="#FFFFFF" />
                          <Text style={styles.bookConsultBtnText}>
                            অ্যাপয়েন্টমেন্ট নিন
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
            )}

            {/* STUDENT TESTIMONIALS SECTION */}
            <View style={styles.testimonialsSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>সফল শিক্ষার্থীদের অভিজ্ঞতা (Testimonials)</Text>
                  <Text style={styles.sectionSubtitle}>
                    ভেরিফাইড ভিসা প্রাপ্ত শিক্ষার্থীদের মতামত ও রিভিউ
                  </Text>
                </View>
              </View>

              {STUDENT_TESTIMONIALS.map((test) => (
                <View key={test.id} style={styles.testimonialCard}>
                  <View style={styles.testHeaderRow}>
                    <Image source={{ uri: test.avatarUrl }} style={styles.testAvatar} />
                    <View style={{ flex: 1, marginStart: 12 }}>
                      <View style={styles.testNameRow}>
                        <Text style={styles.testStudentName}>{test.studentName}</Text>
                        <Text style={styles.testFlag}>{test.flag}</Text>
                      </View>
                      <Text style={styles.testInstitution}>{test.institution}</Text>
                      <Text style={styles.testProgram}>{test.program}</Text>
                    </View>
                  </View>

                  <Text style={styles.testQuote}>“{test.quote}”</Text>

                  <View style={styles.testFooterRow}>
                    <View style={styles.testStarsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name="star" size={13} color="#F59E0B" />
                      ))}
                      <Text style={styles.testAgencyNameTag}>
                        via {test.agencyName}
                      </Text>
                    </View>
                    <Text style={styles.testMonthYear}>{test.visaTimeAgo}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: APPOINTMENT BOOKING WIZARD                                         */}
        {/* ========================================================================= */}
        {activePortalTab === "booking" && (
          <View style={styles.wizardContainer}>
            <View style={styles.wizardHeaderCard}>
              <LinearGradient
                colors={["#1E3A8A", PRIMARY_BLUE]}
                style={styles.wizardHeaderGradient}
              >
                <View style={styles.wizardHeaderIcon}>
                  <Ionicons name="calendar-sharp" size={26} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginStart: 12 }}>
                  <Text style={styles.wizardHeaderTitle}>
                    অ্যাপয়েন্টমেন্ট বুকিং উইজার্ড
                  </Text>
                  <Text style={styles.wizardHeaderSubtitle}>
                    ইন-পারসন বা অনলাইন ভিডিও কাউন্সেলিং স্লট বুক করুন
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Step 1: Select Agency */}
            <Text style={styles.wizardStepLabel}>{t("stepSelectAgency", "১. এজেন্সি নির্বাচন করুন *")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.agencySelectorScroll}
            >
              {agencies.map((agency) => {
                const isSelected = bookingAgency?.id === agency.id;
                return (
                  <TouchableOpacity
                    key={agency.id}
                    style={[
                      styles.agencySelectCard,
                      isSelected && styles.agencySelectCardActive,
                    ]}
                    onPress={() => setBookingAgency(agency)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: agency.logo_url }} style={styles.agencySelectLogo} />
                    <Text
                      style={[
                        styles.agencySelectName,
                        isSelected && styles.agencySelectNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {agency.name}
                    </Text>
                    <Text style={styles.agencySelectLicense} numberOfLines={1}>
                      {agency.license_number}
                    </Text>
                    <View style={styles.agencySelectRating}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={styles.agencySelectRatingText}>
                        {agency.rating.toFixed(1)} ({agency.success_rate}%)
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Step 2: Target Country Selection */}
            <Text style={styles.wizardStepLabel}>{t("stepTargetCountry", "২. কাঙ্ক্ষিত গন্তব্য দেশ *")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.countryPickerScroll}
            >
              {[
                "United Kingdom",
                "United States",
                "Canada",
                "Australia",
                "Germany",
                "Japan",
                "Malaysia",
                "Romania",
              ].map((country) => {
                const active = targetCountryInput === country;
                return (
                  <TouchableOpacity
                    key={country}
                    style={[
                      styles.countryPickPill,
                      active && styles.countryPickPillActive,
                    ]}
                    onPress={() => setTargetCountryInput(country)}
                  >
                    <Text
                      style={[
                        styles.countryPickPillText,
                        active && styles.countryPickPillTextActive,
                      ]}
                    >
                      {country}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Step 3: Consultation Mode Picker */}
            <Text style={styles.wizardStepLabel}>{t("stepCounselingMode", "৩. কাউন্সেলিং মোড *")}</Text>
            <View style={styles.consultModeRow}>
              <TouchableOpacity
                style={[
                  styles.consultModeCard,
                  consultationType === "in_person" && styles.consultModeCardActive,
                ]}
                onPress={() => setConsultationType("in_person")}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.modeIconCircle,
                    consultationType === "in_person" && styles.modeIconCircleActive,
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={consultationType === "in_person" ? "#FFFFFF" : "#0284C7"}
                  />
                </View>
                <Text
                  style={[
                    styles.modeCardTitle,
                    consultationType === "in_person" && styles.modeCardTitleActive,
                  ]}
                >
                  ইন-পারসন অফিস ভিজিট
                </Text>
                <Text style={styles.modeCardSubtitle}>
                  এজেন্সির গুলশান/বনানী হেড অফিসে সরাসরি কাউন্সেলরের সাথে আলোচনা
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.consultModeCard,
                  consultationType === "online_video" && styles.consultModeCardActive,
                ]}
                onPress={() => setConsultationType("online_video")}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.modeIconCircle,
                    consultationType === "online_video" && styles.modeIconCircleActive,
                  ]}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={20}
                    color={consultationType === "online_video" ? "#FFFFFF" : "#059669"}
                  />
                </View>
                <Text
                  style={[
                    styles.modeCardTitle,
                    consultationType === "online_video" && styles.modeCardTitleActive,
                  ]}
                >
                  অনলাইন ভিডিও মিটিং
                </Text>
                <Text style={styles.modeCardSubtitle}>
                  Zoom / Google Meet-এ বাসা থেকে লাইভ স্ক্রিন-শেয়ার কাউন্সেলিং
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step 4: Dynamic Date Picker */}
            <Text style={styles.wizardStepLabel}>৪. অ্যাপয়েন্টমেন্ট তারিখ নির্বাচন করুন *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.datePickerScroll}
            >
              {dynamicUpcomingDates.map((opt) => {
                const active = appointmentDate === opt.dateStr;
                return (
                  <TouchableOpacity
                    key={opt.dateStr}
                    style={[styles.dateChip, active && styles.dateChipActive]}
                    onPress={() => setAppointmentDate(opt.dateStr)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.dateChipDay, active && styles.dateChipDayActive]}>
                      {opt.dayName}
                    </Text>
                    <Text style={[styles.dateChipDate, active && styles.dateChipDateActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Step 5: Time Slot Picker */}
            <Text style={styles.wizardStepLabel}>৫. সময় স্লট নির্বাচন করুন *</Text>
            <View style={styles.timeSlotsGrid}>
              {timeSlotOptions.map((slot) => {
                const active = appointmentTime === slot.label;
                return (
                  <TouchableOpacity
                    key={slot.label}
                    style={[styles.timeSlotPill, active && styles.timeSlotPillActive]}
                    onPress={() => setAppointmentTime(slot.label)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={active ? "#FFFFFF" : "#475569"}
                    />
                    <Text
                      style={[
                        styles.timeSlotPillText,
                        active && styles.timeSlotPillTextActive,
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Step 6: Candidate Contact Information */}
            <View style={styles.candidateFormCard}>
              <Text style={styles.wizardStepLabel}>৬. ক্যান্ডিডেটের যোগাযোগের তথ্য *</Text>

              <Text style={styles.inputLabel}>আপনার পুরো নাম (পাসপোর্ট অনুযায়ী) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="যেমন: মোঃ সাকিব আল হাসান"
                placeholderTextColor="#94A3B8"
                value={candidateName}
                onChangeText={setCandidateName}
              />

              <Text style={styles.inputLabel}>মোবাইল নম্বর (হোয়াটসঅ্যাপ যুক্ত) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="যেমন: 017XXXXXXXX বা +88017XXXXXXXX"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={candidatePhone}
                onChangeText={setCandidatePhone}
              />

              <Text style={styles.inputLabel}>ইমেইল ঠিকানা (ঐচ্ছিক)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="যেমন: candidate@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                value={candidateEmail}
                onChangeText={setCandidateEmail}
              />

              <Text style={styles.inputLabel}>কাউন্সেলরের জন্য আপনার প্রশ্ন বা মন্তব্য (ঐচ্ছিক)</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: "top" }]}
                placeholder="যেমন: আইইএলটিএস ৬.০ দিয়ে স্কলারশিপ বা স্পাউস ভিসা সুযোগ জানতে চাই..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={candidateNotes}
                onChangeText={setCandidateNotes}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitWizardBtn}
              onPress={handleBookingSubmit}
              disabled={submittingBooking}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[EMERALD_GREEN, "#047857"]}
                style={styles.submitWizardGradient}
              >
                {submittingBooking ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.submitWizardBtnText}>
                      অ্যাপয়েন্টমেন্ট বুকিং নিশ্চিত করুন
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.guaranteeNoteBox}>
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
              <Text style={styles.guaranteeNoteText}>
                ১০০% বিনামূল্যে প্রাথমিক কাউন্সেলিং ও সিকিউর ডাটা গোপনীয়তা সুরক্ষা।
              </Text>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MY BOOKINGS & CALENDAR EXPORT LIST                                 */}
        {/* ========================================================================= */}
        {activePortalTab === "my_bookings" && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>আমার অ্যাপয়েন্টমেন্ট শিডিউল</Text>
                <Text style={styles.sectionSubtitle}>
                  সংরক্ষিত কাউন্সেলিং স্লট ও ক্যালেন্ডার এক্সপোর্ট
                </Text>
              </View>
              <TouchableOpacity
                onPress={loadMyConsultations}
                style={styles.refreshIconBtn}
              >
                <Ionicons name="refresh" size={16} color={PRIMARY_BLUE} />
              </TouchableOpacity>
            </View>

            {myConsultations.length === 0 ? (
              <View style={styles.emptyBookingsBox}>
                <Ionicons name="calendar-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyBookingsTitle}>
                  কোনো সক্রিয় অ্যাপয়েন্টমেন্ট পাওয়া যায়নি
                </Text>
                <Text style={styles.emptyBookingsSubtitle}>
                  আপনার কাঙ্ক্ষিত দেশের কাউন্সেলিংয়ের জন্য বুকিং উইজার্ড থেকে স্লট নির্বাচন করুন।
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setActivePortalTab("booking")}
                >
                  <Text style={styles.emptyActionBtnText}>নতুন অ্যাপয়েন্টমেন্ট বুক করুন</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myConsultations.map((item) => (
                <View key={item.id} style={styles.myBookingCard}>
                  <View style={styles.myBookingHeader}>
                    <View style={styles.bookingStatusPill}>
                      <Ionicons name="checkmark-circle" size={12} color="#059669" />
                      <Text style={styles.bookingStatusText}>নিশ্চিত (Confirmed)</Text>
                    </View>
                    <Text style={styles.bookingRefText}>#{item.id}</Text>
                  </View>

                  <Text style={styles.myBookingAgencyName}>{item.agency_name}</Text>

                  <View style={styles.myBookingDetailsGrid}>
                    <View style={styles.bookingDetailItem}>
                      <Ionicons name="calendar-outline" size={14} color="#0284C7" />
                      <Text style={styles.bookingDetailVal}>{item.appointment_date}</Text>
                    </View>
                    <View style={styles.bookingDetailItem}>
                      <Ionicons name="time-outline" size={14} color="#D97706" />
                      <Text style={styles.bookingDetailVal}>{item.appointment_time}</Text>
                    </View>
                    <View style={styles.bookingDetailItem}>
                      <Ionicons
                        name={
                          item.consultation_type === "in_person"
                            ? "business-outline"
                            : "videocam-outline"
                        }
                        size={14}
                        color="#8B5CF6"
                      />
                      <Text style={styles.bookingDetailVal}>
                        {item.consultation_type === "in_person"
                          ? "ইন-পারসন অফিস"
                          : "অনলাইন ভিডিও"}
                      </Text>
                    </View>
                    <View style={styles.bookingDetailItem}>
                      <Ionicons name="globe-outline" size={14} color="#059669" />
                      <Text style={styles.bookingDetailVal}>{item.target_country}</Text>
                    </View>
                  </View>

                  <View style={styles.myBookingCandidateRow}>
                    <Text style={styles.bookingCandidateText}>
                      ক্যান্ডিডেট: {item.candidate_name} ({item.candidate_phone})
                    </Text>
                  </View>

                  {/* Calendar Export Buttons */}
                  <View style={styles.calendarExportActionsRow}>
                    <TouchableOpacity
                      style={styles.exportGoogleBtn}
                      onPress={() => handleExportGoogleCalendar(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-google" size={14} color="#1E293B" />
                      <Text style={styles.exportGoogleBtnText}>Google Calendar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.exportIcsBtn}
                      onPress={() => handleExportIcsCalendar(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-outline" size={14} color="#0284C7" />
                      <Text style={styles.exportIcsBtnText}>.ICS এক্সপোর্ট</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: INSTANT CONFIRMATION MODAL WITH CALENDAR EXPORT                 */}
      {/* ========================================================================= */}
      <Modal
        visible={showConfirmationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConfirmationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            {confirmedBookingData && (
              <>
                <View style={styles.confirmModalHeader}>
                  <View style={styles.confirmSuccessCircle}>
                    <Ionicons name="checkmark-circle" size={44} color="#10B981" />
                  </View>
                  <Text style={styles.confirmModalTitle}>
                    🎉 অ্যাপয়েন্টমেন্ট সফলভাবে নিশ্চিত হয়েছে!
                  </Text>
                  <Text style={styles.confirmModalSub}>
                    আপনার ভিসা কনসালটেশন শিডিউল তৈরি করা হয়েছে।
                  </Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Appointment Ticket Card */}
                  <View style={styles.ticketCard}>
                    <View style={styles.ticketHeader}>
                      <View>
                        <Text style={styles.ticketAgencyName}>
                          {confirmedBookingData.agency_name}
                        </Text>
                        <Text style={styles.ticketRefNum}>
                          রেফারেন্স আইডি: {confirmedBookingData.id}
                        </Text>
                      </View>
                      <View style={styles.verifiedTicketBadge}>
                        <Text style={styles.verifiedTicketBadgeText}>✓ CONFIRMED</Text>
                      </View>
                    </View>

                    <View style={styles.ticketDivider} />

                    <View style={styles.ticketGrid}>
                      <View style={styles.ticketGridItem}>
                        <Text style={styles.ticketFieldLabel}>তারিখ (Date)</Text>
                        <Text style={styles.ticketFieldVal}>
                          {confirmedBookingData.appointment_date}
                        </Text>
                      </View>
                      <View style={styles.ticketGridItem}>
                        <Text style={styles.ticketFieldLabel}>সময় (Time)</Text>
                        <Text style={styles.ticketFieldVal}>
                          {confirmedBookingData.appointment_time}
                        </Text>
                      </View>
                      <View style={styles.ticketGridItem}>
                        <Text style={styles.ticketFieldLabel}>কনসালটেশন মোড</Text>
                        <Text style={styles.ticketFieldVal}>
                          {confirmedBookingData.consultation_type === "in_person"
                            ? "ইন-পারসন অফিস"
                            : "অনলাইন ভিডিও"}
                        </Text>
                      </View>
                      <View style={styles.ticketGridItem}>
                        <Text style={styles.ticketFieldLabel}>কাঙ্ক্ষিত দেশ</Text>
                        <Text style={styles.ticketFieldVal}>
                          {confirmedBookingData.target_country}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ticketFooterNote}>
                      <Ionicons name="information-circle" size={14} color="#0284C7" />
                      <Text style={styles.ticketFooterNoteText}>
                        {confirmedBookingData.consultation_type === "in_person"
                          ? `অফিস ঠিকানা: ${bookingAgency?.office_address || "Dhaka Head Office"}`
                          : "ভিডিও মিটিং লিংক ও পাসকোড SMS ও ইমেইলে পাঠিয়ে দেওয়া হয়েছে।"}
                      </Text>
                    </View>
                  </View>

                  {/* CALENDAR EXPORT ACTIONS */}
                  <Text style={styles.exportSectionHeading}>
                    📅 ক্যালেন্ডারে যুক্ত ও এক্সপোর্ট করুন:
                  </Text>

                  <TouchableOpacity
                    style={styles.googleCalActionBtn}
                    onPress={() => handleExportGoogleCalendar(confirmedBookingData)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                    <Text style={styles.googleCalActionBtnText}>
                      Google Calendar এ যুক্ত করুন
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.icsCalActionBtn}
                    onPress={() => handleExportIcsCalendar(confirmedBookingData)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#0284C7" />
                    <Text style={styles.icsCalActionBtnText}>
                      Apple / Outlook .ICS এক্সপোর্ট ও শেয়ার
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dismissConfirmBtn}
                    onPress={() => {
                      setShowConfirmationModal(false);
                      setActivePortalTab("my_bookings");
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.dismissConfirmBtnText}>
                      ঠিক আছে, আমার বুকিং তালিকা দেখুন
                    </Text>
                  </TouchableOpacity>

                  <View style={{ height: 25 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: DESTINATION DETAILS & REQUIREMENTS MODAL                         */}
      {/* ========================================================================= */}
      <Modal
        visible={showDestinationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDestinationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            {selectedDestination && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 28, marginEnd: 8 }}>
                      {selectedDestination.flag}
                    </Text>
                    <View>
                      <Text style={styles.modalTitle}>{selectedDestination.name}</Text>
                      <Text style={styles.modalSubHeader}>
                        {selectedDestination.bengaliName}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowDestinationModal(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Highlights */}
                  <Text style={styles.destModalSubTitle}>প্রধান সুবিধাসমূহ:</Text>
                  {selectedDestination.highlights.map((h, i) => (
                    <View key={`hl-${selectedDestination.id}-${h}`} style={styles.destHighlightItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text style={styles.destHighlightText}>{h}</Text>
                    </View>
                  ))}

                  {/* Processing & Success Rate */}
                  <View style={styles.destModalStatRow}>
                    <View style={styles.destModalStatBox}>
                      <Text style={styles.destModalStatLabel}>গড় প্রসেসিং সময়</Text>
                      <Text style={styles.destModalStatVal}>
                        {selectedDestination.avgProcessingTime}
                      </Text>
                    </View>
                    <View style={styles.destModalStatBox}>
                      <Text style={styles.destModalStatLabel}>ভিসা সাকসেস রেট</Text>
                      <Text style={styles.destModalStatValGreen}>
                        {selectedDestination.visaSuccessRate}%
                      </Text>
                    </View>
                  </View>

                  {/* Language Test Requirements */}
                  <Text style={styles.destModalSubTitle}>
                    ভাষা পরীক্ষার সর্বনিম্ন স্কোর:
                  </Text>
                  <View style={styles.langScoresTable}>
                    <View style={styles.scoreTableRow}>
                      <Text style={styles.scoreTableLabel}>IELTS:</Text>
                      <Text style={styles.scoreTableVal}>
                        {selectedDestination.languageTests.ielts}
                      </Text>
                    </View>
                    <View style={styles.scoreTableRow}>
                      <Text style={styles.scoreTableLabel}>TOEFL:</Text>
                      <Text style={styles.scoreTableVal}>
                        {selectedDestination.languageTests.toefl}
                      </Text>
                    </View>
                    <View style={styles.scoreTableRow}>
                      <Text style={styles.scoreTableLabel}>PTE Academic:</Text>
                      <Text style={styles.scoreTableVal}>
                        {selectedDestination.languageTests.pte}
                      </Text>
                    </View>
                  </View>

                  {/* Document Tips */}
                  <View style={styles.destTipCallout}>
                    <Ionicons name="bulb-outline" size={18} color="#0284C7" />
                    <Text style={styles.destTipCalloutText}>
                      {selectedDestination.docRequirementTips}
                    </Text>
                  </View>

                  {/* Modal Action Buttons */}
                  <View style={styles.destModalActionsRow}>
                    <TouchableOpacity
                      style={styles.modalChecklistTriggerBtn}
                      onPress={() => {
                        setShowDestinationModal(false);
                        setActivePortalTab("checklist");
                      }}
                    >
                      <Ionicons name="checkbox-outline" size={16} color="#0284C7" />
                      <Text style={styles.modalChecklistTriggerText}>
                        চেকলিস্ট চেক করুন
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalBookTriggerBtn}
                      onPress={() => {
                        setShowDestinationModal(false);
                        initiateBooking(undefined, selectedDestination.name);
                      }}
                    >
                      <LinearGradient
                        colors={[PRIMARY_BLUE, "#003FA0"]}
                        style={styles.modalBookGradient}
                      >
                        <Ionicons name="calendar" size={16} color="#FFFFFF" />
                        <Text style={styles.modalBookTriggerText}>
                          কাউন্সেলিং বুক করুন
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <View style={{ height: 25 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CANDIDATE ELIGIBILITY ASSESSMENT MODAL                           */}
      {/* ========================================================================= */}
      <Modal
        visible={showAssessmentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssessmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>ফ্রি প্রোফাইল মূল্যায়ন (AI Assessment)</Text>
                <Text style={styles.modalSubHeader}>
                  আপনার ব্যাকগ্রাউন্ড অনুযায়ী ভিসা যোগ্যতা যাচাই করুন
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAssessmentModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>কাঙ্ক্ষিত দেশ</Text>
              <TextInput
                style={styles.textInput}
                value={assessCountry}
                onChangeText={setAssessCountry}
                placeholder="যেমন: United Kingdom, Canada, Australia"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>সর্বশেষ শিক্ষাগত যোগ্যতা</Text>
              <View style={styles.selectOptionsRow}>
                {["HSC", "Bachelor", "Masters", "Diploma"].map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.selectOptionPill,
                      assessEducation === lvl && styles.selectOptionPillActive,
                    ]}
                    onPress={() => setAssessEducation(lvl)}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        assessEducation === lvl && styles.selectOptionTextActive,
                      ]}
                    >
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1, marginEnd: 8 }}>
                  <Text style={styles.inputLabel}>IELTS / ভাষা স্কোর</Text>
                  <TextInput
                    style={styles.textInput}
                    value={assessIelts}
                    onChangeText={setAssessIelts}
                    placeholder="যেমন: 6.5 বা No IELTS"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={{ flex: 1, marginStart: 8 }}>
                  <Text style={styles.inputLabel}>কাজের অভিজ্ঞতা (বছর)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={assessExp}
                    onChangeText={setAssessExp}
                    keyboardType="numeric"
                    placeholder="যেমন: 2"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>আনুমানিক বাজেট (BDT ৳)</Text>
              <TextInput
                style={styles.textInput}
                value={assessBudgetBdt}
                onChangeText={setAssessBudgetBdt}
                keyboardType="numeric"
                placeholder="যেমন: 1500000"
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity
                style={styles.calcActionBtn}
                onPress={handleRunAssessment}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[PRIMARY_BLUE, "#003FA0"]}
                  style={styles.calcGradient}
                >
                  <Ionicons name="calculator-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.calcActionBtnText}>সম্ভাবনা হিসাব করুন</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Assessment Result Box */}
              {assessmentResult && (
                <View style={styles.resultBox}>
                  <View style={styles.resultScoreHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultScoreLabel}>ভিসা পাওয়ার সম্ভাবনা</Text>
                      <Text style={styles.resultSummary}>
                        {assessmentResult.summary}
                      </Text>
                    </View>
                    <View style={styles.scoreCircle}>
                      <Text style={styles.scoreCircleNum}>
                        {assessmentResult.eligibility_score}%
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.resultSubHead}>সুপারিশকৃত দেশসমূহ:</Text>
                  <View style={styles.resultTagsWrap}>
                    {assessmentResult.recommended_countries.map((c, i) => (
                      <View key={`recom-${c}`} style={styles.recomPill}>
                        <Text style={styles.recomPillText}>✓ {c}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.resultSubHead}>পরবর্তী করণীয় পদক্ষেপ:</Text>
                  {assessmentResult.next_steps.map((step, i) => (
                    <Text key={`step-${i}-${step.slice(0, 15)}`} style={styles.stepItem}>
                      • {step}
                    </Text>
                  ))}
                </View>
              )}

              <View style={{ height: 25 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: ADD CUSTOM CHECKLIST DOCUMENT MODAL                              */}
      {/* ========================================================================= */}
      <Modal
        visible={showCustomDocModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomDocModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>নতুন ডকুমেন্ট যোগ করুন</Text>
                <Text style={styles.modalSubHeader}>
                  আপনার বিশ্ববিদ্যালয়ের বিশেষ কোনো সার্টিফিকেট বা রিকোয়ারমেন্ট
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCustomDocModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>ডকুমেন্টের নাম *</Text>
            <TextInput
              style={styles.textInput}
              value={customDocTitle}
              onChangeText={setCustomDocTitle}
              placeholder="যেমন: APS সার্টিফিকেট বা WES ইভ্যালুয়েশন"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>ক্যাটাগরি</Text>
            <View style={styles.customCatRow}>
              {(["Academic", "Financial", "Legal & ID", "Custom"] as ChecklistItem["category"][]).map(
                (c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.customCatPill,
                      customDocCategory === c && styles.customCatPillActive,
                    ]}
                    onPress={() => setCustomDocCategory(c)}
                  >
                    <Text
                      style={[
                        styles.customCatPillText,
                        customDocCategory === c && styles.customCatPillTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <TouchableOpacity
              style={styles.addCustomSubmitBtn}
              onPress={handleAddCustomDoc}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[PRIMARY_BLUE, "#003FA0"]}
                style={styles.calcGradient}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.calcActionBtnText}>চেকলিস্টে যুক্ত করুন</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  headerAssessPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  headerAssessPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FBBF24",
  },
  goalTabsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  goalTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  goalTabActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  goalTabText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#94A3B8",
  },
  goalTabTextActive: {
    color: "#FFFFFF",
  },
  portalTabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 3,
    marginTop: 8,
  },
  portalTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderRadius: 9,
  },
  portalTabBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  portalTabBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  portalTabBtnTextActive: {
    color: PRIMARY_BLUE,
    fontWeight: "700",
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: NAVY_DARK,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  destinationCountBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  destinationCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_BLUE,
  },

  /* Destination Cards */
  destinationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.05)" } : {}),
  },
  destCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  destFlagEmoji: {
    fontSize: 32,
  },
  destTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  destName: {
    fontSize: 16,
    fontWeight: "700",
    color: NAVY_DARK,
  },
  successRateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  successRateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  destBengaliName: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  metricItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  metricVal: {
    fontSize: 12,
    fontWeight: "700",
    color: NAVY_DARK,
  },
  langTestsBox: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  langTestsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  langTestsTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0369A1",
  },
  langTestPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  langPillTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284C7",
    marginEnd: 4,
  },
  langPillScore: {
    fontSize: 10,
    color: "#334155",
  },
  langNoteText: {
    fontSize: 10.5,
    color: "#0369A1",
    marginTop: 6,
  },
  intakeTuitionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  subItemLabel: {
    fontSize: 10.5,
    color: "#64748B",
  },
  subItemVal: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
    marginTop: 1,
  },
  subItemValAccent: {
    fontSize: 11.5,
    fontWeight: "700",
    color: EMERALD_GREEN,
    marginTop: 1,
  },
  destActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  destDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  destDetailBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  destChecklistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  destChecklistBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#0369A1",
  },
  destBookBtn: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  destBookGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  destBookBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Document Checklist Generator */
  checklistSummaryCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 3px 6px rgba(15, 23, 42, 0.1)" } : {}),
  },
  checklistSummaryGradient: {
    padding: 16,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summarySubtitle: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 2,
    lineHeight: 16,
  },
  progressCircleBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#34D399",
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#34D399",
  },
  progressLabelSmall: {
    fontSize: 9,
    color: "#E2E8F0",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    marginTop: 14,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#34D399",
  },
  summaryStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  summaryStatsText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#E2E8F0",
  },
  addCustomDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addCustomDocBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  shareChecklistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  shareChecklistBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#93C5FD",
  },
  categoryFiltersScroll: {
    gap: 6,
    marginBottom: 12,
  },
  catFilterPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  catFilterPillActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  catFilterPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  catFilterPillTextActive: {
    color: "#FFFFFF",
  },
  checklistItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  checklistItemCardChecked: {
    borderColor: "#A7F3D0",
    backgroundColor: "#F0FDF4",
  },
  checkItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxBtnChecked: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemBengaliTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: NAVY_DARK,
    flex: 1,
    marginEnd: 6,
  },
  itemBengaliTitleChecked: {
    color: "#065F46",
    textDecorationLine: "none",
  },
  mandatoryBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mandatoryBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#B91C1C",
  },
  optionalBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalBadgeText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
  },
  itemCategoryText: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 2,
  },
  expandIconBtn: {
    padding: 4,
  },
  itemExpandedBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  itemDescText: {
    fontSize: 11.5,
    color: "#334155",
    lineHeight: 16,
  },
  howToObtainWrap: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  howToHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  howToTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369A1",
  },
  howToBodyText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 15,
  },
  checklistBottomActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  checklistResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  checklistResetBtnText: {
    fontSize: 11.5,
    color: "#EF4444",
    fontWeight: "600",
  },
  checklistCheckAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  checklistCheckAllBtnText: {
    fontSize: 11.5,
    color: "#059669",
    fontWeight: "700",
  },

  /* Agency Directory & Ratings */
  govTag: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: NAVY_DARK,
  },
  agencyCountryScroll: {
    gap: 6,
    marginBottom: 12,
  },
  agencyCountryPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  agencyCountryPillActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  agencyCountryPillText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  agencyCountryPillTextActive: {
    color: "#FFFFFF",
  },
  agencyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.05)" } : {}),
  },
  agencyCardHeader: {
    flexDirection: "row",
  },
  agencyLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  agencyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  agencyName: {
    fontSize: 15,
    fontWeight: "700",
    color: NAVY_DARK,
    flex: 1,
  },
  licenseText: {
    fontSize: 11,
    color: "#0284C7",
    fontWeight: "600",
    marginTop: 2,
  },
  statsPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  successPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  successText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingVal: {
    fontSize: 11.5,
    fontWeight: "700",
    color: NAVY_DARK,
  },
  reviewsCount: {
    fontSize: 10.5,
    color: "#64748B",
  },
  agencyDesc: {
    fontSize: 12,
    color: "#475569",
    marginTop: 8,
    lineHeight: 17,
  },
  destListWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  destLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  destPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  destPillText: {
    fontSize: 10.5,
    color: "#334155",
  },
  serviceTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  serviceTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serviceTagText: {
    fontSize: 10.5,
    color: PRIMARY_BLUE,
    fontWeight: "600",
  },
  officeAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  officeAddressText: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
  },
  agencyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  feeLabel: {
    fontSize: 10.5,
    color: "#64748B",
  },
  feeVal: {
    fontSize: 14,
    fontWeight: "800",
    color: EMERALD_GREEN,
  },
  bookConsultBtn: {
    borderRadius: 8,
    overflow: "hidden",
  },
  bookConsultGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bookConsultBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Testimonials */
  testimonialsSection: {
    marginTop: 16,
  },
  testimonialCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  testHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  testAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  testNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  testStudentName: {
    fontSize: 14,
    fontWeight: "700",
    color: NAVY_DARK,
  },
  testFlag: {
    fontSize: 18,
  },
  testInstitution: {
    fontSize: 11.5,
    fontWeight: "600",
    color: PRIMARY_BLUE,
  },
  testProgram: {
    fontSize: 11,
    color: "#64748B",
  },
  testQuote: {
    fontSize: 12,
    color: "#334155",
    fontStyle: "italic",
    lineHeight: 18,
    marginTop: 8,
  },
  testFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  testStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  testAgencyNameTag: {
    fontSize: 10.5,
    color: "#64748B",
    marginStart: 6,
  },
  testMonthYear: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
  },

  /* Appointment Booking Wizard */
  wizardContainer: {
    marginBottom: 20,
  },
  wizardHeaderCard: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
  },
  wizardHeaderGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  wizardHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  wizardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  wizardHeaderSubtitle: {
    fontSize: 11,
    color: "#E0E7FF",
    marginTop: 2,
  },
  wizardStepLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: NAVY_DARK,
    marginTop: 10,
    marginBottom: 8,
  },
  agencySelectorScroll: {
    gap: 8,
    paddingBottom: 6,
  },
  agencySelectCard: {
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  agencySelectCardActive: {
    borderColor: PRIMARY_BLUE,
    backgroundColor: "#EFF6FF",
  },
  agencySelectLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 6,
  },
  agencySelectName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: NAVY_DARK,
    textAlign: "center",
  },
  agencySelectNameActive: {
    color: PRIMARY_BLUE,
  },
  agencySelectLicense: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 2,
  },
  agencySelectRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  agencySelectRatingText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  countryPickerScroll: {
    gap: 6,
    paddingBottom: 4,
  },
  countryPickPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  countryPickPillActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  countryPickPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  countryPickPillTextActive: {
    color: "#FFFFFF",
  },
  consultModeRow: {
    flexDirection: "row",
    gap: 10,
  },
  consultModeCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  consultModeCardActive: {
    borderColor: PRIMARY_BLUE,
    backgroundColor: "#EFF6FF",
  },
  modeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  modeIconCircleActive: {
    backgroundColor: PRIMARY_BLUE,
  },
  modeCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: NAVY_DARK,
  },
  modeCardTitleActive: {
    color: PRIMARY_BLUE,
  },
  modeCardSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 14,
  },
  datePickerScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  dateChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 64,
  },
  dateChipActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  dateChipDay: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  dateChipDayActive: {
    color: "#E0E7FF",
  },
  dateChipDate: {
    fontSize: 12,
    fontWeight: "700",
    color: NAVY_DARK,
    marginTop: 2,
  },
  dateChipDateActive: {
    color: "#FFFFFF",
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeSlotPillActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  timeSlotPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
  },
  timeSlotPillTextActive: {
    color: "#FFFFFF",
  },
  candidateFormCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: NAVY_DARK,
  },
  submitWizardBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.15)" } : {}),
  },
  submitWizardGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  submitWizardBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  guaranteeNoteBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  guaranteeNoteText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
  },

  /* My Bookings Tab */
  refreshIconBtn: {
    padding: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  emptyBookingsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
  },
  emptyBookingsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: NAVY_DARK,
    marginTop: 12,
  },
  emptyBookingsSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  emptyActionBtn: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  myBookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  myBookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bookingStatusText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  bookingRefText: {
    fontSize: 10.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
  myBookingAgencyName: {
    fontSize: 15,
    fontWeight: "700",
    color: NAVY_DARK,
    marginTop: 6,
  },
  myBookingDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  bookingDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: "47%",
  },
  bookingDetailVal: {
    fontSize: 11.5,
    color: "#334155",
    fontWeight: "600",
  },
  myBookingCandidateRow: {
    marginTop: 8,
  },
  bookingCandidateText: {
    fontSize: 11,
    color: "#64748B",
  },
  calendarExportActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  exportGoogleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingVertical: 7,
    borderRadius: 6,
  },
  exportGoogleBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: NAVY_DARK,
  },
  exportIcsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#E0F2FE",
    paddingVertical: 7,
    borderRadius: 6,
  },
  exportIcsBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#0284C7",
  },

  /* Confirmation Modal */
  confirmModalHeader: {
    alignItems: "center",
    paddingVertical: 10,
  },
  confirmSuccessCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  confirmModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: NAVY_DARK,
    textAlign: "center",
  },
  confirmModalSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 3,
  },
  ticketCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginVertical: 12,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ticketAgencyName: {
    fontSize: 14,
    fontWeight: "700",
    color: NAVY_DARK,
  },
  ticketRefNum: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  verifiedTicketBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTicketBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  ticketDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  ticketGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  ticketGridItem: {
    width: "50%",
  },
  ticketFieldLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  ticketFieldVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 1,
  },
  ticketFooterNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  ticketFooterNoteText: {
    fontSize: 11,
    color: "#1E40AF",
    flex: 1,
  },
  exportSectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: NAVY_DARK,
    marginTop: 6,
    marginBottom: 8,
  },
  googleCalActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EA4335",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  googleCalActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  icsCalActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  icsCalActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
  },
  dismissConfirmBtn: {
    backgroundColor: NAVY_DARK,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  dismissConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Modals General */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContentLarge: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: NAVY_DARK,
  },
  modalSubHeader: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
  },
  destModalSubTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: NAVY_DARK,
    marginTop: 10,
    marginBottom: 6,
  },
  destHighlightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  destHighlightText: {
    fontSize: 12,
    color: "#334155",
    flex: 1,
  },
  destModalStatRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 10,
  },
  destModalStatBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  destModalStatLabel: {
    fontSize: 10.5,
    color: "#64748B",
  },
  destModalStatVal: {
    fontSize: 13,
    fontWeight: "700",
    color: NAVY_DARK,
    marginTop: 2,
  },
  destModalStatValGreen: {
    fontSize: 14,
    fontWeight: "800",
    color: EMERALD_GREEN,
    marginTop: 2,
  },
  langScoresTable: {
    backgroundColor: "#F0F9FF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  scoreTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  scoreTableLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0369A1",
  },
  scoreTableVal: {
    fontSize: 11.5,
    color: "#334155",
  },
  destTipCallout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  destTipCalloutText: {
    fontSize: 11.5,
    color: "#1E40AF",
    flex: 1,
    lineHeight: 16,
  },
  destModalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalChecklistTriggerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalChecklistTriggerText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0369A1",
  },
  modalBookTriggerBtn: {
    flex: 1.2,
    borderRadius: 10,
    overflow: "hidden",
  },
  modalBookGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  modalBookTriggerText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Assessment Modal specific */
  selectOptionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  selectOptionPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  selectOptionPillActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  selectOptionText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  selectOptionTextActive: {
    color: "#FFFFFF",
  },
  rowTwoCols: {
    flexDirection: "row",
    alignItems: "center",
  },
  calcActionBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 14,
  },
  calcGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  calcActionBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resultBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  resultScoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  resultScoreLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  resultSummary: {
    fontSize: 11.5,
    color: "#15803D",
    marginTop: 2,
    lineHeight: 16,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginStart: 10,
  },
  scoreCircleNum: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  resultSubHead: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#166534",
    marginTop: 8,
    marginBottom: 4,
  },
  resultTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  recomPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recomPillText: {
    fontSize: 10.5,
    color: "#15803D",
    fontWeight: "600",
  },
  stepItem: {
    fontSize: 11.5,
    color: "#334155",
    marginTop: 2,
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
  },
  customCatRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 10,
  },
  customCatPill: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  customCatPillActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  customCatPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  customCatPillTextActive: {
    color: "#FFFFFF",
  },
  addCustomSubmitBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
});
