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

        // Join a personal room (by userId)
        socket.on('join', (userId) => {
            socket.join(userId);
            console.log(`👤 User ${userId} joined their personal room.`);
        });

        // Join a role-based room: 'admins' or 'riders'
        socket.on('join_role', (role) => {
            socket.join(role);
            console.log(`🎭 Socket ${socket.id} joined role room: ${role}`);
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
