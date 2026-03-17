import { io } from 'socket.io-client';

const SOCKET_URL = '/'; // Uses Vite proxy in dev; same origin in production

// Helper: read the JWT stored by authStore on login/signup
const getStoredToken = () => localStorage.getItem('token') ?? null;

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    // auth is populated dynamically in connectSocket() below
});

/**
 * Connect and authenticate the socket with the user's JWT.
 * @param {string} userId - MongoDB user id (for joining the personal room)
 */
export const connectSocket = (userId) => {
    if (!userId) return; // Silent return during auth transitions
    if (!socket.connected) {
        // 🔐 Attach JWT so the server can verify identity on handshake
        const token = getStoredToken();
        if (token) {
            socket.auth = { token };
        }
        socket.connect();
        socket.emit('join', userId);
        console.log(`🔌 Socket connected for user: ${userId}`);
    }
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
        console.log('🔌 Socket disconnected.');
    }
};

// Join a role-based broadcast room ('riders' or 'admins')
export const joinRoleRoom = (role) => {
    if (socket.connected) {
        socket.emit('join_role', role);
    } else {
        socket.once('connect', () => socket.emit('join_role', role));
    }
};

// Join a specific order's room to receive live tracking updates
export const joinOrderRoom = (orderId) => {
    if (socket.connected) {
        socket.emit('join_order', orderId);
    } else {
        socket.once('connect', () => socket.emit('join_order', orderId));
    }
};

// Rider broadcasts their live GPS position to customer + admin
export const broadcastRiderLocation = (orderId, riderId, location, heading, speed) => {
    if (socket.connected) {
        socket.emit('riderLocation', { 
            orderId, 
            riderId, 
            lat: location.lat, 
            lng: location.lng, 
            heading, 
            speed 
        });
    }
};

// Rider announces they went online (sends GPS immediately so admin map updates)
export const notifyRiderOnline = (riderId, location) => {
    if (socket.connected) {
        socket.emit('rider_online', { riderId, location });
    }
};

// Rider announces they went offline
export const notifyRiderOffline = (riderId) => {
    if (socket.connected) {
        socket.emit('rider_offline', riderId);
    }
};

