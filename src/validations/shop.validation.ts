import zod from "zod";

export const shopRegistrationSchema = zod.object({
  shopName: zod
    .string()
    .min(2, "Shop name must be at least 2 characters long")
    .max(100, "Shop name must be at most 100 characters long"),
  shopCategory: zod.enum([
    "grocery",
    "electronics",
    "furniture",
    "clothing",
    "bakery",
    "homeAppliances",
    "others",
  ]),
  shopImages: zod
    .array(zod.string().url("Each shop image must be a valid URL"))
    .min(1, "At least one shop image is required"),
  fssaiNumber: zod.string().optional(),
  gstNumber: zod.string().optional(),

  address: zod.object({
    name: zod
      .string()
      .min(2, "Name must be at least 2 characters long")
      .max(100, "Name must be at most 100 characters long"),
    phone: zod
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, "Phone number must be a valid E.164 format"),
    line1: zod
      .string()
      .min(5, "Address line 1 must be at least 5 characters long")
      .max(100, "Address line 1 must be at most 100 characters long"),
    line2: zod
      .string()
      .max(100, "Address line 2 must be at most 100 characters long")
      .optional(),
    street: zod
      .string()
      .min(5, "Street must be at least 5 characters long")
      .max(100, "Street must be at most 100 characters long"),
    city: zod
      .string()
      .min(2, "City must be at least 2 characters long")
      .max(50, "City must be at most 50 characters long"),
    state: zod
      .string()
      .min(2, "State must be at least 2 characters long")
      .max(50, "State must be at most 50 characters long"),
    pinCode: zod
      .string()
      .min(4, "Zip code must be at least 4 characters long")
      .max(10, "Zip code must be at most 10 characters long"),
    country: zod
      .string()
      .min(2, "Country must be at least 2 characters long")
      .max(50, "Country must be at most 50 characters long"),

    // "21.159959619455346,79.00436434054704"
    geolocation: zod
      .string()
      .regex(
        /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,
        "Geolocation must be in 'latitude,longitude' format"
      )
      .optional(),
  }),

  documents: zod.object({
    aadharImage: zod.string().url("Aadhar image must be a valid URL"),
    electricityBillImage: zod
      .string()
      .url("Electricity bill image must be a valid URL"),
    businessCertificateImage: zod
      .string()
      .url("Business certificate image must be a valid URL"),
    panImage: zod.string().url("PAN image must be a valid URL").optional(),
  }),
});

export const updateStockAndPriceSchema = zod.object({
  price: zod.number().positive("Price must be a positive number"),
  discount: zod
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),
  weight: zod.number().positive("Weight must be a positive number"),
  stock: zod
    .number()
    .int("Stock must be an integer")
    .min(0, "Stock cannot be negative")
    .optional(),
  unit: zod.enum(["grams", "kg", "ml", "litre", "piece"]).default("grams"),
});

const weeklySlotSchema = zod.object({
  day: zod.enum([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]),
  isOpen: zod.boolean(),
  open: zod
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "open time must be HH:MM (24h)"),
  close: zod
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "close time must be HH:MM (24h)"),
});

export const shopScheduleSchema = zod.object({
  isOnlineDelivery: zod.boolean(),
  weeklySlots: zod.array(weeklySlotSchema).min(1, "At least one weekly slot is required"),
});

export const shopScheduleUpdateSchema = zod.object({
  isOnlineDelivery: zod.boolean().optional(),
  weeklySlots: zod.array(weeklySlotSchema).optional(),
});

/*
bankDetail: zod.object({
    accountHolderName: zod
      .string()
      .min(2, "Account holder name must be at least 2 characters long")
      .max(100, "Account holder name must be at most 100 characters long"),
    accountNumber: zod
      .string()
      .min(5, "Account number must be at least 5 characters long")
      .max(20, "Account number must be at most 20 characters long"),
    ifscCode: zod
      .string()
      .length(11, "IFSC code must be exactly 11 characters long"),
    bankName: zod
      .string()
      .min(2, "Bank name must be at least 2 characters long")
      .max(100, "Bank name must be at most 100 characters long"),
    branchName: zod
      .string()
      .min(2, "Branch name must be at least 2 characters long")
      .max(100, "Branch name must be at most 100 characters long"),
    bankPassbookImage: zod
      .string()
      .url("Bank passbook image must be a valid URL")
      .optional(),
  }),
*/
