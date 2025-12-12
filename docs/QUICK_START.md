# 🚀 Quick Start Guide - Push Notification System

This guide will help you get the push notification system up and running in minutes.

## ✅ Prerequisites

- Node.js 18+ installed
- Both eazika-server and eazika-client projects set up
- Dependencies installed (socket.io, socket.io-client, lucide-react)

## 📝 Step-by-Step Setup

### Step 1: Backend Configuration

1. **Navigate to the server directory:**

```bash
cd eazika-server
```

2. **Install dependencies** (if not already done):

```bash
npm install
```

3. **Set up environment variables:**
   Create or update `.env` file:

```env
PORT=8000
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

4. **Start the server:**

```bash
npm run dev
```

You should see:

```
Eazika server is running on port 8000
Socket.IO is ready for connections
```

### Step 2: Frontend Configuration

1. **Navigate to the client directory:**

```bash
cd eazika-client
```

2. **Install dependencies** (if not already done):

```bash
npm install
```

3. **Set up environment variables:**
   Create or update `.env.local` file:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

4. **Start the development server:**

```bash
npm run dev
```

### Step 3: Test the Connection

1. **Open your browser** to `http://localhost:3000`

2. **Check the browser console** - you should see:

```
Socket connected: [socket-id]
Socket authenticated: { success: true }
```

3. **Add the NotificationCenter to your app:**

Edit any page or layout file (e.g., `app/page.tsx`):

```tsx
import { NotificationCenter } from "@/components/NotificationCenter";

export default function Home() {
  return (
    <div>
      <nav className="flex justify-between items-center p-4 border-b">
        <h1>My App</h1>
        <NotificationCenter />
      </nav>
      {/* Your content */}
    </div>
  );
}
```

### Step 4: Test Notifications

#### Option A: Use the Example Page

1. Navigate to `http://localhost:3000/examples/notifications`
2. Try the interactive examples

#### Option B: Use API Endpoints

**Test with curl:**

```bash
# Get your authentication token first (replace YOUR_TOKEN)
TOKEN="YOUR_TOKEN"

# Send a broadcast notification
curl -X POST http://localhost:8000/api/v2/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "🎉 Test notification from curl!",
    "type": "success"
  }'
```

**Test with Postman or Thunder Client:**

1. Create a POST request to:

   ```
   http://localhost:8000/api/v2/notifications/broadcast
   ```

2. Add headers:

   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_TOKEN
   ```

3. Add body (raw JSON):

   ```json
   {
     "message": "Test notification!",
     "type": "success"
   }
   ```

4. Send the request - you should see a toast notification appear!

#### Option C: Use from Backend Code

In any controller or service file:

```typescript
import { emitToUser } from "../config/socket.config";

// Send notification to a specific user
emitToUser("user123", "notification", {
  message: "Your order has been confirmed!",
  type: "success",
  data: { orderId: "ORDER-123" },
  timestamp: new Date().toISOString(),
});
```

## 🎯 Common Use Cases

### 1. Order Status Updates

```typescript
// In your order controller
import { emitToUser } from "../config/socket.config";

async function updateOrderStatus(
  orderId: string,
  userId: string,
  status: string
) {
  // Update database...

  // Send notification
  emitToUser(userId, "notification", {
    message: `Your order #${orderId} is now ${status}`,
    type: "info",
    data: { orderId, status },
    timestamp: new Date().toISOString(),
  });
}
```

### 2. Admin Notifications

```typescript
// Notify all admins of a new order
import { emitToRole } from "../config/socket.config";

async function notifyAdminsOfNewOrder(order: Order) {
  emitToRole("admin", "notification", {
    message: `New order #${order.id} from ${order.customerName}`,
    type: "info",
    data: { orderId: order.id, amount: order.total },
    timestamp: new Date().toISOString(),
  });
}
```

### 3. Real-time Order Tracking

```typescript
// In your delivery tracking controller
import { emitToRoom } from "../config/socket.config";

async function updateDeliveryLocation(orderId: string, location: Location) {
  // Update database...

  // Emit to tracking room
  emitToRoom(`order-tracking-${orderId}`, "location_update", {
    orderId,
    location,
    timestamp: new Date().toISOString(),
  });
}
```

## 🔍 Verification Checklist

- [ ] Backend server is running on port 8000
- [ ] Frontend is running on port 3000
- [ ] Browser console shows "Socket connected"
- [ ] Browser console shows "Socket authenticated"
- [ ] NotificationCenter bell icon is visible in your app
- [ ] Bell icon shows green dot (connected)
- [ ] Test notification appears when sent via API

## 🐛 Troubleshooting

### Socket Not Connecting

**Issue:** Socket shows disconnected (red dot)

**Solutions:**

1. Verify backend is running: `curl http://localhost:8000/health`
2. Check `NEXT_PUBLIC_SOCKET_URL` in `.env.local`
3. Check browser console for CORS errors
4. Ensure ports 8000 and 3000 are not blocked

### Notifications Not Appearing

**Issue:** API call succeeds but no notification shows

**Solutions:**

1. Check that user is logged in (localStorage has user data)
2. Verify socket is connected (check connection status)
3. Check browser console for errors
4. Try sending a broadcast notification first (doesn't require authentication)

### TypeScript Errors

**Issue:** Type errors in IDE

**Solutions:**

1. Run `npm install` in both directories
2. Restart your IDE/TypeScript server
3. Check that all dependencies are installed

### Authentication Issues

**Issue:** Socket connects but can't authenticate

**Solutions:**

1. Check that user data exists in localStorage:
   ```javascript
   console.log(localStorage.getItem("user"));
   ```
2. Verify user object has `id` and `role` properties
3. Check backend logs for authentication errors

## 📚 Next Steps

1. **Customize the NotificationCenter** - Edit `/components/NotificationCenter.tsx` to match your design
2. **Add more notification types** - Extend the notification system with custom types
3. **Persist notifications** - Add database storage for notification history
4. **Add push notifications** - Integrate with Web Push API or FCM
5. **Add notification preferences** - Let users choose which notifications to receive

## 🎓 Learn More

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Full README](./SOCKET_NOTIFICATION_README.md)
- [Type Definitions](./SOCKET_TYPES.md)

## 💡 Tips

- **Development:** Use the example page at `/examples/notifications` to test
- **Production:** Set `NEXT_PUBLIC_SOCKET_URL` to your production backend URL
- **Performance:** Notifications are stored in memory; clear old ones periodically
- **Security:** Always authenticate users before sending sensitive notifications
- **Testing:** Use the broadcast endpoint to test without authentication

## 🤝 Need Help?

If you encounter issues:

1. Check the browser console for errors
2. Check the backend server logs
3. Review the troubleshooting section
4. Check that all environment variables are set correctly

Happy coding! 🚀
