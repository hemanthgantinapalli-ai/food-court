import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, DollarSign, AlignLeft, Info, Building, Loader2 } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';

export default function AdminMenu() {
  const { user } = useAuthStore();
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', description: '', category: 'mains' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRestaurants();
    }
  }, [user]);

  useEffect(() => {
    fetchMenuItems();
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const response = await API.get('/admin/restaurants');
      setRestaurants(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedRestaurant(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await API.get('/menu', {
        params: selectedRestaurant ? { restaurantId: selectedRestaurant } : {}
      });
      setItems(response.data.data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <div className="text-center bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 max-w-sm w-full mx-4 font-sans">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500 font-medium">You do not have permission to manage the menu.</p>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return alert("Name and price are required");
    if (!selectedRestaurant) return alert("Please select a restaurant first");

    setFormLoading(true);
    try {
      if (editingId) {
        const response = await API.put(`/menu/${editingId}`, {
          ...form,
          price: parseFloat(form.price)
        });
        setItems(items.map(i => i._id === editingId ? response.data.data : i));
      } else {
        const response = await API.post('/menu', {
          ...form,
          price: parseFloat(form.price),
          restaurantId: selectedRestaurant
        });
        setItems([response.data.data, ...items]);
      }
      setForm({ name: '', price: '', description: '', category: 'mains' });
      setEditingId(null);
    } catch (error) {
      console.error('Failed to save menu item:', error);
      alert(error.response?.data?.message || 'Failed to save item');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await API.delete(`/menu/${id}`);
      setItems(items.filter(i => i._id !== id));
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="p-6 max-w-6xl mx-auto py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Menu <span className="text-orange-500">Management</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2">Add, edit, or remove items from your restaurant menu.</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 min-w-[300px]">
            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <Building size={20} />
            </div>
            <div className="grow">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Select Restaurant</label>
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="w-full bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {restaurants.map(r => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-1">
            <form onSubmit={submit} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 md:sticky md:top-24">
              <h2 className="text-2xl font-black mb-6">{editingId ? 'Edit Item' : 'Add New Item'}</h2>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Item Name</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800 placeholder-slate-400" placeholder="e.g. Garlic Bread" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Price (₹)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800 placeholder-slate-400" placeholder="0.00" type="number" step="1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="appetizers">Appetizers</option>
                    <option value="mains">Mains</option>
                    <option value="desserts">Desserts</option>
                    <option value="beverages">Beverages</option>
                    <option value="groceries">Groceries</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-4 top-4 text-slate-400" size={18} />
                    <textarea className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800 placeholder-slate-400 min-h-[120px] resize-none" placeholder="Brief details about the item..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? <Loader2 className="animate-spin" size={20} /> : editingId ? <><Edit2 size={18} /> Update</> : <><Plus size={18} /> Add Item</>}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', price: '', description: '', category: 'mains' }); }} className="px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Menu List */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900">Current Menu Offerings</h2>
                {loading && <Loader2 className="animate-spin text-orange-500" size={24} />}
              </div>
              <div className="divide-y divide-slate-100">
                {!loading && items.length === 0 ? (
                  <div className="p-16 text-center">
                    <Info className="mx-auto text-slate-300 mb-6" size={56} />
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No items found</h3>
                    <p className="text-slate-500 font-medium text-lg">Start adding items for this restaurant.</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item._id} className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between sm:items-center gap-6 hover:bg-slate-50/50 transition-colors group">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="font-bold text-xl text-slate-900">{item.name}</h3>
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">{item.category}</span>
                        </div>
                        <p className="text-slate-500 font-medium text-sm max-w-md leading-relaxed">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-2xl font-black text-orange-500">₹{item.price}</div>
                        <div className="flex gap-2">
                          <button onClick={() => { setForm({ name: item.name, price: item.price, description: item.description || '', category: item.category || 'mains' }); setEditingId(item._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => deleteItem(item._id)} className="p-3 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors font-medium">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
