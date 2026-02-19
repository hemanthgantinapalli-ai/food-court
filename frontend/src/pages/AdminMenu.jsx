import React, { useEffect, useState } from 'react';
import API from '../api/axios';

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', description: '', restaurantId: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await API.get('/menu');
      setItems(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/menu/${editingId}`, { ...form, price: parseFloat(form.price) });
      } else {
        await API.post('/menu', { ...form, price: parseFloat(form.price) });
      }
      setForm({ name: '', price: '', description: '', restaurantId: '' });
      setEditingId(null);
      fetchItems();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <form onSubmit={submit} className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Item' : 'Add New Menu Item'}</h2>
        <input className="border p-2 w-full mb-4" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input className="border p-2 w-full mb-4" placeholder="Price" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
        <textarea className="border p-2 w-full mb-4" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <button className="bg-[#ff4f00] text-white px-6 py-2 rounded font-bold">Save Item</button>
      </form>
      
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Current Menu</h2>
        {items.map(item => (
          <div key={item._id} className="flex justify-between items-center border-b py-3">
            <div><p className="font-bold">{item.name}</p><p className="text-sm">₹{item.price}</p></div>
            <button onClick={() => {setForm(item); setEditingId(item._id);}} className="text-blue-500 font-bold">Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}