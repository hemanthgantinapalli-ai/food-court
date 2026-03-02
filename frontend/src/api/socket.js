import { io } from 'socket.io-client';

const SOCKET_URL = '/'; // Uses Vite proxy in dev; same origin in production

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
});

export const connectSocket = (userId) => {
    if (!socket.connected) {
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
        // If not connected yet, emit after connection
        socket.once('connect', () => {
            socket.emit('join_role', role);
        });
    }
};
