import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Edit2, LogOut } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import Toast from '../components/Toast';
import { useAuthStore } from '../context/authStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, getProfile, updateProfile } = useAuthStore();
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState('info');
  const [formData, setFormData] = React.useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile(formData);
      setToastMessage('Profile updated successfully!');
      setToastType('success');
      setEditing(false);
    } catch (error) {
      setToastMessage('Failed to update profile');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={() => navigate('/signin')}
          className="bg-primary text-white px-8 py-3 rounded-lg font-bold"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <Header />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-8 text-white mb-8">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-primary text-3xl font-bold">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-white text-opacity-80">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Personal Information</h2>
            <button
              onClick={() => setEditing(!editing)}
              className="text-primary font-semibold flex items-center gap-2 hover:underline"
            >
              <Edit2 size={18} /> {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-secondary transition disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <div className="flex items-center gap-2 text-lg">
                  <Mail size={20} className="text-primary" />
                  {user.email}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <div className="flex items-center gap-2 text-lg">
                  <Phone size={20} className="text-primary" />
                  {user.phone}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Addresses */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6">Saved Addresses</h2>
          {user.addresses && user.addresses.length > 0 ? (
            <div className="space-y-3">
              {user.addresses.map((address, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                  <MapPin size={20} className="text-primary mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold">{address.label}</p>
                    <p className="text-sm text-gray-600">
                      {address.street}, {address.city}, {address.state} {address.zipCode}
                    </p>
                  </div>
                  {address.isDefault && (
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No addresses saved yet</p>
          )}
          <button className="mt-4 text-primary font-semibold hover:underline text-sm">
            + Add New Address
          </button>
        </div>

        {/* Wallet */}
        {user.wallet && (
          <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-white">
            <h3 className="text-lg font-bold mb-2">Wallet Balance</h3>
            <p className="text-4xl font-bold">₹{user.wallet.balance || 0}</p>
            <p className="text-sm text-white text-opacity-80 mt-2">
              Add money to your wallet for faster checkout
            </p>
          </div>
        )}
      </div>

      <Footer />

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  );
}
