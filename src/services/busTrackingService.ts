/**
 * busTrackingService.ts
 *
 * Real-time bus tracking service along Bangladesh National Highways (N1, N2, N5),
 * procedural highway GPS snapping, authentic bus operators (Green Line, Hanif, Shyamoli, Saintmartin),
 * toll plazas, highway rest stops, and crowdsourced onboard GPS sync.
 */

export interface HighwayStop {
  id: string;
  name: string;
  nameBn: string;
  type: "boarding" | "rest_stop" | "toll_plaza" | "dropping";
  lat: number;
  lng: number;
  scheduledTime: string;
  delayMinutes: number;
  distanceKm: number;
  passed: boolean;
  amenities?: string[];
}

export interface BusProfile {
  id: string;
  busNumber: string; // e.g. "ঢাকা মেট্রো-ব ১৫-৪২০১"
  serviceName: string;
  serviceNameBn: string;
  operatorName: string;
  operatorNameBn: string;
  busType: string;
  origin: string;
  originBn: string;
  destination: string;
  destinationBn: string;
  departureTime: string;
  arrivalTime: string;
  totalDistanceKm: number;
  status: "running" | "scheduled" | "resting" | "delayed";
  speedKmh: number;
  delayMinutes: number;
  confidenceScore: number;
  passengersVerified: number;
  dataSource: "crowdsourced" | "gps_device" | "estimated";
  trafficStatus: "clear" | "moderate" | "heavy";
  currentHighway: string; // e.g. "N1 ঢাকা-চট্টগ্রাম এক্সপ্রেসওয়ে"
  nextStop: HighwayStop;
  stops: HighwayStop[];
  highwayGeometry: [number, number][]; // [longitude, latitude]
}

export interface LiveBusPosition {
  busNumber: string;
  latitude: number;
  longitude: number;
  bearing: number;
  speedKmh: number;
  distanceAlongKm: number;
  progressPct: number;
  nextStop: HighwayStop;
  etaMinutesToNextStop: number;
  delayMinutes: number;
  trafficStatus: "clear" | "moderate" | "heavy";
}

export interface BusPassengerChat {
  id: string;
  senderName: string;
  seatNumber?: string;
  message: string;
  timestamp: string;
  isVerifiedPassenger?: boolean;
}

// ============================================================================
// Authentic Bangladesh National Highway Geometries (N1, N2, N5)
// ============================================================================

// N1 Dhaka to Cox's Bazar National Highway (via Hanif Flyover, Meghna Bridge, Daudkandi, Comilla, Feni, Chittagong, Dohazari, Chakaria, Cox's Bazar)
export const N1_DHAKA_COXS_BAZAR_HIGHWAY: [number, number][] = [
  [90.4265, 23.7185], // Sayedabad / Arambagh Bus Terminal
  [90.4612, 23.7051], // Hanif Flyover Exit / Jatrabari
  [90.5284, 23.6892], // Kanchpur Bridge (N1/N2 Junction)
  [90.6125, 23.6084], // Meghna Bridge Toll Plaza
  [90.7245, 23.5381], // Daudkandi Meghna-Gomti Bridge
  [90.8942, 23.4912], // Chandina Highway
  [91.1245, 23.4684], // Comilla Paduar Bazar Highway (Hotel Nurjahan Rest Stop)
  [91.2485, 23.3214], // Chauddagram
  [91.3985, 23.0185], // Feni Mohammad Ali Highway
  [91.5642, 22.8421], // Chinki Astana / Zorargonj
  [91.6845, 22.7145], // Mirsharai Bypass
  [91.6425, 22.5892], // Sitakunda Highway
  [91.7584, 22.4285], // Bhatiari Highway
  [91.8124, 22.3645], // Chittagong AK Khan Bus Counter
  [91.8285, 22.3421], // Dampara Bus Terminal (Chittagong)
  [91.9542, 22.2541], // Karnaphuli Third Bridge
  [92.0589, 22.1582], // Dohazari
  [92.0845, 21.9452], // Satkania Bypass
  [92.0412, 21.7541], // Lohagara
  [92.0521, 21.6124], // Chakaria Highway Rest Point
  [92.1245, 21.4287], // Ramu Bypass
  [91.9845, 21.4321], // Kolatoli Beach Point, Cox's Bazar
];

// N2 Dhaka to Sylhet National Highway (via Kanchpur, Narsingdi, Bhairab, Brahmanbaria, Shaistaganj, Sreemangal, Kadamtali Sylhet)
export const N2_DHAKA_SYLHET_HIGHWAY: [number, number][] = [
  [90.4045, 23.7785], // Mohakhali Bus Terminal
  [90.4612, 23.7051], // Jatrabari / Kanchpur
  [90.7185, 23.9245], // Narsingdi Bypass
  [90.9854, 24.0512], // Bhairab Bridge
  [91.1124, 23.9785], // Brahmanbaria Highway
  [91.3654, 24.1845], // Shaistaganj (Ujan Vati Rest Stop)
  [91.5842, 24.3124], // Sreemangal Highway
  [91.7456, 24.4851], // Moulvibazar Bypass
  [91.8685, 24.8745], // Kadamtali Central Bus Terminal, Sylhet
];

// N5 Dhaka to Bogura / Rajshahi (via Gabtoli, Savar, Chandra, Bangabandhu Jamuna Bridge, Sirajganj, Bogura)
export const N5_DHAKA_BOGURA_HIGHWAY: [number, number][] = [
  [90.3542, 23.7845], // Gabtoli Bus Terminal
  [90.2584, 23.8451], // Savar Highway
  [90.2285, 23.9842], // Chandra Nabinagar Highway
  [90.0451, 24.0845], // Mirzapur
  [89.9145, 24.2485], // Tangail Bypass
  [89.7845, 24.3985], // Jamuna Bridge East Toll Plaza
  [89.7124, 24.4124], // Jamuna Bridge West
  [89.6541, 24.4685], // Sirajganj Highway Food Village
  [89.3685, 24.8451], // Bogura Charmatha Central Bus Stand
];

// ============================================================================
// Featured Bus Profiles
// ============================================================================

export const FEATURED_BUS_TRIPS: BusProfile[] = [
  {
    id: "bus-gl-1",
    busNumber: "ঢাকা মেট্রো-ব ১৫-৪২০১",
    serviceName: "Green Line Scania Multi-Axle",
    serviceNameBn: "গ্রীন লাইন স্ক্যানিয়া মাল্টি-অ্যাক্সেল স্লিপার",
    operatorName: "Green Line Paribahan",
    operatorNameBn: "গ্রীন লাইন পরিবহন",
    busType: "AC Scania Sleeper (Business Class)",
    origin: "Dhaka",
    originBn: "ঢাকা (রাজারবাগ/আরামবাগ)",
    destination: "Cox's Bazar",
    destinationBn: "কক্সবাজার (কলাতলী বিচ পয়েন্ট)",
    departureTime: "10:30 PM",
    arrivalTime: "07:00 AM",
    totalDistanceKm: 395,
    status: "running",
    speedKmh: 84,
    delayMinutes: 0,
    confidenceScore: 0.98,
    passengersVerified: 16,
    dataSource: "crowdsourced",
    trafficStatus: "clear",
    currentHighway: "N1 ঢাকা-চট্টগ্রাম-কক্সবাজার এক্সপ্রেসওয়ে",
    highwayGeometry: N1_DHAKA_COXS_BAZAR_HIGHWAY,
    nextStop: {
      id: "stop-nurjahan",
      name: "Hotel Nurjahan Highway Rest Area, Comilla",
      nameBn: "হোটেল নূরজাহান হাইওয়ে রেস্ট এরিয়া, কুমিল্লা",
      type: "rest_stop",
      lat: 23.4684,
      lng: 91.1245,
      scheduledTime: "01:30 AM",
      delayMinutes: 0,
      distanceKm: 98,
      passed: false,
      amenities: ["বাথরুম ও ফ্রেশরুম", "২৪/৭ রেস্টুরেন্ট", "চা ও কফি লাউঞ্জ", "মসজিদ"],
    },
    stops: [
      {
        id: "b-1",
        name: "Rajarbagh Central Terminal, Dhaka",
        nameBn: "রাজারবাগ সেন্ট্রাল কাউন্টার, ঢাকা",
        type: "boarding",
        lat: 23.7185,
        lng: 90.4265,
        scheduledTime: "10:30 PM",
        delayMinutes: 0,
        distanceKm: 0,
        passed: true,
      },
      {
        id: "b-2",
        name: "Meghna Bridge Toll Plaza",
        nameBn: "মেঘনা সেতু টোল প্লাজা",
        type: "toll_plaza",
        lat: 23.6084,
        lng: 90.6125,
        scheduledTime: "11:45 PM",
        delayMinutes: 0,
        distanceKm: 32,
        passed: true,
      },
      {
        id: "b-3",
        name: "Hotel Nurjahan Highway Rest Area, Comilla",
        nameBn: "হোটেল নূরজাহান হাইওয়ে রেস্ট এরিয়া, কুমিল্লা",
        type: "rest_stop",
        lat: 23.4684,
        lng: 91.1245,
        scheduledTime: "01:30 AM",
        delayMinutes: 0,
        distanceKm: 98,
        passed: false,
        amenities: ["বাথরুম ও ফ্রেশরুম", "২৪/৭ রেস্টুরেন্ট", "চা ও কফি লাউঞ্জ", "মসজিদ"],
      },
      {
        id: "b-4",
        name: "Dampara Bus Terminal, Chittagong",
        nameBn: "দামপাড়া বাস কাউন্টার, চট্টগ্রাম",
        type: "boarding",
        lat: 22.3421,
        lng: 91.8285,
        scheduledTime: "04:30 AM",
        delayMinutes: 0,
        distanceKm: 245,
        passed: false,
      },
      {
        id: "b-5",
        name: "Chakaria Highway Point",
        nameBn: "চকরিয়া হাইওয়ে পয়েন্ট",
        type: "boarding",
        lat: 21.6124,
        lng: 92.0521,
        scheduledTime: "06:00 AM",
        delayMinutes: 0,
        distanceKm: 340,
        passed: false,
      },
      {
        id: "b-6",
        name: "Kolatoli Beach Point, Cox's Bazar",
        nameBn: "কলাতলী বিচ পয়েন্ট, কক্সবাজার",
        type: "dropping",
        lat: 21.4321,
        lng: 91.9845,
        scheduledTime: "07:00 AM",
        delayMinutes: 0,
        distanceKm: 395,
        passed: false,
      },
    ],
  },
  {
    id: "bus-hanif-1",
    busNumber: "ঢাকা মেট্রো-ব ১৪-৯৮১২",
    serviceName: "Hanif Business Class Volvo",
    serviceNameBn: "হানিফ বিজনেস ক্লাস ভলভো ৯৬০০",
    operatorName: "Hanif Enterprise",
    operatorNameBn: "হানিফ এন্টারপ্রাইজ",
    busType: "Volvo Multi-Axle Exclusive",
    origin: "Dhaka",
    originBn: "ঢাকা (সায়েদাবাদ)",
    destination: "Chittagong",
    destinationBn: "চট্টগ্রাম (একে খান/দামপাড়া)",
    departureTime: "08:00 AM",
    arrivalTime: "01:30 PM",
    totalDistanceKm: 245,
    status: "running",
    speedKmh: 82,
    delayMinutes: 5,
    confidenceScore: 0.95,
    passengersVerified: 12,
    dataSource: "crowdsourced",
    trafficStatus: "moderate",
    currentHighway: "N1 ঢাকা-চট্টগ্রাম মহাসড়ক",
    highwayGeometry: N1_DHAKA_COXS_BAZAR_HIGHWAY.slice(0, 15),
    nextStop: {
      id: "h-feni",
      name: "Mohammad Ali Highway Inn, Feni",
      nameBn: "মোহাম্মদ আলী হাইওয়ে ইন, ফেনী",
      type: "rest_stop",
      lat: 23.0185,
      lng: 91.3985,
      scheduledTime: "11:15 AM",
      delayMinutes: 5,
      distanceKm: 155,
      passed: false,
      amenities: ["ফ্রেশরুম", "স্ন্যাকস ও লাঞ্চ", "নামাজের স্থান"],
    },
    stops: [
      {
        id: "h-1",
        name: "Sayedabad Central Terminal, Dhaka",
        nameBn: "সায়েদাবাদ সেন্ট্রাল কাউন্টার, ঢাকা",
        type: "boarding",
        lat: 23.7185,
        lng: 90.4265,
        scheduledTime: "08:00 AM",
        delayMinutes: 0,
        distanceKm: 0,
        passed: true,
      },
      {
        id: "h-2",
        name: "Mohammad Ali Highway Inn, Feni",
        nameBn: "মোহাম্মদ আলী হাইওয়ে ইন, ফেনী",
        type: "rest_stop",
        lat: 23.0185,
        lng: 91.3985,
        scheduledTime: "11:15 AM",
        delayMinutes: 5,
        distanceKm: 155,
        passed: false,
        amenities: ["ফ্রেশরুম", "স্ন্যাকস ও লাঞ্চ", "নামাজের স্থান"],
      },
      {
        id: "h-3",
        name: "Dampara Bus Terminal, Chittagong",
        nameBn: "দামপাড়া সেন্ট্রাল কাউন্টার, চট্টগ্রাম",
        type: "dropping",
        lat: 22.3421,
        lng: 91.8285,
        scheduledTime: "01:30 PM",
        delayMinutes: 5,
        distanceKm: 245,
        passed: false,
      },
    ],
  },
  {
    id: "bus-shyamoli-1",
    busNumber: "ঢাকা মেট্রো-ব ১৩-৫৫৬১",
    serviceName: "Shyamoli Hyundai Universe",
    serviceNameBn: "শ্যামলী হুন্দাই ইউনিভার্স এক্সক্লুসিভ",
    operatorName: "Shyamoli NR Travels",
    operatorNameBn: "শ্যামলী এন আর ট্রাভেলস",
    busType: "Hyundai Universe AC Super Deluxe",
    origin: "Dhaka",
    originBn: "ঢাকা (মহাখালী)",
    destination: "Sylhet",
    destinationBn: "সিলেট (কদমতলী)",
    departureTime: "11:00 PM",
    arrivalTime: "05:30 AM",
    totalDistanceKm: 240,
    status: "running",
    speedKmh: 78,
    delayMinutes: 0,
    confidenceScore: 0.93,
    passengersVerified: 9,
    dataSource: "crowdsourced",
    trafficStatus: "clear",
    currentHighway: "N2 ঢাকা-সিলেট জাতীয় মহাসড়ক",
    highwayGeometry: N2_DHAKA_SYLHET_HIGHWAY,
    nextStop: {
      id: "sh-ujan",
      name: "Ujan Vati Highway Rest Stop, Shaistaganj",
      nameBn: "উজান ভাটি হাইওয়ে রেস্তোরাঁ, শায়েস্তাগঞ্জ",
      type: "rest_stop",
      lat: 24.1845,
      lng: 91.3654,
      scheduledTime: "02:30 AM",
      delayMinutes: 0,
      distanceKm: 140,
      passed: false,
      amenities: ["হাইজিনিক রেস্টরুম", "চা-নাস্তা ও ডিনার", "নামাজ ঘর"],
    },
    stops: [
      {
        id: "sh-1",
        name: "Mohakhali Terminal, Dhaka",
        nameBn: "মহাখালী বাস টার্মিনাল, ঢাকা",
        type: "boarding",
        lat: 23.7785,
        lng: 90.4045,
        scheduledTime: "11:00 PM",
        delayMinutes: 0,
        distanceKm: 0,
        passed: true,
      },
      {
        id: "sh-2",
        name: "Ujan Vati Highway Rest Stop, Shaistaganj",
        nameBn: "উজান ভাটি হাইওয়ে রেস্তোরাঁ, শায়েস্তাগঞ্জ",
        type: "rest_stop",
        lat: 24.1845,
        lng: 91.3654,
        scheduledTime: "02:30 AM",
        delayMinutes: 0,
        distanceKm: 140,
        passed: false,
        amenities: ["হাইজিনিক রেস্টরুম", "চা-নাস্তা ও ডিনার", "নামাজ ঘর"],
      },
      {
        id: "sh-3",
        name: "Kadamtali Bus Terminal, Sylhet",
        nameBn: "কদমতলী কেন্দ্রীয় বাস টার্মিনাল, সিলেট",
        type: "dropping",
        lat: 24.8745,
        lng: 91.8685,
        scheduledTime: "05:30 AM",
        delayMinutes: 0,
        distanceKm: 240,
        passed: false,
      },
    ],
  },
  {
    id: "bus-ena-1",
    busNumber: "ঢাকা মেট্রো-ব ১২-৩৪০৮",
    serviceName: "Ena Jamuna Bridge Express",
    serviceNameBn: "এনা যমুনা এক্সপ্রেস নন-স্টপ",
    operatorName: "Ena Transport",
    operatorNameBn: "এনা ট্রান্সপোর্ট",
    busType: "Deluxe Non-Stop Highway Coach",
    origin: "Dhaka",
    originBn: "ঢাকা (গাবতলী/মহাখালী)",
    destination: "Bogura",
    destinationBn: "বগুড়া (চারমাথা)",
    departureTime: "09:00 AM",
    arrivalTime: "02:00 PM",
    totalDistanceKm: 198,
    status: "running",
    speedKmh: 80,
    delayMinutes: 0,
    confidenceScore: 0.94,
    passengersVerified: 14,
    dataSource: "crowdsourced",
    trafficStatus: "clear",
    currentHighway: "N5 ঢাকা-বঙ্গবন্ধু সেতু-বগুড়া মহাসড়ক",
    highwayGeometry: N5_DHAKA_BOGURA_HIGHWAY,
    nextStop: {
      id: "ena-jb",
      name: "Food Village Plus Highway Rest Stop, Sirajganj",
      nameBn: "ফুড ভিলেজ প্লাস হাইওয়ে রেস্তোরাঁ, সিরাজগঞ্জ",
      type: "rest_stop",
      lat: 24.4685,
      lng: 89.6541,
      scheduledTime: "11:45 AM",
      delayMinutes: 0,
      distanceKm: 128,
      passed: false,
      amenities: ["ফুড কোর্ট", "এয়ারকন্ডিশন রেস্টুরেন্ট", "এসি ওয়াশরুম"],
    },
    stops: [
      {
        id: "e-1",
        name: "Gabtoli Bus Terminal, Dhaka",
        nameBn: "গাবতলী সেন্ট্রাল বাস টার্মিনাল, ঢাকা",
        type: "boarding",
        lat: 23.7845,
        lng: 90.3542,
        scheduledTime: "09:00 AM",
        delayMinutes: 0,
        distanceKm: 0,
        passed: true,
      },
      {
        id: "e-2",
        name: "Food Village Plus Highway Rest Stop, Sirajganj",
        nameBn: "ফুড ভিলেজ প্লাস হাইওয়ে রেস্তোরাঁ, সিরাজগঞ্জ",
        type: "rest_stop",
        lat: 24.4685,
        lng: 89.6541,
        scheduledTime: "11:45 AM",
        delayMinutes: 0,
        distanceKm: 128,
        passed: false,
        amenities: ["ফুড কোর্ট", "এয়ারকন্ডিশন রেস্টুরেন্ট", "এসি ওয়াশরুম"],
      },
      {
        id: "e-3",
        name: "Charmatha Central Bus Stand, Bogura",
        nameBn: "চারমাথা সেন্ট্রাল বাস টার্মিনাল, বগুড়া",
        type: "dropping",
        lat: 24.8451,
        lng: 89.3685,
        scheduledTime: "02:00 PM",
        delayMinutes: 0,
        distanceKm: 198,
        passed: false,
      },
    ],
  },
];

// ============================================================================
// Math & Geospatial Utilities
// ============================================================================

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;

function calcDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin((lon2 - lon1) * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD);
  const x =
    Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
    Math.sin(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.cos((lon2 - lon1) * DEG_TO_RAD);
  const brng = Math.atan2(y, x) * RAD_TO_DEG;
  return (brng + 360) % 360;
}

function getHighwayDistances(points: [number, number][]): number[] {
  const distances = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = calcDistKm(
      points[i - 1][1],
      points[i - 1][0],
      points[i][1],
      points[i][0]
    );
    total += d;
    distances.push(total);
  }
  return distances;
}

function interpolateAlongHighway(
  points: [number, number][],
  targetKm: number
): { lat: number; lng: number; bearing: number } {
  if (points.length === 0) return { lat: 23.7185, lng: 90.4265, bearing: 0 };
  if (targetKm <= 0) {
    const b =
      points.length > 1
        ? calcBearing(points[0][1], points[0][0], points[1][1], points[1][0])
        : 0;
    return { lat: points[0][1], lng: points[0][0], bearing: b };
  }

  const distances = getHighwayDistances(points);
  const totalLength = distances[distances.length - 1];

  if (targetKm >= totalLength) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2] || last;
    const b = calcBearing(prev[1], prev[0], last[1], last[0]);
    return { lat: last[1], lng: last[0], bearing: b };
  }

  for (let i = 1; i < distances.length; i++) {
    if (distances[i] >= targetKm) {
      const segStartDist = distances[i - 1];
      const segEndDist = distances[i];
      const segLength = segEndDist - segStartDist;
      const ratio = segLength === 0 ? 0 : (targetKm - segStartDist) / segLength;

      const p1 = points[i - 1];
      const p2 = points[i];

      const lng = p1[0] + (p2[0] - p1[0]) * ratio;
      const lat = p1[1] + (p2[1] - p1[1]) * ratio;
      const bearing = calcBearing(p1[1], p1[0], p2[1], p2[0]);

      return { lat, lng, bearing };
    }
  }

  const last = points[points.length - 1];
  return { lat: last[1], lng: last[0], bearing: 0 };
}

// ============================================================================
// Real-time Motion Generator & State Manager
// ============================================================================

export class BusTrackingService {
  private static instance: BusTrackingService;
  private currentProgressOffset: Map<string, number> = new Map();
  private mockChats: Map<string, BusPassengerChat[]> = new Map();

  private constructor() {
    this.currentProgressOffset.set("bus-gl-1", 72.5); // Daudkandi Meghna-Gomti area
    this.currentProgressOffset.set("bus-hanif-1", 110.0); // Near Comilla
    this.currentProgressOffset.set("bus-shyamoli-1", 65.0); // Near Bhairab
    this.currentProgressOffset.set("bus-ena-1", 85.0); // Near Tangail

    this.mockChats.set("bus-gl-1", [
      {
        id: "bmsg-1",
        senderName: "Arifur Rahman",
        seatNumber: "A1 (Sleeper)",
        message: "বাসের এসি ও স্লিপার সিট খুবই আরামদায়ক। হাইওয়ে বেশ ফাঁকা আছে।",
        timestamp: "4 min ago",
        isVerifiedPassenger: true,
      },
      {
        id: "bmsg-2",
        senderName: "Supervisor (সুমন)",
        seatNumber: "Crew",
        message: "আমরা প্রায় কুমিল্লা হোটেল নূরজাহানের কাছাকাছি। ১০ মিনিট পর ২০ মিনিটের যাত্রা বিরতি দেওয়া হবে।",
        timestamp: "2 min ago",
        isVerifiedPassenger: true,
      },
    ]);
  }

  public static getInstance(): BusTrackingService {
    if (!BusTrackingService.instance) {
      BusTrackingService.instance = new BusTrackingService();
    }
    return BusTrackingService.instance;
  }

  public getBusProfile(busId: string): BusProfile {
    const found = FEATURED_BUS_TRIPS.find((b) => b.id === busId || b.busNumber === busId);
    return found || FEATURED_BUS_TRIPS[0];
  }

  public getAllBuses(): BusProfile[] {
    return FEATURED_BUS_TRIPS;
  }

  public getLivePosition(busId: string): LiveBusPosition {
    const profile = this.getBusProfile(busId);
    const highway = profile.highwayGeometry;
    const distances = getHighwayDistances(highway);
    const totalDistKm = distances[distances.length - 1];

    let currentKm = this.currentProgressOffset.get(profile.id) ?? 40;
    currentKm += 0.05; // Smooth incremental movement along highway
    if (currentKm > totalDistKm - 2) {
      currentKm = 5; // Loop for simulation
    }
    this.currentProgressOffset.set(profile.id, currentKm);

    const busPose = interpolateAlongHighway(highway, currentKm);

    // Identify next stop
    let nextStop = profile.stops[profile.stops.length - 1];
    for (const stop of profile.stops) {
      if (stop.distanceKm > currentKm) {
        nextStop = stop;
        break;
      }
    }

    const distToNextKm = Math.max(0.1, nextStop.distanceKm - currentKm);
    const speed = profile.speedKmh > 0 ? profile.speedKmh : 80;
    const etaMinutes = Math.round((distToNextKm / speed) * 60);
    const progressPct = Math.min(100, (currentKm / totalDistKm) * 100);

    return {
      busNumber: profile.busNumber,
      latitude: busPose.lat,
      longitude: busPose.lng,
      bearing: busPose.bearing,
      speedKmh: speed,
      distanceAlongKm: currentKm,
      progressPct,
      nextStop,
      etaMinutesToNextStop: etaMinutes,
      delayMinutes: profile.delayMinutes,
      trafficStatus: profile.trafficStatus,
    };
  }

  public getPassengerChats(busId: string): BusPassengerChat[] {
    return this.mockChats.get(busId) || [];
  }

  public sendPassengerChat(
    busId: string,
    message: string,
    senderName: string,
    seat?: string
  ): BusPassengerChat {
    const current = this.getPassengerChats(busId);
    const newMsg: BusPassengerChat = {
      id: `bmsg-${Date.now()}`,
      senderName: senderName || "অনবোর্ড যাত্রী",
      seatNumber: seat || "Seat",
      message,
      timestamp: "Just now",
      isVerifiedPassenger: true,
    };
    const updated = [newMsg, ...current];
    this.mockChats.set(busId, updated);
    return newMsg;
  }
}

export const busTrackingService = BusTrackingService.getInstance();
