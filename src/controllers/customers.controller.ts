import { asyncHandler } from "../utils/asyncHandler";

/* -------Customer Cart Controllers-------- */
const addToCart = asyncHandler(async (req, res) => {});
const getCart = asyncHandler(async (req, res) => {});
const updateCartItem = asyncHandler(async (req, res) => {});
const removeCartItem = asyncHandler(async (req, res) => {});
const clearCart = asyncHandler(async (req, res) => {});

/* -------Customer Order Controllers-------- */

const createOrder = asyncHandler(async (req, res) => {});
const getOrder = asyncHandler(async (req, res) => {});
const getOrders = asyncHandler(async (req, res) => {});
const trackOrder = asyncHandler(async (req, res) => {});
const cancelOrderByCustomer = asyncHandler(async (req, res) => {});

export {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  createOrder,
  getOrder,
  getOrders,
  trackOrder,
  cancelOrderByCustomer,
};
