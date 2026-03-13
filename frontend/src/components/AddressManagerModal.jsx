import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Home, Briefcase, Tag } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const pinIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
  iconSize: [38, 38], iconAnchor: [19, 38]
});

// A component that updates the marker when the user clicks on the map
function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? <Marker position={position} icon={pinIcon} /> : null;
}

export default function AddressManagerModal({ isOpen, onClose, existingAddress = null, indexToEdit = null }) {
  const { user, updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    label: 'Home',
    street: '',
    area: '',
    city: '',
    zipCode: '',
    lat: null,
    lng: null
  });

  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (existingAddress) {
        setForm({
          label: existingAddress.label || 'Home',
          street: existingAddress.street || '',
          area: existingAddress.area || '',
          city: existingAddress.city || '',
          zipCode: existingAddress.zipCode || '',
          lat: existingAddress.lat || null,
          lng: existingAddress.lng || null
        });
        if (existingAddress.lat && existingAddress.lng) {
          setPosition({ lat: existingAddress.lat, lng: existingAddress.lng });
        } else {
          setPosition(null);
        }
      } else {
        setForm({ label: 'Home', street: '', area: '', city: 'Hyderabad', zipCode: '', lat: null, lng: null });
        setPosition(null);
      }
    }
  }, [isOpen, existingAddress]);

  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(coords);
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.street || !form.city || !form.zipCode) return alert('Please fill all required fields');

    setLoading(true);
    try {
      const addressData = {
        ...form,
        lat: position?.lat || null,
        lng: position?.lng || null
      };

      let updatedAddresses = [...(user?.addresses || [])];
      
      if (indexToEdit !== null && indexToEdit >= 0) {
        updatedAddresses[indexToEdit] = addressData;
      } else {
        updatedAddresses.push(addressData);
      }

      await updateProfile({ addresses: updatedAddresses });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-6 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        <button onClick={onClose} className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-slate-500 hover:text-orange-600 hover:bg-white shadow-sm transition-all">
          <X size={20} />
        </button>

        {/* Left Side: Map Picker */}
        <div className="md:w-1/2 relative bg-slate-100 min-h-[300px] md:min-h-full">
          {isOpen && (
             <MapContainer 
              center={position || [17.3850, 78.4867]} // Default Hyderabad
              zoom={position ? 15 : 11} 
              className="w-full h-full absolute inset-0 z-0"
              zoomControl={false}
             >
               <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
               <LocationPicker position={position} setPosition={setPosition} />
             </MapContainer>
          )}

          {/* Map Overlay Helpers */}
          <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2">
            <MapPin size={16} className="text-orange-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Pin your location</p>
          </div>

          <button 
            type="button"
            onClick={handleLocateMe}
            className="absolute bottom-6 right-6 z-10 bg-white p-4 rounded-2xl shadow-xl hover:bg-slate-50 transition-all text-slate-700 hover:text-orange-600 group"
          >
            <Navigation size={24} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Right Side: Form Details */}
        <div className="md:w-1/2 p-8 md:p-12 bg-white flex flex-col">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              {indexToEdit !== null ? 'Edit Address' : 'Add New Address'}
            </h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
              Tap on map to pin exact location and fill details
            </p>
          </div>

          <form onSubmit={handleSave} className="flex-1 space-y-6 flex flex-col justify-between">
             <div className="space-y-5">
               
               {/* Address Taging */}
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Save as</label>
                  <div className="flex gap-3">
                    {['Home', 'Work', 'Other'].map(tag => (
                       <button
                         key={tag}
                         type="button"
                         onClick={() => setForm({ ...form, label: tag })}
                         className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${form.label === tag ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}
                       >
                         {tag === 'Home' ? <Home size={14} /> : tag === 'Work' ? <Briefcase size={14} /> : <Tag size={14} />}
                         {tag}
                       </button>
                    ))}
                  </div>
               </div>

               {form.label === 'Other' && (
                 <div>
                   <input 
                     type="text" 
                     placeholder="Custom Label (e.g., Friend's House)"
                     value={form.customLabel || ''}
                     onChange={e => setForm({ ...form, customLabel: e.target.value })}
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all text-sm"
                   />
                 </div>
               )}

               {/* Exact Address Fields */}
               <div>
                 <textarea 
                   rows={2}
                   required
                   placeholder="Flat / House No. / Building Name / Street"
                   value={form.street}
                   onChange={e => setForm({ ...form, street: e.target.value })}
                   className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all text-sm resize-none mb-3"
                 />
                 <input 
                   type="text" 
                   required
                   placeholder="Area / Locality / Sector"
                   value={form.area}
                   onChange={e => setForm({ ...form, area: e.target.value })}
                   className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all text-sm mb-3"
                 />
                 
                 <div className="flex gap-3">
                    <input 
                      type="text" 
                      required
                      placeholder="City"
                      value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })}
                      className="w-1/2 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all text-sm"
                    />
                    <input 
                      type="text" 
                      required
                      placeholder="PIN Code"
                      value={form.zipCode}
                      onChange={e => setForm({ ...form, zipCode: e.target.value })}
                      className="w-1/2 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all text-sm"
                    />
                 </div>
               </div>
             </div>

             <button 
               type="submit" 
               disabled={loading}
               className="w-full mt-8 bg-slate-900 text-white font-black py-5 rounded-2xl text-xs uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
             >
               {loading ? 'Saving...' : 'Save Detailed Address'}
             </button>
          </form>

        </div>
      </div>
    </div>
  );
}
