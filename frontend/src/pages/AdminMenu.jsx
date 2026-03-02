import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, DollarSign, AlignLeft, Info, Building, Loader2, Image as ImageIcon, BookOpen } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';

export default function AdminMenu() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(searchParams.get('restaurantId') || '');
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Mains',
    image: '',
    recipe: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRestaurants();
    }
  }, [user]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchMenuItems();
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const response = await API.get('/admin/restaurants');
      const data = response.data.data;
      setRestaurants(data);

      const queryId = searchParams.get('restaurantId');
      if (queryId) {
        setSelectedRestaurant(queryId);
      } else if (data.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await API.get('/menu', {
        params: { restaurantId: selectedRestaurant }
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
      const payload = {
        ...form,
        price: parseFloat(form.price),
        restaurantId: selectedRestaurant
      };

      if (editingId) {
        const response = await API.put(`/menu/${editingId}`, payload);
        setItems(items.map(i => i._id === editingId ? response.data.data : i));
      } else {
        const response = await API.post('/menu', payload);
        setItems([response.data.data, ...items]);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save menu item:', error);
      alert(error.response?.data?.message || 'Failed to save item');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      price: '',
      description: '',
      category: 'Mains',
      image: '',
      recipe: ''
    });
    setEditingId(null);
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
      <div className="p-6 max-w-7xl mx-auto py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Menu <span className="text-orange-500">Management</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2">Manage restaurant menus, descriptions, and recipes.</p>
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

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Form */}
          <div className="lg:col-span-4">
            <form onSubmit={submit} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 lg:sticky lg:top-24">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                {editingId ? <Edit2 className="text-blue-500" /> : <Plus className="text-orange-500" />}
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Item Name</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800"
                      placeholder="e.g. Masala Dosa"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Price (₹)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800"
                        placeholder="0" type="number"
                        value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Category</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="Starters">Starters</option>
                      <option value="Mains">Mains</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Pizza">Pizza</option>
                      <option value="Pasta">Pasta</option>
                      <option value="Sushi">Sushi</option>
                      <option value="Groceries">Groceries</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Recipe Picture URL</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800 shadow-inner"
                      placeholder="https://image-url.com/dish.jpg"
                      value={form.image}
                      onChange={e => setForm({ ...form, image: e.target.value })}
                    />
                  </div>
                  {form.image && (
                    <div className="mt-3 animate-in fade-in zoom-in duration-300">
                      <div className="w-full h-32 rounded-2xl overflow-hidden border-2 border-orange-100 shadow-md">
                        <img src={form.image} alt="Dish Preview" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Public Description</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-4 top-4 text-slate-400" size={16} />
                    <textarea
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800 min-h-[80px] resize-none shadow-inner"
                      placeholder="Show on menu..."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block text-indigo-600">Preparation Recipe (Internal)</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-4 text-slate-400" size={16} />
                    <textarea
                      className="w-full bg-indigo-50/30 border border-indigo-100/50 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium text-slate-800 min-h-[100px] resize-none"
                      placeholder="Steps for kitchen staff..."
                      value={form.recipe}
                      onChange={e => setForm({ ...form, recipe: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {formLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : (editingId ? 'Update' : 'Add Item')}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Menu List */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Current Offerings</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manage visibility and pricing</p>
                </div>
                {loading && <Loader2 className="animate-spin text-orange-500" size={24} />}
              </div>

              <div className="divide-y divide-slate-50">
                {!loading && items.length === 0 ? (
                  <div className="py-24 text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                      <Info className="text-slate-200" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter">Kitchen is empty</h3>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Start by adding your first signature dish</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item._id} className="p-8 flex flex-col md:flex-row justify-between md:items-center gap-8 hover:bg-slate-50/30 transition-all group">
                      <div className="flex gap-6 items-start">
                        <div className="w-24 h-24 bg-slate-100 rounded-3xl overflow-hidden border border-slate-100 shadow-inner shrink-0 flex items-center justify-center text-slate-300">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <ImageIcon size={32} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-black text-xl text-slate-900 tracking-tight">{item.name}</h3>
                            <span className="bg-orange-50 text-orange-600 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-orange-100">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-slate-500 font-medium text-sm max-w-sm leading-relaxed mb-3">{item.description || 'No description provided.'}</p>
                          {item.recipe && (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50/50 px-3 py-1.5 rounded-xl w-fit">
                              <BookOpen size={12} /> Recipe Attached
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-8 shrink-0 justify-between md:justify-end">
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Price</p>
                          <p className="text-2xl font-black text-slate-900">₹{item.price}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setForm({
                                name: item.name,
                                price: item.price.toString(),
                                description: item.description || '',
                                category: item.category || 'mains',
                                image: item.image || '',
                                recipe: item.recipe || ''
                              });
                              setEditingId(item._id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-3.5 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 transition-all shadow-sm"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => deleteItem(item._id)}
                            className="p-3.5 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all shadow-sm"
                          >
                            <Trash2 size={20} />
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
