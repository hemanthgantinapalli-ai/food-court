import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import { useAuthStore } from '../context/authStore'; // Ensure this path is correct!

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Note: Mocking signIn if store isn't set up yet
  // const signIn = useAuthStore((s) => s.signIn);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // await signIn({ email, password });
      console.log("Logged in with:", email);
      navigate('/'); // Go back to landing page on success
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F9FB]">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-orange-100 p-12 border border-gray-50">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-gray-400 mt-3 font-medium">Continue your flavor journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
              placeholder="chef@foodcourt.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Password</label>
            <input 
              type="password" 
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-600 transform active:scale-[0.98] transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-10 text-center text-gray-500 font-medium">
          New to the club? {' '}
          <Link to="/signup" className="text-orange-500 font-bold hover:underline">Join now</Link>
        </p>
      </div>
    </div>
  );
}