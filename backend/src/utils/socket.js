import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Rider from '../models/Rider.js';
import Order from '../models/Order.js';

let io;

/**
 * In-memory store for online riders currently reporting GPS.
 * Key: userId (string)
 * Value: { location: {lat, lng}, heading, speed, lastUpdated: Date }
 */
const onlineRiderLocations = new Map();

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Configure per-environment in production
            methods: ['GET', 'POST'],
        },
    });

    // ─── JWT AUTHENTICATION MIDDLEWARE ─────────────────────────────────────────
    // Every connecting socket MUST supply a valid JWT in socket.handshake.auth.token
    // If no token is present, the connection is still allowed but socket.userId/role
    // will be undefined (guests — e.g. customer tracking pages in anonymous mode).
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            // Allow unauthenticated connections (read-only tracking guests)
            socket.isAuthenticated = false;
            return next();
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId    = decoded.id;
            socket.userRole  = decoded.role;
            socket.isAuthenticated = true;
            console.log(`🔐 JWT verified for socket ${socket.id} — role: ${decoded.role}`);
            next();
        } catch (err) {
            console.error(`🚫 Invalid JWT for socket ${socket.id}:`, err.message);
            // Reject with an error so the client can handle it gracefully
            next(new Error('INVALID_TOKEN'));
        }
    });
    // ────────────────────────────────────────────────────────────────────────────

    io.on('connection', (socket) => {
        console.log(`🔌 New client connected: ${socket.id} (auth: ${socket.isAuthenticated})`);

        // Join a personal room (by userId) — used for targeted notifications
        socket.on('join', (userId) => {
            socket.join(userId);
            console.log(`👤 User ${userId} joined personal room.`);
        });

        // Join a specific order room for tracking updates
        socket.on('join_order', (orderId) => {
            socket.join(`order_${orderId}`);
            console.log(`📦 Socket ${socket.id} joined order room: order_${orderId}`);
        });

        // ─── LIVE LOCATION UPDATE (Rider → Server → Customer + Admin) ──────────
        socket.on('update_location', async (data) => {
            if (!data) {
                console.error('❌ Null/undefined payload in update_location');
                return;
            }

            const { orderId, location, riderId, heading, speed } = data;

            // 🔐 SECURITY: If the socket is authenticated as a rider, verify they
            // are the rider assigned to this specific order before broadcasting.
            if (socket.isAuthenticated && socket.userRole === 'rider' && orderId) {
                try {
                    const order = await Order.findOne({
                        _id: orderId,
                        rider: socket.userId,
                    }).lean();

                    if (!order) {
                        socket.emit('tracking_error', {
                            message: 'Unauthorized: You are not the rider for this order.',
                            orderId,
                        });
                        console.warn(`🚫 Rider ${socket.userId} rejected — not assigned to order ${orderId}`);
                        return;
                    }
                } catch (err) {
                    console.error('Order ownership check failed:', err);
                    return;
                }
            }

            // 1. Persist rider's last-known location to DB + in-memory fleet map
            if (riderId && location?.lat !== undefined && location?.lng !== undefined) {
                try {
                    await Rider.findOneAndUpdate(
                        { user: riderId },
                        {
                            currentLocation: { latitude: location.lat, longitude: location.lng },
                            lastLocationUpdate: new Date(),
                        }
                    );

                    onlineRiderLocations.set(riderId.toString(), {
                        latitude:  location.lat,
                        longitude: location.lng,
                        heading:   heading ?? 0,
                        speed:     speed   ?? 0,
                        updatedAt: new Date(),
                    });

                    // Broadcast to ALL admins for the bird's-eye fleet map
                    io.to('admins').emit('rider_position_update', {
                        riderId,
                        location,
                        heading: heading ?? 0,
                        speed:   speed   ?? 0,
                    });
                } catch (err) {
                    console.error('Error persisting rider location:', err.message);
                }
            }

            // 2. Broadcast to the specific order room (only the customer sees this)
            if (orderId && location) {
                try {
                    await Order.findByIdAndUpdate(orderId, {
                        'liveTracking.lastLatitude':  location.lat,
                        'liveTracking.lastLongitude': location.lng,
                        'liveTracking.currentSpeed':  speed   ?? 0,
                        'liveTracking.bearing':       heading ?? 0,
                    });
                } catch (err) {
                    console.error('Error persisting order liveTracking:', err.message);
                }

                io.to(`order_${orderId}`).emit('rider_location_updated', {
                    orderId,
                    location,
                    heading,
                    speed,
                    timestamp: new Date(),
                });
            }
        });
        // ────────────────────────────────────────────────────────────────────────

        // Rider announces they went online (sends initial GPS so admin map lights up)
        socket.on('rider_online', (data) => {
            if (!data) return;
            const { riderId, location } = data;
            if (riderId && location?.lat !== undefined && location?.lng !== undefined) {
                onlineRiderLocations.set(riderId.toString(), {
                    latitude:  location.lat,
                    longitude: location.lng,
                    heading:   0,
                    speed:     0,
                    updatedAt: new Date(),
                });
                io.to('admins').emit('rider_came_online', { riderId, location });
                console.log(`🛵 Rider ${riderId} came online.`);
            }
        });

        // Rider goes offline — remove from fleet map
        socket.on('rider_offline', (riderId) => {
            if (riderId) {
                onlineRiderLocations.delete(riderId.toString());
                io.to('admins').emit('rider_went_offline', { riderId });
                console.log(`👋 Rider ${riderId} went offline.`);
            }
        });

        // Join a role-based broadcast room ('admins' or 'riders')
        socket.on('join_role', (role) => {
            socket.join(role);
            console.log(`🎭 Socket ${socket.id} joined role room: ${role}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Disconnected: ${socket.id}`);
        });
    });

    return io;
};

// ─── Utility Exports ────────────────────────────────────────────────────────
export const getOnlineRiderLocations = () => onlineRiderLocations;

export const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

export const emitToUser    = (userId, event, data) => io?.to(userId).emit(event, data);
export const emitToAdmins  = (event,  data)         => io?.to('admins').emit(event, data);
export const emitToRiders  = (event,  data)         => io?.to('riders').emit(event, data);
export const emitToOrder   = (orderId, event, data) => io?.to(`order_${orderId}`).emit(event, data);

