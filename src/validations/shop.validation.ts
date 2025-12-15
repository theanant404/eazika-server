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
  document: zod.object({
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
