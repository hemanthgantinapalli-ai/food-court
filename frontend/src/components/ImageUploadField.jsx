import React, { useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import API from '../api/axios';
import { getAssetURL } from '../utils/imageHandler';

/**
 * ImageUploadField - A reusable and premium image upload component
 * 
 * @param {string} label - The label for the field
 * @param {string} value - The current image URL
 * @param {function} onChange - Callback function when image is uploaded or cleared
 * @param {object} icon - Lucide icon component to show
 * @param {boolean} required - Whether the field is required
 * @param {string} hint - Hint text shown when no image is selected
 * @param {boolean} previewCircle - Whether to show the preview as a circle (for profile icons)
 */
export default function ImageUploadField({
    label,
    value,
    onChange,
    icon: Icon = ImageIcon,
    required = false,
    hint = '',
    previewCircle = false
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await API.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                // Prepend backend URL if it's a relative path
                // Since our API is relative, /uploads/... will work if handled by the same server
                onChange(response.data.url);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const clearImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange('');
    };

    const id = `upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

    // Helper to get full URL
    const getFullImageUrl = (url) => {
        return getAssetURL(url);
    };

    const displayUrl = getFullImageUrl(value);

    return (
        <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                {label}{required && <span className="text-rose-500 ml-1">*</span>}
            </label>

            <div className="relative group">
                <input
                    type="file"
                    id={id}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                />

                <label
                    htmlFor={id}
                    className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer bg-white
                        ${value ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 hover:border-orange-200 hover:bg-orange-50/10'}
                        ${uploading ? 'opacity-50 cursor-wait' : ''}
                    `}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 
                        ${value ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500'}
                    `}>
                        {uploading ? <Loader2 size={24} className="animate-spin" /> : <Icon size={24} />}
                    </div>

                    <div className="grow min-w-0">
                        <p className={`text-sm font-black truncate ${value ? 'text-emerald-700' : 'text-slate-600 group-hover:text-orange-600'}`}>
                            {value ? '✓ Image Selected' : uploading ? 'Uploading...' : 'Click to Upload Image'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {value ? 'Click to change' : hint || 'PNG, JPG or WebP up to 5MB'}
                        </p>
                    </div>

                    {value && (
                        <button
                            onClick={clearImage}
                            className="p-2 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 rounded-xl transition-all shadow-sm"
                        >
                            <X size={16} />
                        </button>
                    )}
                </label>

                {error && (
                    <p className="mt-1.5 text-[10px] text-rose-500 font-bold uppercase tracking-widest animate-shake">
                        ⚠ {error}
                    </p>
                )}
            </div>

            {value && (
                <div className={`mt-3 animate-in fade-in zoom-in duration-300 ${previewCircle ? 'w-24 h-24 mx-auto' : 'w-full'}`}>
                    <div className={`relative overflow-hidden border-2 border-white shadow-lg bg-slate-100 ${previewCircle ? 'rounded-full h-full' : 'rounded-[2rem] h-48'}`}>
                        <img
                            src={displayUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                console.error('Image load error', e.target.src);
                                // If base64 fails or local fails, show fallback
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                </div>
            )}
        </div>
    );
}
