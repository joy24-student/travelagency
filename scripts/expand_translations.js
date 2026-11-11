const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '..', 'src', 'locales', 'en', 'translation.json');
const bnPath = path.join(__dirname, '..', 'src', 'locales', 'bn', 'translation.json');
const arPath = path.join(__dirname, '..', 'src', 'locales', 'ar', 'translation.json');
const hiPath = path.join(__dirname, '..', 'src', 'locales', 'hi', 'translation.json');

const currentEn = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const currentBn = JSON.parse(fs.readFileSync(bnPath, 'utf8'));
const currentAr = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const currentHi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));

// Comprehensive dictionary expansion
const newTranslations = {
  // Navigation & Shell
  "nav.home": { en: "Home", bn: "হোম", ar: "الرئيسية", hi: "होम" },
  "nav.messages": { en: "Messages", bn: "মেসেজ", ar: "الرسائل", hi: "संदेश" },
  "nav.community": { en: "Community", bn: "কমিউনিটি", ar: "المجتمع", hi: "समुदाय" },
  "nav.trips": { en: "My Trips", bn: "আমার ট্রিপস", ar: "رحلاتي", hi: "मेरी यात्राएं" },
  "nav.account": { en: "Sign In", bn: "সাইন ইন", ar: "تسجيل الدخول", hi: "साइन इन" },
  "nav.askAi": { en: "Ask AI or hold to speak", bn: "AI কে জিজ্ঞেস করুন বা বলুন", ar: "اسأل الذكاء الاصطناعي أو اضغط للتحدث", hi: "AI से पूछें या बोलने के लिए दबाएं" },
  "nav.backToTop": { en: "Back to top", bn: "উপরে যান", ar: "العودة إلى الأعلى", hi: "शीर्ष पर वापस जाएं" },

  // Home & Services Grid
  "exploreServices": { en: "Explore Services", bn: "সার্ভিসসমূহ এক্সপ্লোর করুন", ar: "استكشف الخدمات", hi: "सेवाएं खोजें" },
  "allInOnePlatform": { en: "All-in-one travel platform", bn: "অল-ইন-ওয়ান ভ্রমণ প্ল্যাটফর্ম", ar: "منصة سفر شاملة", hi: "ऑल-इन-वन यात्रा मंच" },
  "flights": { en: "Flights", bn: "ফ্লাইট", ar: "رحلات طيران", hi: "उड़ानें" },
  "bestFares": { en: "Best Fares", bn: "সেরা ভাড়া", ar: "أفضل الأسعار", hi: "सर्वोत्तम किराया" },
  "hotels": { en: "Hotels", bn: "হোটেল", ar: "فنادق", hi: "होटल" },
  "hotelsAndVillas": { en: "Hotels & Villas", bn: "হোটেল ও ভিলা", ar: "فنادق وفلل", hi: "होटल और विला" },
  "trains": { en: "Trains", bn: "ট্রেন", ar: "قطارات", hi: "ट्रेनें" },
  "expressSeats": { en: "Express Seats", bn: "এক্সপ্রেস টিকিট", ar: "مقاعد سريعة", hi: "एक्सप्रेस सीटें" },
  "busLaunch": { en: "Bus/Launch", bn: "বাস/লঞ্চ", ar: "حافلة/إطلاق", hi: "बस/लॉन्च" },
  "acSleeper": { en: "AC & Sleeper", bn: "এসি ও স্লিপার", ar: "مكيف ونائم", hi: "एसी और स्लीपर" },
  "tourGuides": { en: "Tour Guides", bn: "ট্যুর গাইড", ar: "مرشدون سياحيون", hi: "टूर गाइड" },
  "certifiedLocals": { en: "Certified Locals", bn: "যাচাইকৃত স্থানীয় গাইড", ar: "محليون معتمدون", hi: "प्रमाणित स्थानीय" },
  "abroadAgency": { en: "Abroad Agency", bn: "বিদেশি এজেন্সি", ar: "وكالة سفر بالخارج", hi: "विदेश एजेंसी" },
  "visaHajjUmrah": { en: "Visa & Hajj/Umrah", bn: "ভিসা ও হজ/ওমরাহ", ar: "تأشيرات وحج/عمرة", hi: "वीज़ा और हज/उमरा" },
  "whereToNext": { en: "Where to next?", bn: "কোথায় যেতে চান?", ar: "إلى أين بعد ذلك؟", hi: "आगे कहाँ जाना है?" },
  "trendingDestinations": { en: "Trending Destinations", bn: "জনপ্রিয় গন্তব্যসমূহ", ar: "وجهات شائعة", hi: "ट्रेंडिंग गंतव्य" },
  "exclusiveDeals": { en: "Exclusive Deals", bn: "বিশেষ অফার", ar: "عروض حصرية", hi: "विशेष सौदे" },
  "featuredHotels": { en: "Featured Stays & Hotels", bn: "নির্বাচিত হোটেল ও রিসোর্ট", ar: "إقامات وفنادق مميزة", hi: "विशेष होटल और रिसॉर्ट" },
  "recentPosts": { en: "Travel Community Feed", bn: "ভ্রমণ কমিউনিটি পোস্ট", ar: "مشاركات المجتمع", hi: "ट्रैवल कम्युनिटी फ़ीड" },
  "topChoice": { en: "Top Choice", bn: "সেরা পছন্দ", ar: "الخيار الأفضل", hi: "शीर्ष पसंद" },
  "perNight": { en: "/ night", bn: "/ রাত", ar: "/ ليلة", hi: "/ रात" },

  // Booking & Flight/Hotel Details
  "bookNow": { en: "Book Now", bn: "এখনই বুক করুন", ar: "احجز الآن", hi: "अभी बुक करें" },
  "selectRoom": { en: "Select Room", bn: "রুম নির্বাচন করুন", ar: "اختر الغرفة", hi: "कमरा चुनें" },
  "selectSeat": { en: "Select Seat", bn: "আসন নির্বাচন করুন", ar: "اختر المقعد", hi: "सीट चुनें" },
  "departure": { en: "Departure", bn: "যাত্রা", ar: "المغادرة", hi: "प्रस्थान" },
  "arrival": { en: "Arrival", bn: "পৌঁছানো", ar: "الوصول", hi: "आगमन" },
  "roundTrip": { en: "Round Trip", bn: "রাউন্ড ট্রিপ", ar: "ذهاب وعودة", hi: "आना-जाना" },
  "oneWay": { en: "One Way", bn: "একমুখী", ar: "اتجاه واحد", hi: "एक तरफ" },
  "multiCity": { en: "Multi-City", bn: "মাল্টি-সিটি", ar: "مدن متعددة", hi: "मल्टी-सिटी" },
  "passengers": { en: "Passengers", bn: "যাত্রী", ar: "الركاب", hi: "यात्री" },
  "adults": { en: "Adults", bn: "প্রাপ্তবয়স্ক", ar: "بالغون", hi: "वयस्क" },
  "children": { en: "Children", bn: "শিশু", ar: "أطفال", hi: "बच्चे" },
  "infants": { en: "Infants", bn: "নবজাতক", ar: "رضع", hi: "शिशु" },
  "cabinClass": { en: "Cabin Class", bn: "কেবিন ক্লাস", ar: "درجة السفر", hi: "केबिन क्लास" },
  "economy": { en: "Economy", bn: "ইকোনমি", ar: "اقتصادية", hi: "इकोनॉमी" },
  "premiumEconomy": { en: "Premium Economy", bn: "প্রিমিয়াম ইকোনমি", ar: "اقتصادية متميزة", hi: "प्रीमियम इकोनॉमी" },
  "business": { en: "Business", bn: "বিজনেস", ar: "رجال الأعمال", hi: "बिजनेस" },
  "firstClass": { en: "First Class", bn: "ফার্স্ট ক্লাস", ar: "الدرجة الأولى", hi: "फर्स्ट क्लास" },
  "checkIn": { en: "Check-in", bn: "চেক-ইন", ar: "تسجيل الوصول", hi: "चेक-इन" },
  "checkOut": { en: "Check-out", bn: "চেক-আউট", ar: "تسجيل المغادرة", hi: "चेक-आउट" },
  "rooms": { en: "Rooms", bn: "রুম", ar: "الغرف", hi: "कमरे" },
  "guests": { en: "Guests", bn: "অতিথি", ar: "الضيوف", hi: "अतिथि" },
  "totalAmount": { en: "Total Amount", bn: "মোট পরিমাণ", ar: "المبلغ الإجمالي", hi: "कुल राशि" },
  "payNow": { en: "Pay Now", bn: "এখনই পরিশোধ করুন", ar: "ادفع الآن", hi: "अभी भुगतान करें" },
  "proceedToPayment": { en: "Proceed to Payment", bn: "পেমেন্টে এগিয়ে যান", ar: "المتابعة للدفع", hi: "भुगतान के लिए आगे बढ़ें" },
  "confirmBooking": { en: "Confirm Booking", bn: "বুকিং নিশ্চিত করুন", ar: "تأكيد الحجز", hi: "बुकिंग की पुष्टि करें" },
  "bookingSuccessful": { en: "Booking Successful", bn: "বুকিং সফল হয়েছে", ar: "تم الحجز بنجاح", hi: "बुकिंग सफल रही" },
  "viewVoucher": { en: "View Voucher", bn: "ভাউচার দেখুন", ar: "عرض القسيمة", hi: "वाउचर देखें" },
  "downloadVoucher": { en: "Download Voucher", bn: "ভাউচার ডাউনলোড", ar: "تحميل القسيمة", hi: "वाउचर डाउनलोड करें" },
  "freeCancellation": { en: "Free Cancellation", bn: "ফ্রি বাতিলকরণ", ar: "إلغاء مجاني", hi: "मुफ़्त रद्दीकरण" },
  "breakfastIncluded": { en: "Breakfast Included", bn: "নাস্তা অন্তর্ভুক্ত", ar: "شامل الإفطار", hi: "नाश्ता शामिल है" },
  "amenities": { en: "Amenities", bn: "সুযোগ-সুবিধা", ar: "المرافق", hi: "सुविधाएं" },
  "searchFlights": { en: "Search Flights", bn: "ফ্লাইট খুঁজুন", ar: "بحث عن رحلات", hi: "उड़ानें खोजें" },
  "searchHotels": { en: "Search Hotels", bn: "হোটেল খুঁজুন", ar: "بحث عن فنادق", hi: "होटल खोजें" },
  "searchTrains": { en: "Search Trains", bn: "ট্রেন খুঁজুন", ar: "بحث عن قطارات", hi: "ट्रेन खोजें" },

  // Common UI actions
  "viewAll": { en: "View All", bn: "সব দেখুন", ar: "عرض الكل", hi: "सभी देखें" },
  "viewDetails": { en: "View Details", bn: "বিস্তারিত দেখুন", ar: "عرض التفاصيل", hi: "विवरण देखें" },
  "sortBy": { en: "Sort By", bn: "সাজান", ar: "ترتيب حسب", hi: "इसके अनुसार क्रमबद्ध करें" },
  "priceLowToHigh": { en: "Price: Low to High", bn: "দাম: কম থেকে বেশি", ar: "السعر: من الأقل للأعلى", hi: "कीमत: कम से ज्यादा" },
  "priceHighToLow": { en: "Price: High to Low", bn: "দাম: বেশি থেকে কম", ar: "السعر: من الأعلى للأقل", hi: "कीमत: ज्यादा से कम" },
  "ratingHighToLow": { en: "Rating: High to Low", bn: "রেটিং: বেশি থেকে কম", ar: "التقييم: من الأعلى للأقل", hi: "रेटिंग: उच्च से निम्न" },
  "popular": { en: "Most Popular", bn: "সর্বাধিক জনপ্রিয়", ar: "الأكثر شعبية", hi: "सर्वाधिक लोकप्रिय" },
  "all": { en: "All", bn: "সকল", ar: "الكل", hi: "सभी" },
  "done": { en: "Done", bn: "সম্পন্ন", ar: "تم", hi: "हो गया" },
  "clearAll": { en: "Clear All", bn: "সব মুছুন", ar: "مسح الكل", hi: "सभी साफ़ करें" },
  "submit": { en: "Submit", bn: "জমা দিন", ar: "إرسাল", hi: "जमा करें" },
  "cancel": { en: "Cancel", bn: "বাতিল", ar: "إلغاء", hi: "रद्द करें" },
  "confirm": { en: "Confirm", bn: "নিশ্চিত করুন", ar: "تأكيد", hi: "पुष्टि करें" },
  "save": { en: "Save", bn: "সংরক্ষণ", ar: "حفظ", hi: "सहेजें" },

  // Auth UI
  "signInToAccount": { en: "Sign in to your account", bn: "আপনার অ্যাকাউন্টে লগইন করুন", ar: "تسجيل الدخول إلى حسابك", hi: "अपने खाते में साइन इन करें" },
  "dontHaveAccount": { en: "Don't have an account?", bn: "অ্যাকাউন্ট নেই?", ar: "ليس لديك حساب؟", hi: "खाता नहीं है?" },
  "alreadyHaveAccount": { en: "Already have an account?", bn: "ইতিমধ্যে অ্যাকাউন্ট আছে?", ar: "هل لديك حساب بالفعل؟", hi: "क्या आपके पास पहले से एक खाता मौजूद है?" },
  "signUpNow": { en: "Sign Up", bn: "সাইন আপ করুন", ar: "إنشاء حساب", hi: "साइन अप करें" },
  "continueWithGoogle": { en: "Continue with Google", bn: "গুগল দিয়ে চালিয়ে যান", ar: "المتابعة باستخدام جوجل", hi: "Google के साथ जारी रखें" },
  "orContinueWith": { en: "Or continue with", bn: "অথবা", ar: "أو المتابعة مع", hi: "या जारी रखें" },
  "enterOtpSent": { en: "Enter the code sent to your device", bn: "আপনার ফোনে পাঠানো কোডটি লিখুন", ar: "أدخل الرمز المرسل إلى هاتفك", hi: "अपने फोन पर भेजा गया कोड दर्ज करें" },
  "resendCode": { en: "Resend Code", bn: "কোড পুনরায় পাঠান", ar: "إعادة إرسال الرمز", hi: "कोड फिर से भेजें" },
  "verify": { en: "Verify", bn: "যাচাই করুন", ar: "تحقق", hi: "सत्यापित करें" },
  "forgotPasswordTitle": { en: "Reset your password", bn: "পাসওয়ার্ড রিসেট করুন", ar: "إعادة تعيين كلمة المرور", hi: "अपना पासवर्ड रीसेट करें" },
  "forgotPasswordInstruction": { en: "Enter your registered email and we'll send you an OTP.", bn: "আপনার নিবন্ধিত ইমেইল লিখুন এবং আমরা একটি ওটিপি পাঠাবো।", ar: "أدخل بريدك الإلكتروني المسجل وسنرسل لك رمز OTP.", hi: "अपना पंजीकृत ईमेल दर्ज करें और हम आपको एक ओटीपी भेजेंगे।" },

  // Placeholders (direct exact phrases)
  "Search destinations...": { en: "Search destinations...", bn: "গন্তব্য অনুসন্ধান করুন...", ar: "البحث عن الوجهات...", hi: "गंतव्य खोजें..." },
  "Search flights, hotels, trains...": { en: "Search flights, hotels, trains...", bn: "ফ্লাইট, হোটেল, ট্রেন খুঁজুন...", ar: "البحث عن الرحلات، الفنادق، القطارات...", hi: "उड़ानें, होटल, ट्रेन खोजें..." },
  "Search here...": { en: "Search here...", bn: "এখানে খুঁজুন...", ar: "ابحث هنا...", hi: "यहाँ खोजें..." },
  "Search...": { en: "Search...", bn: "অনুসন্ধান...", ar: "بحث...", hi: "खोजें..." },
  "Where to?": { en: "Where to?", bn: "কোথায় যেতে চান?", ar: "إلى أين؟", hi: "कहाँ जाना है?" },
  "Enter your email": { en: "Enter your email", bn: "আপনার ইমেইল লিখুন", ar: "أدخل بريدك الإلكتروني", hi: "अपना ईमेल दर्ज करें" },
  "Enter email": { en: "Enter email", bn: "ইমেইল লিখুন", ar: "أدخل البريد", hi: "ईमेल दर्ज करें" },
  "Enter your password": { en: "Enter your password", bn: "আপনার পাসওয়ার্ড দিন", ar: "أدخل كلمة المرور", hi: "अपना पासवर्ड दर्ज करें" },
  "Enter password": { en: "Enter password", bn: "পাসওয়ার্ড দিন", ar: "أدخل كلمة المرور", hi: "पासवर्ड दर्ज करें" },
  "Confirm password": { en: "Confirm password", bn: "পাসওয়ার্ড নিশ্চিত করুন", ar: "تأكيد كلمة المرور", hi: "पासवर्ड की पुष्टि करें" },
  "Enter first name": { en: "Enter first name", bn: "প্রথম নাম লিখুন", ar: "أدخل الاسم الأول", hi: "पहला नाम दर्ज करें" },
  "Enter last name": { en: "Enter last name", bn: "শেষ নাম লিখুন", ar: "أدخل اسم العائلة", hi: "अंतिम नाम दर्ज करें" },
  "Enter phone number": { en: "Enter phone number", bn: "ফোন নম্বর দিন", ar: "أدخل رقم الهاتف", hi: "फ़ोन नंबर दर्ज करें" },
  "Phone number": { en: "Phone number", bn: "ফোন নম্বর", ar: "رقم الهاتف", hi: "फ़ोन नंबर" },
  "Departure date": { en: "Departure date", bn: "যাত্রার তারিখ", ar: "تاريخ المغادرة", hi: "प्रस्थान की तारीख" },
  "Return date": { en: "Return date", bn: "ফেরার তারিখ", ar: "تاريخ العودة", hi: "वापसी की तारीख" },
  "Select dates": { en: "Select dates", bn: "তারিখ নির্বাচন করুন", ar: "اختر التواريخ", hi: "तारीखें चुनें" },
  "From (City or Airport)": { en: "From (City or Airport)", bn: "কোথা থেকে (শহর বা বিমানবন্দর)", ar: "من (مدينة أو مطار)", hi: "से (शहर या हवाई अड्डा)" },
  "To (City or Airport)": { en: "To (City or Airport)", bn: "কোথায় (শহর বা বিমানবন্দর)", ar: "إلى (مدينة أو مطار)", hi: "तक (शहर या हवाई अड्डा)" },
  "Guests & Rooms": { en: "Guests & Rooms", bn: "অতিথি ও রুম", ar: "الضيوف والغرف", hi: "अतिथि और कमरे" },

  // Validation Error Messages (direct exact phrases)
  "Email is required": { en: "Email is required", bn: "ইমেইল আবশ্যক", ar: "البريد الإلكتروني مطلوب", hi: "ईमेल आवश्यक है" },
  "Enter a valid email address": { en: "Enter a valid email address", bn: "সঠিক ইমেইল ঠিকানা দিন", ar: "أدخل عنوان بريد إلكتروني صالح", hi: "एक मान्य ईमेल पता दर्ज करें" },
  "Password must be at least 8 characters": { en: "Password must be at least 8 characters", bn: "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে", ar: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل", hi: "पासवर्ड कम से कम 8 वर्णों का होना चाहिए" },
  "Password needs one uppercase letter": { en: "Password needs one uppercase letter", bn: "পাসওয়ার্ডে অন্তত একটি বড় হাতের অক্ষর থাকতে হবে", ar: "تحتاج كلمة المرور إلى حرف كبير واحد", hi: "पासवर्ड में एक बड़ा अक्षर होना चाहिए" },
  "Password needs one lowercase letter": { en: "Password needs one lowercase letter", bn: "পাসওয়ার্ডে অন্তত একটি ছোট হাতের অক্ষর থাকতে হবে", ar: "تحتاج كلمة المرور إلى حرف صغير واحد", hi: "पासवर्ड में एक छोटा अक्षर होना चाहिए" },
  "Password needs one number": { en: "Password needs one number", bn: "পাসওয়ার্ডে অন্তত একটি সংখ্যা থাকতে হবে", ar: "تحتاج كلمة المرور إلى رقم واحد", hi: "पासवर्ड में एक संख्या होनी चाहिए" },
  "Password is required": { en: "Password is required", bn: "পাসওয়ার্ড আবশ্যক", ar: "كلمة المرور مطلوبة", hi: "पासवर्ड आवश्यक है" },
  "First name is required": { en: "First name is required", bn: "প্রথম নাম আবশ্যক", ar: "الاسم الأول مطلوب", hi: "पहला नाम आवश्यक है" },
  "Last name is required": { en: "Last name is required", bn: "শেষ নাম আবশ্যক", ar: "اسم العائلة مطلوب", hi: "अंतिम नाम आवश्यक है" },
  "Confirm your password": { en: "Confirm your password", bn: "পাসওয়ার্ড নিশ্চিত করুন", ar: "تأكيد كلمة المرور الخاصة بك", hi: "अपना पासवर्ड की पुष्टि करें" },
  "Passwords do not match": { en: "Passwords do not match", bn: "পাসওয়ার্ড দুটি মিলছে না", ar: "كلمات المرور غير متطابقة", hi: "पासवर्ड मेल नहीं खाते" },
  "Email or phone is required": { en: "Email or phone is required", bn: "ইমেইল অথবা ফোন নম্বর আবশ্যক", ar: "البريد أو الهاتف مطلوب", hi: "ईमेल या फोन आवश्यक है" },
  "Enter the 6 digit code": { en: "Enter the 6 digit code", bn: "৬ সংখ্যার কোডটি দিন", ar: "أدخل الرمز المكون من 6 أرقام", hi: "6 अंकों का कोड दर्ज करें" },
  "Code is too long": { en: "Code is too long", bn: "কোডটি অতিরিক্ত দীর্ঘ", ar: "الرمز طويل جداً", hi: "कोड बहुत लंबा है" },
  "Confirm your new password": { en: "Confirm your new password", bn: "নতুন পাসওয়ার্ড নিশ্চিত করুন", ar: "تأكيد كلمة المرور الجديدة", hi: "अपने नए पासवर्ड की पुष्टि करें" },

  // Common Alert Texts (direct exact phrases)
  "Please fill in all required fields": { en: "Please fill in all required fields", bn: "অনুগ্রহ করে সকল প্রয়োজনীয় তথ্য পূরণ করুন।", ar: "يرجى ملء جميع الحقول المطلوبة.", hi: "कृपया सभी आवश्यक फ़ील्ड भरें।" },
  "Something went wrong. Please try again": { en: "Something went wrong. Please try again", bn: "কিছু ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", ar: "حدث خطأ ما. يرجى المحاولة مرة أخرى.", hi: "कुछ गलत हो गया। कृपया पुन: प्रयास करें।" },
  "Network error. Please check your connection.": { en: "Network error. Please check your connection.", bn: "নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।", ar: "خطأ في الشبكة. يرجى التحقق من اتصالك.", hi: "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।" },
  "Booking confirmed successfully": { en: "Booking confirmed successfully", bn: "বুকিং সফলভাবে নিশ্চিত হয়েছে", ar: "تم تأكيد الحجز بنجاح", hi: "बुकिंग की पुष्टि सफलतापूर्वक हुई" },
  "Payment completed successfully": { en: "Payment completed successfully", bn: "পেমেন্ট সফলভাবে সম্পন্ন হয়েছে", ar: "تم الدفع بنجاح", hi: "भुगतान सफलतापूर्वक पूरा हुआ" },
  "Are you sure you want to log out?": { en: "Are you sure you want to log out?", bn: "আপনি কি নিশ্চিত লগ আউট করতে চান?", ar: "هل أنت متأكد من تسجيل الخروج؟", hi: "क्या आप वाकई लॉग आउट करना चाहते हैं?" },
  "Are you sure you want to delete this?": { en: "Are you sure you want to delete this?", bn: "আপনি কি নিশ্চিত এটি মুছে ফেলতে চান?", ar: "هل أنت متأكد من الحذف؟", hi: "क्या आप वाकई इसे हटाना चाहते हैं?" },
};

// Merge into each language
for (const [key, trans] of Object.entries(newTranslations)) {
  currentEn[key] = trans.en;
  currentBn[key] = trans.bn;
  currentAr[key] = trans.ar;
  currentHi[key] = trans.hi;
}

fs.writeFileSync(enPath, JSON.stringify(currentEn, null, 2), 'utf8');
fs.writeFileSync(bnPath, JSON.stringify(currentBn, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(currentAr, null, 2), 'utf8');
fs.writeFileSync(hiPath, JSON.stringify(currentHi, null, 2), 'utf8');

console.log('Successfully expanded translations. Total keys:', Object.keys(currentEn).length);
