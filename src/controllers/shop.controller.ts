import { asyncHandler } from "../utils/asyncHandler";

const createShop = asyncHandler(async (req, res) => {});

const updateShop = asyncHandler(async (req, res) => {});

const addShopProduct = asyncHandler(async (req, res) => {});

const updateShopProduct = asyncHandler(async (req, res) => {});

const updateShopProductStock = asyncHandler(async (req, res) => {});

/* --------- Manage Delivery Partners (optional) --------- */

const getUserByPhone = asyncHandler(async (req, res) => {});
const sendInviteToDeliveryPartner = asyncHandler(async (req, res) => {});

export {
  createShop,
  updateShop,
  addShopProduct,
  updateShopProduct,
  updateShopProductStock,
  getUserByPhone,
  sendInviteToDeliveryPartner,
};
