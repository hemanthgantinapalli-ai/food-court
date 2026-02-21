import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, DollarSign, AlignLeft, Info } from 'lucide-react';
import { useAuthStore } from '../context/authStore';

export default function AdminMenu() {
  const { user } = useAuthStore();
  const [items, setItems] = useState([
    { _id: '1', name: 'Margherita Pizza', price: 299, description: 'Classic cheese and tomato base.' },
    { _id: '2', name: 'Veggie Burger', price: 149, description: 'Crispy patty with fresh veggies.' },
    { _id: '3', name: 'Chicken Biryani', price: 350, description: 'Aromatic basmati rice with tender chicken.' },
  ]);
  const [form, setForm] = useState({ name: '', price: '', description: '' });
  const [editingId, setEditingId] = useState(null);

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

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return alert("Name and price are required");

    if (editingId) {
      setItems(items.map(i => i._id === editingId ? { ...i, ...form, price: parseFloat(form.price) } : i));
    } else {
      setItems([{ _id: Date.now().toString(), ...form, price: parseFloat(form.price) }, ...items]);
    }
    setForm({ name: '', price: '', description: '' });
    setEditingId(null);
  };

  const deleteItem = (id) => {
    setItems(items.filter(i => i._id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="p-6 max-w-6xl mx-auto py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Menu <span className="text-orange-500">Management</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">Add, edit, or remove items from your restaurant menu.</p>
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
                    <input className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium text-slate-800 placeholder-slate-400" placeholder="0.00" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                  </div>
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
                <button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center gap-2">
                  {editingId ? <><Edit2 size={18} /> Update Item</> : <><Plus size={18} /> Add Item</>}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', price: '', description: '' }); }} className="px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Menu List */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900">Current Menu Offerings</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <div className="p-16 text-center">
                    <Info className="mx-auto text-slate-300 mb-6" size={56} />
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No items found</h3>
                    <p className="text-slate-500 font-medium text-lg">Start adding items to build your menu.</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item._id} className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between sm:items-center gap-6 hover:bg-slate-50/50 transition-colors group">
                      <div>
                        <h3 className="font-bold text-xl text-slate-900">{item.name}</h3>
                        <p className="text-slate-500 font-medium text-sm mt-1.5 max-w-md leading-relaxed">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-2xl font-black text-orange-500">₹{item.price}</div>
                        <div className="flex gap-2">
                          <button onClick={() => { setForm(item); setEditingId(item._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium opacity-100 sm:opacity-0 group-hover:opacity-100">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => deleteItem(item._id)} className="p-3 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors font-medium opacity-100 sm:opacity-0 group-hover:opacity-100">
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