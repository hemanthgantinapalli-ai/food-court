import SupportRequest from '../models/SupportRequest.js';
import { getIO } from '../utils/socket.js';

export const createSupportRequest = async (req, res) => {
    try {
        const { subject, message, orderId, priority } = req.body;

        const request = await SupportRequest.create({
            user: req.userId,
            role: req.userRole,
            subject,
            message,
            order: orderId || null,
            priority: priority || 'medium'
        });

        // Notify admins via socket
        const io = getIO();
        io.to('admins').emit('new_support_request', {
            _id: request._id,
            subject: request.subject,
            role: request.role,
            userName: req.userName || 'A user' // assuming req has userName from auth middleware or fetch it
        });

        res.status(201).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSupportRequests = async (req, res) => {
    try {
        let query = {};
        if (req.userRole !== 'admin') {
            query.user = req.userId;
        }

        const requests = await SupportRequest.find(query)
            .populate('user', 'name email phone')
            .populate('order', 'orderId total createdAt')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateSupportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const request = await SupportRequest.findByIdAndUpdate(id, { status }, { new: true });

        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        // Notify user via socket
        const io = getIO();
        io.to(request.user.toString()).emit('support_update', {
            id: request._id,
            status: request.status,
            message: `Your support request status has been updated to: ${status}`
        });

        res.status(200).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
