import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // For development, allow all origins
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log(`🔌 New client connected: ${socket.id}`);

        socket.on('join', (userId) => {
            socket.join(userId);
            console.log(`👤 User ${userId} joined their room.`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

export const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(userId).emit(event, data);
    }
};

export const emitToAdmins = (event, data) => {
    if (io) {
        // For simplicity, we can have an "admins" room
        io.to('admins').emit(event, data);
    }
};

export const emitToRiders = (event, data) => {
    if (io) {
        // For simplicity, we can have a "riders" room
        io.to('riders').emit(event, data);
    }
};
