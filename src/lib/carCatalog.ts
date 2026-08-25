/**
 * Brand → Model catalog for Thailand Automotive Market.
 */

export type VehicleType = "sedan_asia" | "sedan_eu" | "pickup" | "van";
export type Size = "A" | "B" | "C";
export type BodyStyle = "sedan" | "suv" | "pickup" | "van";

export type CarModel = {
  id: string;
  name: string;
  vehicleType: VehicleType;
  size: Size;
  bodyStyle: BodyStyle;
  years?: string;
};

export type Brand = {
  id: string;
  name: string;
  logo?: string;
  models: CarModel[];
};

export const BRANDS: Brand[] = [
  {
    id: "toyota",
    name: "Toyota",
    logo: "🔴",
    models: [
      { id: "yaris", name: "Yaris", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "yaris-ativ", name: "Yaris Ativ", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "vios", name: "Vios", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "yaris-cross", name: "Yaris Cross", vehicleType: "sedan_asia", size: "A", bodyStyle: "suv" },
      { id: "altis", name: "Corolla Altis", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "camry", name: "Camry", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "corolla-cross", name: "Corolla Cross", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "chr", name: "C-HR", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "fortuner", name: "Fortuner", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "hilux", name: "Hilux Revo", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "hilux-champ", name: "Hilux Champ", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "vigo", name: "Vigo", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "innova", name: "Innova Zenix", vehicleType: "van", size: "B", bodyStyle: "van" },
      { id: "veloz", name: "Veloz", vehicleType: "van", size: "B", bodyStyle: "van" },
      { id: "alphard", name: "Alphard", vehicleType: "van", size: "C", bodyStyle: "van" },
      { id: "vellfire", name: "Vellfire", vehicleType: "van", size: "C", bodyStyle: "van" },
      { id: "commuter", name: "Commuter", vehicleType: "van", size: "C", bodyStyle: "van" },
      { id: "majesty", name: "Majesty", vehicleType: "van", size: "C", bodyStyle: "van" },
    ],
  },
  {
    id: "honda",
    name: "Honda",
    logo: "🔵",
    models: [
      { id: "brio", name: "Brio", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "brio-amaze", name: "Brio Amaze", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "city", name: "City", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "city-hb", name: "City Hatchback", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "jazz", name: "Jazz", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "wrv", name: "WR-V", vehicleType: "sedan_asia", size: "A", bodyStyle: "suv" },
      { id: "civic", name: "Civic", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "accord", name: "Accord", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "hrv", name: "HR-V", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "brv", name: "BR-V", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "crv", name: "CR-V", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "mobilio", name: "Mobilio", vehicleType: "van", size: "B", bodyStyle: "van" },
      { id: "odyssey", name: "Odyssey", vehicleType: "van", size: "C", bodyStyle: "van" },
      { id: "freed", name: "Freed", vehicleType: "van", size: "B", bodyStyle: "van" },
      { id: "stepwgn", name: "Stepwgn", vehicleType: "van", size: "C", bodyStyle: "van" },
    ],
  },
  {
    id: "isuzu",
    name: "Isuzu",
    logo: "🔴",
    models: [
      { id: "dmax", name: "D-Max", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "dmax-cab4", name: "D-Max Cab4", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "dmax-vcross", name: "D-Max V-Cross", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "mux", name: "MU-X", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "mu7", name: "MU-7", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "dragon", name: "Dragon Eyes", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
    ],
  },
  {
    id: "nissan",
    name: "Nissan",
    logo: "⚪",
    models: [
      { id: "almera", name: "Almera", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "march", name: "March", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "note", name: "Note", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "kicks", name: "Kicks e-POWER", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "navara", name: "Navara", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "frontier", name: "Frontier", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "terra", name: "Terra", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "teana", name: "Teana", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "sylphy", name: "Sylphy", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "urvan", name: "Urvan", vehicleType: "van", size: "C", bodyStyle: "van" },
    ],
  },
  {
    id: "mazda",
    name: "Mazda",
    logo: "🔵",
    models: [
      { id: "mazda2", name: "Mazda 2", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "mazda3", name: "Mazda 3", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "cx3", name: "CX-3", vehicleType: "sedan_asia", size: "A", bodyStyle: "suv" },
      { id: "cx30", name: "CX-30", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "cx5", name: "CX-5", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "cx8", name: "CX-8", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "bt50", name: "BT-50", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "mx5", name: "MX-5", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
    ],
  },
  {
    id: "mitsubishi",
    name: "Mitsubishi",
    logo: "🔴",
    models: [
      { id: "mirage", name: "Mirage", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "attrage", name: "Attrage", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "xpander", name: "Xpander", vehicleType: "van", size: "B", bodyStyle: "van" },
      { id: "xpander-cross", name: "Xpander Cross", vehicleType: "van", size: "B", bodyStyle: "van" },
      { id: "pajero-sport", name: "Pajero Sport", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "triton", name: "Triton", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
    ],
  },
  {
    id: "ford",
    name: "Ford",
    logo: "🔵",
    models: [
      { id: "ranger", name: "Ranger", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "ranger-raptor", name: "Ranger Raptor", vehicleType: "pickup", size: "B", bodyStyle: "pickup" },
      { id: "everest", name: "Everest", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "mustang", name: "Mustang", vehicleType: "sedan_eu", size: "B", bodyStyle: "sedan" },
      { id: "territory", name: "Territory", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
    ],
  },
  {
    id: "mg",
    name: "MG",
    logo: "🔴",
    models: [
      { id: "mg3", name: "MG 3", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "mg5", name: "MG 5", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "mg-zs", name: "MG ZS", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "mg-hs", name: "MG HS", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "mg-ep", name: "MG EP", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "mg4", name: "MG4 EV", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "maxus9", name: "MG Maxus 9", vehicleType: "van", size: "C", bodyStyle: "van" },
    ],
  },
  {
    id: "byd",
    name: "BYD",
    logo: "🟢",
    models: [
      { id: "atto3", name: "Atto 3", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "dolphin", name: "Dolphin", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "seal", name: "Seal", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "sealion6", name: "Sealion 6", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "m6", name: "M6", vehicleType: "van", size: "B", bodyStyle: "van" },
    ],
  },
  {
    id: "suzuki",
    name: "Suzuki",
    logo: "🔴",
    models: [
      { id: "swift", name: "Swift", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "ciaz", name: "Ciaz", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "celerio", name: "Celerio", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "ertiga", name: "Ertiga", vehicleType: "van", size: "B", bodyStyle: "van" },
      { id: "xl7", name: "XL7", vehicleType: "van", size: "B", bodyStyle: "van" },
      { id: "jimny", name: "Jimny", vehicleType: "sedan_asia", size: "A", bodyStyle: "suv" },
      { id: "carry", name: "Carry", vehicleType: "pickup", size: "A", bodyStyle: "pickup" },
    ],
  },
  {
    id: "gwm",
    name: "GWM / Haval",
    logo: "🟡",
    models: [
      { id: "haval-h6", name: "Haval H6", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "haval-jolion", name: "Haval Jolion", vehicleType: "sedan_asia", size: "A", bodyStyle: "suv" },
      { id: "ora-good-cat", name: "Ora Good Cat", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
      { id: "ora-07", name: "Ora 07", vehicleType: "sedan_asia", size: "B", bodyStyle: "sedan" },
      { id: "tank-300", name: "Tank 300", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "tank-500", name: "Tank 500", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
    ],
  },
  {
    id: "hyundai",
    name: "Hyundai",
    logo: "🔵",
    models: [
      { id: "h1", name: "H-1", vehicleType: "van", size: "C", bodyStyle: "van" },
      { id: "staria", name: "Staria", vehicleType: "van", size: "C", bodyStyle: "van" },
      { id: "creta", name: "Creta", vehicleType: "sedan_asia", size: "A", bodyStyle: "suv" },
      { id: "santa-fe", name: "Santa Fe", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "ioniq5", name: "Ioniq 5", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
    ],
  },
  {
    id: "subaru",
    name: "Subaru",
    logo: "🔵",
    models: [
      { id: "forester", name: "Forester", vehicleType: "sedan_asia", size: "B", bodyStyle: "suv" },
      { id: "xv", name: "XV / Crosstrek", vehicleType: "sedan_asia", size: "A", bodyStyle: "suv" },
      { id: "outback", name: "Outback", vehicleType: "sedan_asia", size: "C", bodyStyle: "suv" },
      { id: "brz", name: "BRZ", vehicleType: "sedan_asia", size: "A", bodyStyle: "sedan" },
    ],
  },
  {
    id: "mercedes",
    name: "Mercedes-Benz",
    logo: "⭐",
    models: [
      { id: "a-class", name: "A-Class (A200)", vehicleType: "sedan_eu", size: "A", bodyStyle: "sedan" },
      { id: "c-class", name: "C-Class (C220)", vehicleType: "sedan_eu", size: "B", bodyStyle: "sedan" },
      { id: "e-class", name: "E-Class (E220d)", vehicleType: "sedan_eu", size: "C", bodyStyle: "sedan" },
      { id: "s-class", name: "S-Class (S350)", vehicleType: "sedan_eu", size: "C", bodyStyle: "sedan" },
      { id: "cla", name: "CLA", vehicleType: "sedan_eu", size: "A", bodyStyle: "sedan" },
      { id: "gla", name: "GLA", vehicleType: "sedan_eu", size: "B", bodyStyle: "suv" },
      { id: "glc", name: "GLC", vehicleType: "sedan_eu", size: "B", bodyStyle: "suv" },
      { id: "gle", name: "GLE", vehicleType: "sedan_eu", size: "C", bodyStyle: "suv" },
    ],
  },
  {
    id: "bmw",
    name: "BMW",
    logo: "🔷",
    models: [
      { id: "1-series", name: "1 Series (118i)", vehicleType: "sedan_eu", size: "A", bodyStyle: "sedan" },
      { id: "3-series", name: "3 Series (320i)", vehicleType: "sedan_eu", size: "B", bodyStyle: "sedan" },
      { id: "5-series", name: "5 Series (520d)", vehicleType: "sedan_eu", size: "C", bodyStyle: "sedan" },
      { id: "7-series", name: "7 Series (730Ld)", vehicleType: "sedan_eu", size: "C", bodyStyle: "sedan" },
      { id: "x1", name: "X1", vehicleType: "sedan_eu", size: "B", bodyStyle: "suv" },
      { id: "x3", name: "X3", vehicleType: "sedan_eu", size: "B", bodyStyle: "suv" },
      { id: "x5", name: "X5", vehicleType: "sedan_eu", size: "C", bodyStyle: "suv" },
    ],
  },
  {
    id: "volvo",
    name: "Volvo",
    logo: "⚪",
    models: [
      { id: "xc40", name: "XC40 / EX30", vehicleType: "sedan_eu", size: "B", bodyStyle: "suv" },
      { id: "xc60", name: "XC60", vehicleType: "sedan_eu", size: "B", bodyStyle: "suv" },
      { id: "xc90", name: "XC90", vehicleType: "sedan_eu", size: "C", bodyStyle: "suv" },
      { id: "s60", name: "S60 / V60", vehicleType: "sedan_eu", size: "B", bodyStyle: "sedan" },
    ],
  },
  {
    id: "tesla",
    name: "Tesla",
    logo: "⚡",
    models: [
      { id: "model3", name: "Model 3", vehicleType: "sedan_eu", size: "B", bodyStyle: "sedan" },
      { id: "modely", name: "Model Y", vehicleType: "sedan_eu", size: "B", bodyStyle: "suv" },
      { id: "models", name: "Model S", vehicleType: "sedan_eu", size: "C", bodyStyle: "sedan" },
      { id: "modelx", name: "Model X", vehicleType: "sedan_eu", size: "C", bodyStyle: "suv" },
    ],
  },
];

export const VEHICLE_TYPE_LABEL: Record<VehicleType, { en: string; th: string }> = {
  sedan_asia: { en: "Sedan (Asian)", th: "รถเก๋ง (เอเชีย)" },
  sedan_eu: { en: "Sedan (European)", th: "รถเก๋ง (ยุโรป)" },
  pickup: { en: "Pickup", th: "รถกระบะ" },
  van: { en: "Van / MPV", th: "รถตู้ / MPV" },
};

export const SIZE_LABEL: Record<Size, { en: string; th: string }> = {
  A: { en: "Compact", th: "ขนาดเล็ก" },
  B: { en: "Mid-size", th: "ขนาดกลาง" },
  C: { en: "Large / Premium", th: "ขนาดใหญ่ / พรีเมียม" },
};
