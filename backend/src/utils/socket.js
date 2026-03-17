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

        // ─── LIVE RIDER LOCATION UPDATE (Rider → Server → Customer + Admin) ──────────
        socket.on('riderLocation', async (data) => {
            if (!data) return;

            const { orderId, lat, lng, heading, speed } = data;

            // 🔐 SECURITY: ONLY riders can update their location
            if (!socket.isAuthenticated || socket.userRole !== 'rider') {
                console.warn(`🚫 Unauthorized location update attempt from socket ${socket.id}`);
                return;
            }

            try {
                // 1. Persist rider's last-known location and online status to DB (Rider Profile)
                const riderLat = Number(lat);
                const riderLng = Number(lng);
                
                await Rider.findOneAndUpdate(
                    { user: socket.userId },
                    {
                        currentLocation: { latitude: riderLat, longitude: riderLng },
                        isOnline: true, // Sync status as online
                        lastLocationUpdate: new Date(),
                    },
                    { upsert: true } // Create profile if missing
                );

                onlineRiderLocations.set(socket.userId.toString(), {
                    latitude:  riderLat,
                    longitude: riderLng,
                    heading:   Number(heading) || 0,
                    speed:     Number(speed)   || 0,
                    updatedAt: new Date(),
                });

                // Broadcast to ALL admins for the bird's-eye fleet map
                io.to('admins').emit('rider_position_update', {
                    riderId: socket.userId,
                    location: { lat: riderLat, lng: riderLng },
                    heading: Number(heading) || 0,
                    speed:   Number(speed)   || 0,
                });
            } catch (err) {
                console.error('Error persisting rider location profile:', err.message);
            }

            // 2. Broadcast to the specific order room (only the customer sees this)
            if (orderId) {
                try {
                    await Order.findByIdAndUpdate(orderId, {
                        riderLocation: { 
                            lat, 
                            lng, 
                            bearing: heading ?? 0, 
                            speed: speed ?? 0,
                            lastUpdated: new Date()
                        }
                    });

                    io.to(`order_${orderId}`).emit('updateRiderLocation', {
                        orderId,
                        lat,
                        lng,
                        heading,
                        speed,
                        timestamp: new Date(),
                    });
                } catch (err) {
                    console.error('Error persisting order riderLocation:', err.message);
                }
            }
        });
        // ────────────────────────────────────────────────────────────────────────

        // Rider announces they went online (sends initial GPS so admin map lights up)
        socket.on('rider_online', async (data) => {
            if (!data) return;
            const { riderId, location } = data;
            if (riderId && location?.lat !== undefined && location?.lng !== undefined) {
                const latNum = Number(location.lat);
                const lngNum = Number(location.lng);

                // 🔄 Sync Online Status and Location to Database
                try {
                    await Rider.findOneAndUpdate(
                        { user: riderId },
                        { 
                            isOnline: true, 
                            currentLocation: { latitude: latNum, longitude: lngNum },
                            lastLocationUpdate: new Date()
                        },
                        { upsert: true }
                    );
                    
                    onlineRiderLocations.set(riderId.toString(), {
                        latitude:  latNum,
                        longitude: lngNum,
                        heading:   0,
                        speed:     0,
                        updatedAt: new Date(),
                    });
                    
                    io.to('admins').emit('rider_came_online', { riderId, location: { lat: latNum, lng: lngNum } });
                    console.log(`🛵 Rider ${riderId} status synced: ONLINE`);
                } catch (err) {
                    console.error('Failed to sync rider online status:', err.message);
                }
            }
        });

        // Rider goes offline — remove from fleet map
        socket.on('rider_offline', async (riderId) => {
            if (riderId) {
                try {
                    // 🔄 Sync Offline Status to Database
                    await Rider.findOneAndUpdate({ user: riderId }, { isOnline: false });
                    
                    onlineRiderLocations.delete(riderId.toString());
                    io.to('admins').emit('rider_went_offline', { riderId });
                    console.log(`👋 Rider ${riderId} status synced: OFFLINE`);
                } catch (err) {
                    console.error('Failed to sync rider offline status:', err.message);
                }
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

