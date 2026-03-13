import { Server } from 'socket.io';
import Rider from '../models/Rider.js';
import Order from '../models/Order.js';

let io;

/**
 * In-memory store for online riders currently reporting GPS.
 * Key: userId (string)
 * Value: { location: {lat, lng}, lastUpdated: Date }
 */
const onlineRiderLocations = new Map();

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

        // Join a specific order room for tracking
        socket.on('join_order', (orderId) => {
            socket.join(`order_${orderId}`);
            console.log(`📦 Socket ${socket.id} joined tracking room for order: ${orderId}`);
        });

        // Live Tracking: Rider sends location
        socket.on('update_location', async (data) => {
            if (!data) {
                console.error('❌ Received null/undefined data in update_location');
                return;
            }
            const { orderId, location, riderId, heading, speed } = data;
            
            // 1. Persist to DB periodically (socket.js handles the broadcasting)
            if (riderId && location && location.lat !== undefined && location.lng !== undefined) {
                try {
                    await Rider.findOneAndUpdate(
                        { user: riderId },
                        { 
                            currentLocation: { latitude: location.lat, longitude: location.lng },
                            lastLocationUpdate: new Date()
                        }
                    );
                    
                    // Update in-memory store for admin fast-access
                    onlineRiderLocations.set(riderId.toString(), {
                        latitude: location.lat,
                        longitude: location.lng,
                        heading: heading || 0,
                        speed: speed || 0,
                        updatedAt: new Date()
                    });

                    // Broadcast to admins for the fleet map
                    io.to('admins').emit('rider_position_update', {
                        riderId,
                        location, // {lat, lng} used by frontend
                        heading: heading || 0,
                        speed: speed || 0
                    });
                } catch (err) {
                    console.error('Error persisting rider location:', err);
                }
            }

            // 2. Broadcast to specific order tracking room (Customer)
            if (orderId) {
                // Also update the Order document for persistence
                try {
                    await Order.findByIdAndUpdate(orderId, {
                        'liveTracking.lastLatitude': location.lat,
                        'liveTracking.lastLongitude': location.lng,
                        'liveTracking.currentSpeed': speed || 0,
                        'liveTracking.bearing': heading || 0,
                    });
                } catch (err) {
                    console.error('Error updating order tracking persist:', err);
                }

                io.to(`order_${orderId}`).emit('rider_location_updated', {
                    orderId,
                    location,
                    heading,
                    speed,
                    timestamp: new Date()
                });
            }
        });

        // Rider goes online via socket
        socket.on('rider_online', (data) => {
            if (!data) return;
            const { riderId, location } = data;
            if (riderId && location && location.lat !== undefined && location.lng !== undefined) {
                onlineRiderLocations.set(riderId.toString(), {
                    latitude: location.lat,
                    longitude: location.lng,
                    updatedAt: new Date()
                });
                io.to('admins').emit('rider_came_online', { riderId, location });
                console.log(`🛵 Rider ${riderId} is now online and reporting GPS.`);
            } else if (riderId) {
                console.log(`⚠️ Rider ${riderId} attempted to go online without valid location.`);
            }
        });

        // Rider goes offline via socket
        socket.on('rider_offline', (riderId) => {
            if (riderId) {
                onlineRiderLocations.delete(riderId.toString());
                io.to('admins').emit('rider_went_offline', { riderId });
                console.log(`👋 Rider ${riderId} went offline.`);
            }
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

// --- Exports ---
export const getOnlineRiderLocations = () => onlineRiderLocations;

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
        io.to('admins').emit(event, data);
    }
};

export const emitToRiders = (event, data) => {
    if (io) {
        io.to('riders').emit(event, data);
    }
};

