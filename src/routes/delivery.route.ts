import { Router } from "express";
import * as delivery from "../controllers/delivery.controller.js";
import * as auth from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * Delivery Partner Routes
 * Base path: /api/v2/delivery/*
 *
 * These routes manage delivery partner profiles and order assignments.
 * Delivery partners are users who have been invited by shopkeepers and completed KYC verification.
 *
 * Middleware:
 * - auth.authMiddleware: Verifies JWT token, attaches user to req
 * - auth.isDeliveryBoy: Verifies user has 'delivery_boy' role
 *
 * Workflow:
 * 1. Shopkeeper invites user via phone (see shop routes)
 * 2. User creates delivery profile with KYC documents
 * 3. User role is updated to 'delivery_boy'
 * 4. Delivery partner can view and manage assigned orders
 */

/**
 * Delivery Profile Management
 *
 * Required KYC documents:
 * - Aadhar number (12 digits, unique)
 * - Driving license (number and images)
 * - Vehicle details (owner name, model, registration number)
 * - PAN number (optional, for tax purposes)
 *
 * Profile links delivery partner to a specific shopkeeper.
 */
router.post(
  "/create-delivery-profile",
  auth.authMiddleware,
  delivery.createDeliveryProfile
); // POST /api/v2/delivery/create-delivery-profile - Create delivery partner profile with KYC (converts user to delivery_boy role)

router.put(
  "/update-delivery-profile",
  auth.authMiddleware,
  auth.isDeliveryBoy,
  delivery.updateDeliveryProfile
); // PUT /api/v2/delivery/update-delivery-profile - Update delivery profile (vehicle details, PAN, license images)

/**
 * Order Assignment Routes
 *
 * Delivery partners can:
 * - View all orders assigned to them
 * - Filter by order status (confirmed, shipped, delivered)
 * - Track order details and customer information
 * - Update order status as they progress through delivery
 */
router.get(
  "/get-assigned-orders",
  auth.authMiddleware,
  auth.isDeliveryBoy,
  delivery.getAssignedOrders
); // GET /api/v2/delivery/get-assigned-orders - Get all orders assigned to delivery partner (supports status filter)

router.patch(
  "/update-order-status",
  auth.authMiddleware,
  auth.isDeliveryBoy,
  delivery.updateOrderStatus
); // PATCH /api/v2/delivery/update-order-status - Update order status (confirmed -> shipped -> delivered)

router.patch(
  "/update-location",
  auth.authMiddleware,
  auth.isDeliveryBoy,
  delivery.updateLocation
); // PATCH /api/v2/delivery/update-location - Update rider location

router.get(
  "/cities/available",
  auth.authMiddleware,
  delivery.getAvailableCities
); // GET /api/v2/delivery/cities/available - Get available cities

router.get(
  "/shops/nearby",
  auth.authMiddleware,
  delivery.getNearbyShops
); // GET /api/v2/delivery/shops/nearby - Get all shops for registration

router.patch(
  "/availability",
  auth.authMiddleware,
  auth.isDeliveryBoy,
  delivery.toggleAvailability
); // PATCH /api/v2/delivery/availability - Toggle rider online/offline

router.get(
  "/profile",
  auth.authMiddleware,
  auth.isDeliveryBoy,
  delivery.getDeliveryProfile
); // GET /api/v2/delivery/profile - Get delivery profile info

export default router;
