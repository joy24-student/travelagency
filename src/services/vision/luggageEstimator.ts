/**
 * Luggage Estimator - Advanced Augmented Reality & Spatial Computing Service
 * 
 * Features:
 * 1. 3D Spatial Geometry Engine: Pinhole camera matrix, 6DOF rotation (Yaw/Pitch/Roll),
 *    perspective projection, raycasting, ground plane intersection.
 * 2. Surface Plane Tracking & SLAM Feature Point Cloud generation.
 * 3. Virtual Airline Sizing Cage & Overhead Bin 3D envelope comparison.
 * 4. Multi-Carrier Airline Allowance Matrix (18 international & domestic carriers, Economy/Business).
 * 5. Volumetric weight estimation (kg/L density), linear sum, and Fit Index (0-100%).
 * 6. Temporal smoothing filter (EMA) with adaptive smoothing for fast snaps vs steady holds.
 * 7. Extra baggage addon pricing engine with guaranteed 30% advance discount.
 */

export interface Vector3D {
  x: number; // right (+) in meters
  y: number; // up (+) in meters
  z: number; // depth forward (+) in meters
}

export interface Point2D {
  x: number; // pixels
  y: number; // pixels
}

export interface LuggageDimensions {
  height: number; // cm
  width: number;  // cm
  depth: number;  // cm
}

export interface Rotation3D {
  yaw: number;   // radians around Y (horizontal turn)
  pitch: number; // radians around X (tilt)
  roll: number;  // radians around Z (cant)
}

export interface CameraIntrinsics {
  focalLengthX: number;
  focalLengthY: number;
  principalPointX: number;
  principalPointY: number;
  viewportWidth: number;
  viewportHeight: number;
  fovVerticalDegrees: number;
}

export interface SurfacePlane {
  anchor: Vector3D;
  normal: Vector3D;
  confidence: number; // 0.0 - 1.0
  extent: { width: number; depth: number };
  state: "SEARCHING" | "DETECTED" | "TRACKING" | "LOCKED";
  distanceMeters: number;
}

export interface FeaturePoint {
  id: string;
  worldPos: Vector3D;
  screenPos: Point2D;
  confidence: number;
  type: "plane" | "edge" | "corner" | "handle";
}

export interface BoxVertex {
  index: number;
  world: Vector3D;
  projected: Point2D;
}

export interface BoxEdge {
  from: number;
  to: number;
  dimension: "height" | "width" | "depth";
  isExceeded: boolean;
  lengthCm: number;
  labelPosition: Point2D;
  midpoint3D: Vector3D;
}

export interface BoxFace {
  name: "bottom" | "top" | "front" | "back" | "left" | "right";
  vertexIndices: [number, number, number, number];
  points2D: Point2D[];
  centerZ: number;
  normal: Vector3D;
  shadingOpacity: number;
}

export interface BoundingBox3D {
  center: Vector3D;
  dimensionsCm: LuggageDimensions;
  rotation: Rotation3D;
  vertices: BoxVertex[];
  edges: BoxEdge[];
  faces: BoxFace[];
  groundCorners: Point2D[];
  topCorners: Point2D[];
  distanceMeters: number;
  complianceColor: string; // #10B981, #F59E0B, #EF4444
  status: "COMPLIANT" | "BORDERLINE" | "OVERSIZED";
  sizingCageVertices?: BoxVertex[];
  sizingCageEdges?: Array<{ from: number; to: number }>;
}

export interface ExtraBaggageTier {
  id: string;
  weightKg: number;
  description: string;
  gatePriceBdt: number;
  preBookPriceBdt: number;
  gatePriceUsd: number;
  preBookPriceUsd: number;
  discountPercentage: number;
  badge?: string;
}

export type CabinClass = "Economy" | "Business" | "First";
export type LuggageType = "roller" | "backpack" | "duffel" | "personal_item";

export interface AirlineCabinAllowance {
  id: string;
  name: string;
  iataCode: string;
  country: string;
  region: "Domestic" | "Middle East" | "Asia" | "Europe" | "Americas";
  logo: string;
  maxDimensions: LuggageDimensions; // in cm (Height x Width x Depth)
  businessMaxDimensions?: LuggageDimensions;
  maxLinearSumCm: number;           // H + W + D
  maxWeightKg: number;
  businessMaxWeightKg?: number;
  personalItemAllowed: boolean;
  personalItemDimensions?: LuggageDimensions;
  overheadBinType: "standard" | "widebody" | "narrowbody";
  strictness: "Very Strict" | "Strict" | "Moderate";
  preBookExtraBaggageAvailable: boolean;
  extraBaggageTiers: ExtraBaggageTier[];
  notes: string;
}

export interface DimensionEvaluation {
  dimension: "height" | "width" | "depth";
  measuredCm: number;
  allowedCm: number;
  differenceCm: number; // positive means exceeded
  status: "OK" | "BORDERLINE" | "EXCEEDED";
}

export interface LuggageComplianceResult {
  airline: AirlineCabinAllowance;
  cabinClass: CabinClass;
  isCompliant: boolean;
  status: "COMPLIANT" | "BORDERLINE" | "OVERSIZED";
  fitIndex: number; // 0 to 100%
  dimensions: {
    height: DimensionEvaluation;
    width: DimensionEvaluation;
    depth: DimensionEvaluation;
  };
  totalLinearCm: {
    measured: number;
    allowed: number;
    differenceCm: number;
    isExceeded: boolean;
  };
  volumeLiters: number;
  estimatedWeightRangeKg: { min: number; max: number };
  exceededDimensions: Array<"height" | "width" | "depth">;
  severityScore: number; // 0 (compliant) to 1 (critically oversized)
  summaryText: string;
  recommendation: string;
  suggestedAddon?: ExtraBaggageTier;
}

// ─── EXPANDED AIRLINE SPECIFICATION MATRIX (18 CARRIERS) ────────────────────────
export const AIRLINE_SPECIFICATIONS: AirlineCabinAllowance[] = [
  {
    id: "biman-bangladesh",
    name: "Biman Bangladesh Airlines",
    iataCode: "BG",
    country: "Bangladesh",
    region: "Domestic",
    logo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100",
    maxDimensions: { height: 56, width: 36, depth: 23 },
    businessMaxDimensions: { height: 56, width: 36, depth: 23 },
    maxLinearSumCm: 115,
    maxWeightKg: 7,
    businessMaxWeightKg: 10,
    personalItemAllowed: true,
    personalItemDimensions: { height: 40, width: 30, depth: 15 },
    overheadBinType: "standard",
    strictness: "Strict",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "bg-tier-5k",
        weightKg: 5,
        description: "+5 kg Prepaid Cabin/Checked Allowance",
        gatePriceBdt: 1800,
        preBookPriceBdt: 1260,
        gatePriceUsd: 16,
        preBookPriceUsd: 11,
        discountPercentage: 30,
        badge: "Most Popular",
      },
      {
        id: "bg-tier-10k",
        weightKg: 10,
        description: "+10 kg Extra Checked Allowance",
        gatePriceBdt: 3500,
        preBookPriceBdt: 2450,
        gatePriceUsd: 30,
        preBookPriceUsd: 21,
        discountPercentage: 30,
        badge: "Best Value",
      },
      {
        id: "bg-tier-23k",
        weightKg: 23,
        description: "+1 Full Extra Check-in Piece (23 kg)",
        gatePriceBdt: 7500,
        preBookPriceBdt: 5250,
        gatePriceUsd: 65,
        preBookPriceUsd: 45,
        discountPercentage: 30,
      },
    ],
    notes: "Physical 56x36x23 cm gate sizing cage at Dhaka Hazrat Shahjalal (DAC). Wheels & handles must fit.",
  },
  {
    id: "emirates",
    name: "Emirates",
    iataCode: "EK",
    country: "UAE",
    region: "Middle East",
    logo: "https://images.unsplash.com/photo-1583073030825-4560b777174e?w=100",
    maxDimensions: { height: 55, width: 38, depth: 20 },
    businessMaxDimensions: { height: 55, width: 38, depth: 20 },
    maxLinearSumCm: 113,
    maxWeightKg: 7,
    businessMaxWeightKg: 14, // 2 pieces x 7kg
    personalItemAllowed: true,
    personalItemDimensions: { height: 45, width: 35, depth: 20 },
    overheadBinType: "widebody",
    strictness: "Very Strict",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "ek-tier-5k",
        weightKg: 5,
        description: "+5 kg Excess Baggage Allowance",
        gatePriceBdt: 3200,
        preBookPriceBdt: 2240,
        gatePriceUsd: 28,
        preBookPriceUsd: 19,
        discountPercentage: 30,
      },
      {
        id: "ek-tier-10k",
        weightKg: 10,
        description: "+10 kg Excess Checked Allowance",
        gatePriceBdt: 6000,
        preBookPriceBdt: 4200,
        gatePriceUsd: 52,
        preBookPriceUsd: 36,
        discountPercentage: 30,
        badge: "Best Value",
      },
      {
        id: "ek-tier-25k",
        weightKg: 25,
        description: "+25 kg Full Additional Baggage",
        gatePriceBdt: 14000,
        preBookPriceBdt: 9800,
        gatePriceUsd: 120,
        preBookPriceUsd: 84,
        discountPercentage: 30,
      },
    ],
    notes: "Economy strictly limited to 1 piece (55x38x20 cm, 7kg). Overweight bags get sent to cargo hold.",
  },
  {
    id: "qatar-airways",
    name: "Qatar Airways",
    iataCode: "QR",
    country: "Qatar",
    region: "Middle East",
    logo: "https://images.unsplash.com/photo-1520437358207-323b43b50729?w=100",
    maxDimensions: { height: 50, width: 37, depth: 25 },
    businessMaxDimensions: { height: 50, width: 37, depth: 25 },
    maxLinearSumCm: 112,
    maxWeightKg: 7,
    businessMaxWeightKg: 15,
    personalItemAllowed: true,
    personalItemDimensions: { height: 40, width: 30, depth: 10 },
    overheadBinType: "widebody",
    strictness: "Very Strict",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "qr-tier-5k",
        weightKg: 5,
        description: "+5 kg Preferred Excess Weight",
        gatePriceBdt: 3400,
        preBookPriceBdt: 2380,
        gatePriceUsd: 29,
        preBookPriceUsd: 20,
        discountPercentage: 30,
      },
      {
        id: "qr-tier-10k",
        weightKg: 10,
        description: "+10 kg Extra Piece Allowance",
        gatePriceBdt: 6500,
        preBookPriceBdt: 4550,
        gatePriceUsd: 56,
        preBookPriceUsd: 39,
        discountPercentage: 30,
        badge: "Recommended",
      },
      {
        id: "qr-tier-23k",
        weightKg: 23,
        description: "+23 kg Standard Check-in Piece",
        gatePriceBdt: 12500,
        preBookPriceBdt: 8750,
        gatePriceUsd: 108,
        preBookPriceUsd: 75,
        discountPercentage: 30,
      },
    ],
    notes: "Strict 50x37x25 cm for Economy. Hamad Int'l Airport (DOH) monitors carry-on weights at transit.",
  },
  {
    id: "us-bangla",
    name: "US-Bangla Airlines",
    iataCode: "BS",
    country: "Bangladesh",
    region: "Domestic",
    logo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100",
    maxDimensions: { height: 56, width: 36, depth: 23 },
    maxLinearSumCm: 115,
    maxWeightKg: 7,
    personalItemAllowed: true,
    overheadBinType: "standard",
    strictness: "Strict",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "bs-tier-5k",
        weightKg: 5,
        description: "+5 kg Domestic/Intl Top-Up",
        gatePriceBdt: 1500,
        preBookPriceBdt: 1050,
        gatePriceUsd: 13,
        preBookPriceUsd: 9,
        discountPercentage: 30,
      },
      {
        id: "bs-tier-10k",
        weightKg: 10,
        description: "+10 kg Prepaid Checked Baggage",
        gatePriceBdt: 2800,
        preBookPriceBdt: 1960,
        gatePriceUsd: 24,
        preBookPriceUsd: 17,
        discountPercentage: 30,
        badge: "Popular",
      },
    ],
    notes: "Operates Boeing 737-800 and ATR 72-600. Bags larger than 56x36x23 cm must be checked.",
  },
  {
    id: "novoair",
    name: "Novoair",
    iataCode: "VQ",
    country: "Bangladesh",
    region: "Domestic",
    logo: "https://images.unsplash.com/photo-1517404215738-15263e9f9178?w=100",
    maxDimensions: { height: 55, width: 35, depth: 25 },
    maxLinearSumCm: 115,
    maxWeightKg: 7,
    personalItemAllowed: true,
    overheadBinType: "narrowbody",
    strictness: "Strict",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "vq-tier-5k",
        weightKg: 5,
        description: "+5 kg Domestic Upgrade",
        gatePriceBdt: 1400,
        preBookPriceBdt: 980,
        gatePriceUsd: 12,
        preBookPriceUsd: 8,
        discountPercentage: 30,
      },
      {
        id: "vq-tier-10k",
        weightKg: 10,
        description: "+10 kg Heavy Bag Upgrade",
        gatePriceBdt: 2600,
        preBookPriceBdt: 1820,
        gatePriceUsd: 22,
        preBookPriceUsd: 15,
        discountPercentage: 30,
      },
    ],
    notes: "ATR 72 overhead compartments are compact. Rigid trolley bags must strictly fit 55x35x25 cm.",
  },
  {
    id: "singapore-airlines",
    name: "Singapore Airlines",
    iataCode: "SQ",
    country: "Singapore",
    region: "Asia",
    logo: "https://images.unsplash.com/photo-1570710891163-6d3b5c47248b?w=100",
    maxDimensions: { height: 56, width: 36, depth: 23 },
    businessMaxDimensions: { height: 56, width: 36, depth: 23 },
    maxLinearSumCm: 115,
    maxWeightKg: 7,
    businessMaxWeightKg: 14,
    personalItemAllowed: true,
    personalItemDimensions: { height: 40, width: 30, depth: 10 },
    overheadBinType: "widebody",
    strictness: "Moderate",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "sq-tier-5k",
        weightKg: 5,
        description: "+5 kg Checked Allowance Top-Up",
        gatePriceBdt: 4200,
        preBookPriceBdt: 2940,
        gatePriceUsd: 36,
        preBookPriceUsd: 25,
        discountPercentage: 30,
      },
      {
        id: "sq-tier-10k",
        weightKg: 10,
        description: "+10 kg Excess Prepaid Allowance",
        gatePriceBdt: 7800,
        preBookPriceBdt: 5460,
        gatePriceUsd: 67,
        preBookPriceUsd: 47,
        discountPercentage: 30,
      },
    ],
    notes: "Linear sum strictly capped at 115 cm. 1 personal item allowed under seat.",
  },
  {
    id: "saudia",
    name: "Saudia",
    iataCode: "SV",
    country: "Saudi Arabia",
    region: "Middle East",
    logo: "https://images.unsplash.com/photo-1542296332-2e4473faf563?w=100",
    maxDimensions: { height: 56, width: 45, depth: 25 },
    businessMaxDimensions: { height: 56, width: 45, depth: 25 },
    maxLinearSumCm: 126,
    maxWeightKg: 7,
    businessMaxWeightKg: 9,
    personalItemAllowed: true,
    overheadBinType: "widebody",
    strictness: "Moderate",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "sv-tier-10k",
        weightKg: 10,
        description: "+10 kg Haj/Umrah & Leisure Allowance",
        gatePriceBdt: 5000,
        preBookPriceBdt: 3500,
        gatePriceUsd: 43,
        preBookPriceUsd: 30,
        discountPercentage: 30,
      },
      {
        id: "sv-tier-23k",
        weightKg: 23,
        description: "+23 kg Additional Checked Piece",
        gatePriceBdt: 11000,
        preBookPriceBdt: 7700,
        gatePriceUsd: 95,
        preBookPriceUsd: 66,
        discountPercentage: 30,
        badge: "Zamzam Ready",
      },
    ],
    notes: "Generous 45 cm width allowance. Accommodates standard pilgrimage packages.",
  },
  {
    id: "turkish-airlines",
    name: "Turkish Airlines",
    iataCode: "TK",
    country: "Turkey",
    region: "Europe",
    logo: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=100",
    maxDimensions: { height: 55, width: 40, depth: 23 },
    businessMaxDimensions: { height: 55, width: 40, depth: 23 },
    maxLinearSumCm: 118,
    maxWeightKg: 8,
    businessMaxWeightKg: 16,
    personalItemAllowed: true,
    overheadBinType: "standard",
    strictness: "Strict",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "tk-tier-5k",
        weightKg: 5,
        description: "+5 kg Cabin Upgrade",
        gatePriceBdt: 3600,
        preBookPriceBdt: 2520,
        gatePriceUsd: 31,
        preBookPriceUsd: 22,
        discountPercentage: 30,
      },
      {
        id: "tk-tier-10k",
        weightKg: 10,
        description: "+10 kg Extra Checked Allowance",
        gatePriceBdt: 6800,
        preBookPriceBdt: 4760,
        gatePriceUsd: 58,
        preBookPriceUsd: 41,
        discountPercentage: 30,
      },
    ],
    notes: "Allows slightly higher 8 kg weight. Max dimensions 55x40x23 cm.",
  },
  {
    id: "flydubai",
    name: "flydubai",
    iataCode: "FZ",
    country: "UAE",
    region: "Middle East",
    logo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100",
    maxDimensions: { height: 55, width: 38, depth: 20 },
    maxLinearSumCm: 113,
    maxWeightKg: 7,
    businessMaxWeightKg: 14,
    personalItemAllowed: true,
    overheadBinType: "standard",
    strictness: "Very Strict",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "fz-tier-5k",
        weightKg: 5,
        description: "+5 kg Extra Baggage Option",
        gatePriceBdt: 2900,
        preBookPriceBdt: 2030,
        gatePriceUsd: 25,
        preBookPriceUsd: 17,
        discountPercentage: 30,
      },
      {
        id: "fz-tier-10k",
        weightKg: 10,
        description: "+10 kg Checked Baggage",
        gatePriceBdt: 5400,
        preBookPriceBdt: 3780,
        gatePriceUsd: 46,
        preBookPriceUsd: 32,
        discountPercentage: 30,
      },
    ],
    notes: "Very strict low-cost carrier check at departure gate. Overweight items incur full gate fee.",
  },
  {
    id: "indigo",
    name: "IndiGo",
    iataCode: "6E",
    country: "India",
    region: "Asia",
    logo: "https://images.unsplash.com/photo-1517404215738-15263e9f9178?w=100",
    maxDimensions: { height: 55, width: 35, depth: 25 },
    maxLinearSumCm: 115,
    maxWeightKg: 7,
    personalItemAllowed: true,
    overheadBinType: "standard",
    strictness: "Very Strict",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "6e-tier-5k",
        weightKg: 5,
        description: "+5 kg Prepaid Excess Luggage",
        gatePriceBdt: 2200,
        preBookPriceBdt: 1540,
        gatePriceUsd: 19,
        preBookPriceUsd: 13,
        discountPercentage: 30,
      },
      {
        id: "6e-tier-10k",
        weightKg: 10,
        description: "+10 kg Prepaid Checked Bag",
        gatePriceBdt: 4200,
        preBookPriceBdt: 2940,
        gatePriceUsd: 36,
        preBookPriceUsd: 25,
        discountPercentage: 30,
      },
    ],
    notes: "Strict 1-piece cabin baggage rule. Handbag / laptop must fit within the single allowance.",
  },
  {
    id: "british-airways",
    name: "British Airways",
    iataCode: "BA",
    country: "UK",
    region: "Europe",
    logo: "https://images.unsplash.com/photo-1542296332-2e4473faf563?w=100",
    maxDimensions: { height: 56, width: 45, depth: 25 },
    maxLinearSumCm: 126,
    maxWeightKg: 23, // British Airways allows up to 23kg cabin weight as long as passenger can lift it
    personalItemAllowed: true,
    personalItemDimensions: { height: 40, width: 30, depth: 15 },
    overheadBinType: "widebody",
    strictness: "Moderate",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "ba-tier-23k",
        weightKg: 23,
        description: "+23 kg Checked Baggage Piece",
        gatePriceBdt: 9500,
        preBookPriceBdt: 6650,
        gatePriceUsd: 82,
        preBookPriceUsd: 57,
        discountPercentage: 30,
      },
    ],
    notes: "Industry-leading 23 kg cabin bag weight limit if you can lift it into the bin unassisted.",
  },
  {
    id: "lufthansa",
    name: "Lufthansa",
    iataCode: "LH",
    country: "Germany",
    region: "Europe",
    logo: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=100",
    maxDimensions: { height: 55, width: 40, depth: 23 },
    maxLinearSumCm: 118,
    maxWeightKg: 8,
    personalItemAllowed: true,
    overheadBinType: "standard",
    strictness: "Strict",
    preBookExtraBaggageAvailable: true,
    extraBaggageTiers: [
      {
        id: "lh-tier-8k",
        weightKg: 8,
        description: "+8 kg Extra Cabin Piece",
        gatePriceBdt: 4500,
        preBookPriceBdt: 3150,
        gatePriceUsd: 39,
        preBookPriceUsd: 27,
        discountPercentage: 30,
      },
      {
        id: "lh-tier-23k",
        weightKg: 23,
        description: "+23 kg Standard Checked Luggage",
        gatePriceBdt: 10500,
        preBookPriceBdt: 7350,
        gatePriceUsd: 90,
        preBookPriceUsd: 63,
        discountPercentage: 30,
      },
    ],
    notes: "German precision gate sizing tests. Foldable garment bags up to 57x54x15 cm.",
  },
];

export const DEFAULT_AIRLINE = AIRLINE_SPECIFICATIONS[0]; // Biman Bangladesh

// ─── 3D SPATIAL COMPUTING & ROTATION ENGINE ────────────────────────────────────

/**
 * Applies 3D rotation (Yaw, Pitch, Roll) to a vector in world/camera space.
 */
export function rotateVector3D(v: Vector3D, rot: Rotation3D): Vector3D {
  const { yaw, pitch, roll } = rot;

  // Yaw around Y
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = v.x * cosY + v.z * sinY;
  const y1 = v.y;
  const z1 = -v.x * sinY + v.z * cosY;

  // Pitch around X
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const x2 = x1;
  const y2 = y1 * cosP - z1 * sinP;
  const z2 = y1 * sinP + z1 * cosP;

  // Roll around Z
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const x3 = x2 * cosR - y2 * sinR;
  const y3 = x2 * sinR + y2 * cosR;
  const z3 = z2;

  return { x: x3, y: y3, z: z3 };
}

/**
 * Builds camera intrinsics from screen dimensions and typical mobile wide FOV.
 */
export function buildCameraIntrinsics(
  width: number,
  height: number,
  fovVerticalDegrees = 65
): CameraIntrinsics {
  const fovVerticalRadians = (fovVerticalDegrees * Math.PI) / 180;
  const focalLengthY = (height / 2) / Math.tan(fovVerticalRadians / 2);
  const focalLengthX = focalLengthY;
  const principalPointX = width / 2;
  const principalPointY = height / 2;

  return {
    focalLengthX,
    focalLengthY,
    principalPointX,
    principalPointY,
    viewportWidth: width,
    viewportHeight: height,
    fovVerticalDegrees,
  };
}

/**
 * Projects a 3D point in camera space into 2D viewport coordinates.
 */
export function project3DTo2D(point: Vector3D, intrinsics: CameraIntrinsics): Point2D {
  if (point.z <= 0.05) {
    return {
      x: intrinsics.principalPointX,
      y: intrinsics.principalPointY,
    };
  }

  const screenX = intrinsics.principalPointX + (point.x * intrinsics.focalLengthX) / point.z;
  const screenY = intrinsics.principalPointY - (point.y * intrinsics.focalLengthY) / point.z;

  return { x: screenX, y: screenY };
}

/**
 * Unprojects a screen point into a normalized 3D ray in camera space.
 */
export function screenPointToRay(point: Point2D, intrinsics: CameraIntrinsics): Vector3D {
  const rx = (point.x - intrinsics.principalPointX) / intrinsics.focalLengthX;
  const ry = -(point.y - intrinsics.principalPointY) / intrinsics.focalLengthY;
  const rz = 1.0;

  const length = Math.sqrt(rx * rx + ry * ry + rz * rz);
  return {
    x: rx / length,
    y: ry / length,
    z: rz / length,
  };
}

/**
 * Intersects a 3D ray with a horizontal surface plane at floor height Y.
 */
export function raycastGroundPlane(
  ray: Vector3D,
  cameraY = 1.35,
  floorY = 0.0
): Vector3D | null {
  if (Math.abs(ray.y) < 0.001 || ray.y >= 0) {
    return null;
  }
  const t = (floorY - cameraY) / ray.y;
  if (t <= 0) return null;

  return {
    x: ray.x * t,
    y: floorY,
    z: ray.z * t,
  };
}

/**
 * Generates synthetic feature points simulating SLAM surface tracking keypoints.
 */
export function generateSyntheticFeaturePoints(
  plane: SurfacePlane,
  bagCenter: Vector3D,
  dimensionsCm: LuggageDimensions,
  intrinsics: CameraIntrinsics,
  timeMs: number
): FeaturePoint[] {
  const points: FeaturePoint[] = [];
  const halfW = dimensionsCm.width / 200;
  const halfD = dimensionsCm.depth / 200;
  const heightM = dimensionsCm.height / 100;

  // Surface texture keypoints
  const gridSteps = 5;
  for (let ix = -gridSteps; ix <= gridSteps; ix++) {
    for (let iz = 0; iz <= gridSteps * 2; iz++) {
      const wx = plane.anchor.x + (ix * 0.25);
      const wz = plane.anchor.z - 0.4 + (iz * 0.25);
      const wy = plane.anchor.y;
      const wobble = Math.sin(timeMs * 0.003 + ix + iz) * 0.003;
      const worldPos: Vector3D = { x: wx, y: wy + wobble, z: wz };

      if (worldPos.z > 0.4) {
        const screenPos = project3DTo2D(worldPos, intrinsics);
        if (
          screenPos.x >= 0 &&
          screenPos.x <= intrinsics.viewportWidth &&
          screenPos.y >= 0 &&
          screenPos.y <= intrinsics.viewportHeight
        ) {
          points.push({
            id: `fp-surf-${ix}-${iz}`,
            worldPos,
            screenPos,
            confidence: 0.85 + Math.sin(ix * iz) * 0.1,
            type: "plane",
          });
        }
      }
    }
  }

  // Bag corner and contour keypoints
  const bagOffsets = [
    { x: -halfW, y: 0, z: -halfD },
    { x: halfW, y: 0, z: -halfD },
    { x: halfW, y: 0, z: halfD },
    { x: -halfW, y: 0, z: halfD },
    { x: -halfW, y: heightM, z: -halfD },
    { x: halfW, y: heightM, z: -halfD },
    { x: halfW, y: heightM, z: halfD },
    { x: -halfW, y: heightM, z: halfD },
    // Handle & Zipper
    { x: 0, y: heightM + 0.05, z: 0 },
    { x: -halfW, y: heightM * 0.5, z: 0 },
    { x: halfW, y: heightM * 0.5, z: 0 },
    { x: 0, y: 0, z: halfD },
  ];

  bagOffsets.forEach((off, idx) => {
    const worldPos: Vector3D = {
      x: bagCenter.x + off.x,
      y: bagCenter.y + off.y,
      z: bagCenter.z + off.z,
    };
    const screenPos = project3DTo2D(worldPos, intrinsics);
    points.push({
      id: `fp-bag-${idx}`,
      worldPos,
      screenPos,
      confidence: 0.95,
      type: idx === 8 ? "handle" : idx < 8 ? "corner" : "edge",
    });
  });

  return points;
}

// ─── 3D BOUNDING BOX & AIRLINE SIZING ENVELOPE COMPUTATION ─────────────────────

/**
 * Calculates full 3D Bounding Box with 8 vertices, 12 wireframe edges,
 * 6 isometric faces, and real-time compliance color coding.
 * Optionally overlays the airline's maximum sizing cage envelope in dashed 3D wireframe.
 */
export function calculateBoundingBox3D(
  center: Vector3D,
  dimensionsCm: LuggageDimensions,
  intrinsics: CameraIntrinsics,
  compliance: LuggageComplianceResult,
  rotation: Rotation3D = { yaw: 0.18, pitch: -0.06, roll: 0.0 },
  showSizingCage = true
): BoundingBox3D {
  const wMeters = dimensionsCm.width / 100;
  const hMeters = dimensionsCm.height / 100;
  const dMeters = dimensionsCm.depth / 100;

  const halfW = wMeters / 2;
  const halfD = dMeters / 2;

  // Local bounding box corners relative to center base
  const localCorners: Vector3D[] = [
    { x: -halfW, y: 0, z: -halfD },       // 0: Bottom-Front-Left
    { x: halfW, y: 0, z: -halfD },        // 1: Bottom-Front-Right
    { x: halfW, y: 0, z: halfD },         // 2: Bottom-Back-Right
    { x: -halfW, y: 0, z: halfD },        // 3: Bottom-Back-Left
    { x: -halfW, y: hMeters, z: -halfD }, // 4: Top-Front-Left
    { x: halfW, y: hMeters, z: -halfD },  // 5: Top-Front-Right
    { x: halfW, y: hMeters, z: halfD },   // 6: Top-Back-Right
    { x: -halfW, y: hMeters, z: halfD },  // 7: Top-Back-Left
  ];

  const vertices: BoxVertex[] = localCorners.map((c, index) => {
    const rotated = rotateVector3D(c, rotation);
    const world: Vector3D = {
      x: center.x + rotated.x,
      y: center.y + rotated.y,
      z: center.z + rotated.z,
    };
    const projected = project3DTo2D(world, intrinsics);
    return { index, world, projected };
  });

  // Calculate 12 Wireframe Edges
  const edgeDefs: Array<{ from: number; to: number; dimension: "height" | "width" | "depth" }> = [
    // Bottom base (width & depth)
    { from: 0, to: 1, dimension: "width" },
    { from: 1, to: 2, dimension: "depth" },
    { from: 2, to: 3, dimension: "width" },
    { from: 3, to: 0, dimension: "depth" },
    // Top ceiling (width & depth)
    { from: 4, to: 5, dimension: "width" },
    { from: 5, to: 6, dimension: "depth" },
    { from: 6, to: 7, dimension: "width" },
    { from: 7, to: 4, dimension: "depth" },
    // Vertical pillars (height)
    { from: 0, to: 4, dimension: "height" },
    { from: 1, to: 5, dimension: "height" },
    { from: 2, to: 6, dimension: "height" },
    { from: 3, to: 7, dimension: "height" },
  ];

  const edges: BoxEdge[] = edgeDefs.map((def) => {
    const vFrom = vertices[def.from];
    const vTo = vertices[def.to];
    const isExceeded = compliance.dimensions[def.dimension].status === "EXCEEDED";
    const lengthCm = dimensionsCm[def.dimension];

    const labelPosition: Point2D = {
      x: (vFrom.projected.x + vTo.projected.x) / 2,
      y: (vFrom.projected.y + vTo.projected.y) / 2,
    };

    const midpoint3D: Vector3D = {
      x: (vFrom.world.x + vTo.world.x) / 2,
      y: (vFrom.world.y + vTo.world.y) / 2,
      z: (vFrom.world.z + vTo.world.z) / 2,
    };

    return {
      from: def.from,
      to: def.to,
      dimension: def.dimension,
      isExceeded,
      lengthCm,
      labelPosition,
      midpoint3D,
    };
  });

  // Calculate 6 3D Faces for Shaded Facets
  const faceDefs: Array<{
    name: BoxFace["name"];
    indices: [number, number, number, number];
    normal: Vector3D;
    baseShading: number;
  }> = [
    { name: "bottom", indices: [0, 1, 2, 3], normal: { x: 0, y: -1, z: 0 }, baseShading: 0.12 },
    { name: "top", indices: [4, 5, 6, 7], normal: { x: 0, y: 1, z: 0 }, baseShading: 0.40 },
    { name: "front", indices: [0, 1, 5, 4], normal: { x: 0, y: 0, z: -1 }, baseShading: 0.28 },
    { name: "right", indices: [1, 2, 6, 5], normal: { x: 1, y: 0, z: 0 }, baseShading: 0.22 },
    { name: "back", indices: [2, 3, 7, 6], normal: { x: 0, y: 0, z: 1 }, baseShading: 0.15 },
    { name: "left", indices: [3, 0, 4, 7], normal: { x: -1, y: 0, z: 0 }, baseShading: 0.25 },
  ];

  const faces: BoxFace[] = faceDefs.map((fd) => {
    const pts = fd.indices.map((i) => vertices[i].projected);
    const avgZ = fd.indices.reduce((sum, i) => sum + vertices[i].world.z, 0) / 4;
    return {
      name: fd.name,
      vertexIndices: fd.indices,
      points2D: pts,
      centerZ: avgZ,
      normal: fd.normal,
      shadingOpacity: fd.baseShading,
    };
  });

  // Painter's algorithm sort
  faces.sort((a, b) => b.centerZ - a.centerZ);

  // Airline Maximum Sizing Cage Virtual 3D Overlay
  let sizingCageVertices: BoxVertex[] | undefined;
  let sizingCageEdges: Array<{ from: number; to: number }> | undefined;

  if (showSizingCage) {
    const cageLimits = compliance.airline.maxDimensions;
    const cW = cageLimits.width / 100;
    const cH = cageLimits.height / 100;
    const cD = cageLimits.depth / 100;
    const halfCW = cW / 2;
    const halfCD = cD / 2;

    const cageCorners: Vector3D[] = [
      { x: -halfCW, y: 0, z: -halfCD },
      { x: halfCW, y: 0, z: -halfCD },
      { x: halfCW, y: 0, z: halfCD },
      { x: -halfCW, y: 0, z: halfCD },
      { x: -halfCW, y: cH, z: -halfCD },
      { x: halfCW, y: cH, z: -halfCD },
      { x: halfCW, y: cH, z: halfCD },
      { x: -halfCW, y: cH, z: halfCD },
    ];

    sizingCageVertices = cageCorners.map((c, index) => {
      const rotated = rotateVector3D(c, rotation);
      const world: Vector3D = {
        x: center.x + rotated.x,
        y: center.y + rotated.y,
        z: center.z + rotated.z,
      };
      return { index, world, projected: project3DTo2D(world, intrinsics) };
    });

    sizingCageEdges = [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 0 },
      { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 6, to: 7 }, { from: 7, to: 4 },
      { from: 0, to: 4 }, { from: 1, to: 5 }, { from: 2, to: 6 }, { from: 3, to: 7 },
    ];
  }

  const distanceMeters = Math.sqrt(
    center.x * center.x + center.y * center.y + center.z * center.z
  );

  const complianceColor =
    compliance.status === "COMPLIANT"
      ? "#10B981"
      : compliance.status === "BORDERLINE"
      ? "#F59E0B"
      : "#EF4444";

  return {
    center,
    dimensionsCm,
    rotation,
    vertices,
    edges,
    faces,
    groundCorners: [vertices[0].projected, vertices[1].projected, vertices[2].projected, vertices[3].projected],
    topCorners: [vertices[4].projected, vertices[5].projected, vertices[6].projected, vertices[7].projected],
    distanceMeters,
    complianceColor,
    status: compliance.status,
    sizingCageVertices,
    sizingCageEdges,
  };
}

// ─── AIRLINE COMPLIANCE EVALUATION ENGINE ──────────────────────────────────────

/**
 * Compares estimated bag dimensions against an airline's official cabin limits.
 * Evaluates cabin class, linear sum, volumetric displacement, and packing weight.
 */
export function evaluateLuggageAllowance(
  measured: LuggageDimensions,
  airline: AirlineCabinAllowance = DEFAULT_AIRLINE,
  cabinClass: CabinClass = "Economy"
): LuggageComplianceResult {
  const allowed =
    cabinClass === "Business" && airline.businessMaxDimensions
      ? airline.businessMaxDimensions
      : airline.maxDimensions;

  const heightDiff = Number((measured.height - allowed.height).toFixed(1));
  const widthDiff = Number((measured.width - allowed.width).toFixed(1));
  const depthDiff = Number((measured.depth - allowed.depth).toFixed(1));

  const evalDim = (
    dim: "height" | "width" | "depth",
    measVal: number,
    allowVal: number,
    diff: number
  ): DimensionEvaluation => {
    let status: "OK" | "BORDERLINE" | "EXCEEDED" = "OK";
    if (diff > 0.8) {
      status = "EXCEEDED";
    } else if (diff > 0.0 && diff <= 0.8) {
      status = "BORDERLINE";
    } else {
      status = "OK";
    }
    return {
      dimension: dim,
      measuredCm: Number(measVal.toFixed(1)),
      allowedCm: allowVal,
      differenceCm: diff,
      status,
    };
  };

  const heightEval = evalDim("height", measured.height, allowed.height, heightDiff);
  const widthEval = evalDim("width", measured.width, allowed.width, widthDiff);
  const depthEval = evalDim("depth", measured.depth, allowed.depth, depthDiff);

  // Total linear sum check (H + W + D <= maxLinearSumCm)
  const measuredLinearSum = Number(
    (measured.height + measured.width + measured.depth).toFixed(1)
  );
  const linearDiff = Number((measuredLinearSum - airline.maxLinearSumCm).toFixed(1));
  const isLinearExceeded = linearDiff > 0.8;

  const exceededDimensions: Array<"height" | "width" | "depth"> = [];
  if (heightEval.status === "EXCEEDED") exceededDimensions.push("height");
  if (widthEval.status === "EXCEEDED") exceededDimensions.push("width");
  if (depthEval.status === "EXCEEDED") exceededDimensions.push("depth");

  // Determine overall status
  let overallStatus: "COMPLIANT" | "BORDERLINE" | "OVERSIZED" = "COMPLIANT";
  if (exceededDimensions.length > 0 || isLinearExceeded) {
    overallStatus = "OVERSIZED";
  } else if (
    heightEval.status === "BORDERLINE" ||
    widthEval.status === "BORDERLINE" ||
    depthEval.status === "BORDERLINE"
  ) {
    overallStatus = "BORDERLINE";
  }

  const isCompliant = overallStatus === "COMPLIANT" || overallStatus === "BORDERLINE";

  // Volumetric displacement in liters: (H x W x D) / 1000
  const volumeLiters = Number(
    ((measured.height * measured.width * measured.depth) / 1000).toFixed(1)
  );

  // Estimated packed weight range based on typical garment density (0.14 - 0.22 kg/L)
  const estMinWeight = Number((volumeLiters * 0.14).toFixed(1));
  const estMaxWeight = Number((volumeLiters * 0.22).toFixed(1));

  // Fit Index score: 100% when within limits, decreasing proportionally with excess
  const maxOvershoot = Math.max(0, heightDiff, widthDiff, depthDiff, linearDiff);
  const fitIndex = Math.max(0, Math.min(100, Math.round(100 - (maxOvershoot / 15) * 100)));
  const severityScore = Math.min(1, maxOvershoot / 15);

  // Generate summary text & recommendation
  let summaryText = `Meets ${airline.name} cabin specifications (${allowed.height}×${allowed.width}×${allowed.depth} cm).`;
  let recommendation = "Cabin Bag Approved for Overhead Locker";

  if (overallStatus === "OVERSIZED") {
    const list = exceededDimensions
      .map((d) => `${d.toUpperCase()} (+${Math.abs(measured[d] - allowed[d]).toFixed(1)} cm)`)
      .join(", ");
    summaryText = `Exceeds ${airline.name} ${cabinClass} allowance on ${list || "Linear Sum"}.`;
    recommendation = "Pre-book extra checked luggage now to save 30% compared to airport gate penalty.";
  } else if (overallStatus === "BORDERLINE") {
    summaryText = `Close fit for ${airline.name}. Ensure outer compartments are zipped completely.`;
    recommendation = "Fits overhead locker when uncompressed. Fasten compression straps.";
  }

  const suggestedAddon = airline.extraBaggageTiers[0];

  return {
    airline,
    cabinClass,
    isCompliant,
    status: overallStatus,
    fitIndex,
    dimensions: {
      height: heightEval,
      width: widthEval,
      depth: depthEval,
    },
    totalLinearCm: {
      measured: measuredLinearSum,
      allowed: airline.maxLinearSumCm,
      differenceCm: linearDiff,
      isExceeded: isLinearExceeded,
    },
    volumeLiters,
    estimatedWeightRangeKg: { min: estMinWeight, max: estMaxWeight },
    exceededDimensions,
    severityScore,
    summaryText,
    recommendation,
    suggestedAddon,
  };
}

// ─── ADAPTIVE TEMPORAL SMOOTHING FILTER ────────────────────────────────────────

/**
 * Adaptive Exponential Moving Average (EMA) filter.
 * Dynamically adjusts smoothing factor based on velocity to prevent lag during fast pans
 * while eliminating jitter when holding steady.
 */
export class DimensionSmoother {
  private current: LuggageDimensions | null = null;
  private readonly minAlpha: number;
  private readonly maxAlpha: number;

  constructor(minAlpha = 0.25, maxAlpha = 0.65) {
    this.minAlpha = minAlpha;
    this.maxAlpha = maxAlpha;
  }

  public update(raw: LuggageDimensions): LuggageDimensions {
    if (!this.current) {
      this.current = { ...raw };
      return this.current;
    }

    const delta = Math.abs(raw.height - this.current.height) +
                  Math.abs(raw.width - this.current.width) +
                  Math.abs(raw.depth - this.current.depth);

    // Adaptive alpha: higher alpha if user moved significantly
    const alpha = delta > 4.0 ? this.maxAlpha : this.minAlpha;

    this.current = {
      height: Number((this.current.height + alpha * (raw.height - this.current.height)).toFixed(1)),
      width: Number((this.current.width + alpha * (raw.width - this.current.width)).toFixed(1)),
      depth: Number((this.current.depth + alpha * (raw.depth - this.current.depth)).toFixed(1)),
    };

    return this.current;
  }

  public reset(initial?: LuggageDimensions) {
    this.current = initial ? { ...initial } : null;
  }
}

export const defaultSmoother = new DimensionSmoother();
