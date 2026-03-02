import { io } from 'socket.io-client';

const SOCKET_URL = '/'; // Assuming proxy is set or it's on the same origin in production

export const socket = io(SOCKET_URL, {
    autoConnect: false,
});

export const connectSocket = (userId) => {
    if (!socket.connected) {
        socket.connect();
        socket.emit('join', userId);
    }
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};
