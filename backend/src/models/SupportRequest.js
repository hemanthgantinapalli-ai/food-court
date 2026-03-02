import mongoose from 'mongoose';

const supportRequestSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        role: {
            type: String,
            enum: ['customer', 'rider', 'restaurant'],
            required: true,
        },
        subject: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: false,
        },
        status: {
            type: String,
            enum: ['open', 'pending', 'resolved', 'closed'],
            default: 'open',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
    },
    {
        timestamps: true,
    }
);

const SupportRequest = mongoose.model('SupportRequest', supportRequestSchema);
export default SupportRequest;
