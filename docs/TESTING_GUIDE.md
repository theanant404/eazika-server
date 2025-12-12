# 🧪 Testing the Push Notification System

This guide provides comprehensive testing instructions for the Socket.IO push notification system.

## Prerequisites

- Backend server running on `http://localhost:8000`
- Frontend running on `http://localhost:3000`
- Valid authentication token (if testing authenticated endpoints)

## 🔍 Test Checklist

### Basic Connection Tests

- [ ] Socket connects successfully
- [ ] Socket authenticates automatically
- [ ] Connection status shows as "Connected"
- [ ] Disconnect/reconnect works properly

### Notification Delivery Tests

- [ ] Broadcast notifications work
- [ ] User-specific notifications work
- [ ] Role-based notifications work
- [ ] Room-based notifications work
- [ ] Order status notifications work

### UI Tests

- [ ] NotificationCenter displays correctly
- [ ] Unread count updates correctly
- [ ] Toast notifications appear
- [ ] Mark as read functionality works
- [ ] Clear notification functionality works
- [ ] Clear all notifications works

## 🚀 Test Scenarios

### Test 1: Basic Connection

**Steps:**

1. Start backend: `cd eazika-server && npm run dev`
2. Start frontend: `cd eazika-client && npm run dev`
3. Open browser to `http://localhost:3000`
4. Open browser console (F12)

**Expected Results:**

```
Socket connected: [some-socket-id]
Socket authenticated: { success: true }
```

**Verify:**

- NotificationCenter bell icon shows green indicator
- No errors in console

---

### Test 2: Broadcast Notification

**Purpose:** Test sending notifications to all connected clients

**Method 1: Using curl**

```bash
curl -X POST http://localhost:8000/api/v2/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "message": "🎉 Test broadcast notification!",
    "type": "success"
  }'
```

**Method 2: Using the Example Page**

1. Navigate to `http://localhost:3000/examples/notifications`
2. Enter a message in the "Send Custom Notification" section
3. Click "Send"

**Expected Results:**

- Toast notification appears in bottom-right
- NotificationCenter badge shows "1"
- Opening NotificationCenter shows the notification
- Notification has correct message and type

---

### Test 3: User-Specific Notification

**Purpose:** Test sending notifications to a specific user

**Setup:**

1. Get a valid user ID from your database or localStorage
2. Make sure user is logged in

**Request:**

```bash
curl -X POST http://localhost:8000/api/v2/notifications/send-to-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "userId": "USER_ID_HERE",
    "message": "This is a personal notification!",
    "type": "info",
    "data": {
      "customField": "customValue"
    }
  }'
```

**Expected Results:**

- Only the specified user receives the notification
- Other users don't receive it
- Notification includes custom data

---

### Test 4: Role-Based Notification

**Purpose:** Test sending notifications to all users with a specific role

**Request:**

```bash
curl -X POST http://localhost:8000/api/v2/notifications/send-to-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "role": "admin",
    "message": "Admin-only notification",
    "type": "warning"
  }'
```

**Expected Results:**

- All users with role "admin" receive the notification
- Users with other roles don't receive it

---

### Test 5: Room-Based Notification

**Purpose:** Test sending notifications to a specific room

**Setup:**
First, join a room from the frontend:

```typescript
// In browser console
const socket = window.io("http://localhost:8000");
socket.emit("join_room", "test-room-123");
```

**Request:**

```bash
curl -X POST http://localhost:8000/api/v2/notifications/send-to-room \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "roomId": "test-room-123",
    "message": "Room notification",
    "type": "info"
  }'
```

**Expected Results:**

- Only users in "test-room-123" receive the notification

---

### Test 6: Order Status Notification

**Purpose:** Test order-specific notifications

**Request:**

```bash
curl -X POST http://localhost:8000/api/v2/notifications/order-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "userId": "USER_ID_HERE",
    "orderId": "ORDER-123",
    "status": "shipped",
    "message": "Your order has been shipped!"
  }'
```

**Expected Results:**

- User receives both "notification" and "order_update" events
- Notification includes order data (orderId, status)
- Toast shows order number in description

---

### Test 7: Reconnection Test

**Purpose:** Test automatic reconnection

**Steps:**

1. Open browser with socket connected
2. Stop the backend server: `Ctrl+C`
3. Observe NotificationCenter - should show red indicator (disconnected)
4. Restart backend: `npm run dev`
5. Wait a few seconds

**Expected Results:**

- Socket automatically reconnects
- Indicator turns green
- Console shows new connection message
- User is re-authenticated automatically

---

### Test 8: Multiple Clients Test

**Purpose:** Test notifications across multiple browser tabs/windows

**Steps:**

1. Open `http://localhost:3000` in 2-3 different tabs
2. Send a broadcast notification
3. Observe all tabs

**Expected Results:**

- All tabs receive the notification
- All tabs show unread badge
- Each tab can mark as read independently

---

### Test 9: Notification UI Test

**Purpose:** Test NotificationCenter UI functionality

**Steps:**

1. Send 5-10 test notifications
2. Click the bell icon to open NotificationCenter
3. Test each action:
   - Click "Mark as read" on individual notification
   - Click "✓" icon to mark all as read
   - Click "Clear all" button
   - Click "X" on individual notification

**Expected Results:**

- Unread count decreases when marking as read
- All notifications disappear when clearing
- UI updates immediately
- No console errors

---

### Test 10: Toast Notification Test

**Purpose:** Test different notification types and their toast appearance

**Send notifications with different types:**

```bash
# Success
curl -X POST http://localhost:8000/api/v2/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message": "Success!", "type": "success"}'

# Error
curl -X POST http://localhost:8000/api/v2/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message": "Error!", "type": "error"}'

# Warning
curl -X POST http://localhost:8000/api/v2/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message": "Warning!", "type": "warning"}'

# Info
curl -X POST http://localhost:8000/api/v2/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message": "Info!", "type": "info"}'
```

**Expected Results:**

- Each type shows different color in toast
- Icons match the type
- Toast auto-dismisses after a few seconds

---

## 🔧 Programmatic Testing

### Backend Integration Test

Create a test file: `eazika-server/src/test-notifications.ts`

```typescript
import { emitToUser, emitToRole, emitToAll } from "./config/socket.config";

// Test broadcasting
export function testBroadcast() {
  emitToAll("notification", {
    message: "Test broadcast from code",
    type: "info",
    timestamp: new Date().toISOString(),
  });
}

// Test user notification
export function testUserNotification(userId: string) {
  emitToUser(userId, "notification", {
    message: `Test notification for user ${userId}`,
    type: "success",
    timestamp: new Date().toISOString(),
  });
}

// Test role notification
export function testRoleNotification(role: string) {
  emitToRole(role, "notification", {
    message: `Test notification for role ${role}`,
    type: "warning",
    timestamp: new Date().toISOString(),
  });
}
```

---

### Frontend Component Test

Create a test component: `eazika-client/app/test-notifications/page.tsx`

```tsx
"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { useSocket } from "@/contexts/SocketContext";

export default function NotificationTestPage() {
  const { notifications, unreadCount } = useNotifications();
  const { isConnected, emit } = useSocket();

  return (
    <div className="p-8">
      <h1>Notification Test Page</h1>

      <div>
        <h2>Status</h2>
        <p>Connected: {isConnected ? "Yes" : "No"}</p>
        <p>Total Notifications: {notifications.length}</p>
        <p>Unread: {unreadCount}</p>
      </div>

      <div>
        <h2>Actions</h2>
        <button onClick={() => emit("join_room", "test-room")}>
          Join Test Room
        </button>
      </div>

      <div>
        <h2>Recent Notifications</h2>
        {notifications.slice(0, 5).map((n) => (
          <div key={n.id}>
            <p>
              {n.message} - {n.type}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📊 Performance Testing

### Load Test with Multiple Connections

Use a tool like `socket.io-client` in a Node.js script:

```javascript
// test-load.js
const io = require("socket.io-client");

const NUM_CLIENTS = 100;
const clients = [];

for (let i = 0; i < NUM_CLIENTS; i++) {
  const socket = io("http://localhost:8000");

  socket.on("connect", () => {
    console.log(`Client ${i} connected`);
    socket.emit("authenticate", {
      userId: `test-user-${i}`,
      role: "customer",
    });
  });

  socket.on("notification", (data) => {
    console.log(`Client ${i} received:`, data.message);
  });

  clients.push(socket);
}

// Send a broadcast after all connected
setTimeout(() => {
  console.log("Sending test broadcast...");
  // Use your API to send a broadcast notification
}, 5000);
```

Run: `node test-load.js`

---

## 🐛 Common Issues & Solutions

### Issue: Socket not connecting

**Check:**

```bash
# Test backend health
curl http://localhost:8000/health

# Check if port is in use
lsof -i :8000

# Check browser console for CORS errors
```

### Issue: Notifications not appearing

**Debug steps:**

```javascript
// In browser console
const socket = window.io("http://localhost:8000");

socket.on("connect", () => console.log("Connected"));
socket.on("notification", (data) => console.log("Notification:", data));
socket.on("error", (err) => console.error("Error:", err));
```

### Issue: Authentication failing

**Check:**

```javascript
// In browser console
console.log(localStorage.getItem("user"));

// Should show user object with id and role
```

---

## ✅ Test Results Template

Use this template to document your test results:

```
# Test Results - [Date]

## Environment
- Backend URL: http://localhost:8000
- Frontend URL: http://localhost:3000
- Node Version: [version]
- Browser: [browser + version]

## Test Results

### Connection Tests
- [ ] Basic connection: PASS/FAIL
- [ ] Authentication: PASS/FAIL
- [ ] Reconnection: PASS/FAIL

### Notification Delivery
- [ ] Broadcast: PASS/FAIL
- [ ] User-specific: PASS/FAIL
- [ ] Role-based: PASS/FAIL
- [ ] Room-based: PASS/FAIL
- [ ] Order status: PASS/FAIL

### UI Tests
- [ ] NotificationCenter: PASS/FAIL
- [ ] Toast notifications: PASS/FAIL
- [ ] Mark as read: PASS/FAIL
- [ ] Clear notifications: PASS/FAIL

## Issues Found
[List any issues discovered]

## Notes
[Additional observations]
```

---

## 🎯 Automated Testing (Future Enhancement)

Consider adding:

- Jest unit tests for utility functions
- React Testing Library for components
- Cypress/Playwright for E2E tests
- Socket.IO testing utilities

Example Jest test:

```typescript
import { emitToUser } from "../src/config/socket.config";

jest.mock("../src/config/socket.config");

describe("Notification System", () => {
  it("should emit notification to user", () => {
    emitToUser("user123", "notification", { message: "test" });
    expect(emitToUser).toHaveBeenCalledWith(
      "user123",
      "notification",
      expect.objectContaining({ message: "test" })
    );
  });
});
```

---

## 📝 Testing Summary

After completing all tests, you should have verified:

- ✅ Real-time bidirectional communication
- ✅ All notification types working
- ✅ UI components functioning correctly
- ✅ Error handling and reconnection
- ✅ Multiple client support
- ✅ Authentication flow

Happy testing! 🚀
