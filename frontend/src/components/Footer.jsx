import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, Mail, MapPin, ArrowRight, CheckCircle, X } from 'lucide-react';

function NewsletterToast({ onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-start gap-3 bg-green-500 text-white px-5 py-4 rounded-2xl shadow-2xl animate-fade-up max-w-xs">
      <CheckCircle size={20} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-black text-sm">You're subscribed! 🎉</p>
        <p className="text-green-100 text-xs mt-0.5">Exclusive offers will land in your inbox soon.</p>
      </div>
      <button onClick={onClose} className="text-white/70 hover:text-white transition-colors shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}

export default function Footer() {
  const [email, setEmail] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubscribe = () => {
    const trimmed = email.trim();
    if (!trimmed) { setEmailError('Please enter your email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailError('Enter a valid email address.'); return; }
    setEmailError('');
    setEmail('');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <>
      {showToast && <NewsletterToast onClose={() => setShowToast(false)} />}

      <footer className="bg-slate-950 text-slate-300 pt-20 pb-8 px-6 border-t border-slate-900">
        <div className="max-w-7xl mx-auto">

          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 pb-16 border-b border-slate-800">

            {/* Brand + Newsletter */}
            <div className="lg:col-span-2 space-y-6">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-black">FC</span>
                </div>
                <span className="text-2xl font-black text-white tracking-tight">
                  Food<span className="text-orange-500">Court</span>
                </span>
              </Link>

              <p className="text-slate-400 leading-relaxed font-medium max-w-sm">
                Redefining food delivery through culinary excellence and seamless technology.
                Fresh, fast, and flavorful — every single time.
              </p>

              {/* Social Icons */}
              <div className="flex gap-4">
                {[
                  { Icon: Instagram, href: '#', color: 'hover:bg-pink-600' },
                  { Icon: Facebook, href: '#', color: 'hover:bg-blue-600' },
                  { Icon: Twitter, href: '#', color: 'hover:bg-sky-500' },
                  { Icon: Youtube, href: '#', color: 'hover:bg-red-600' },
                ].map(({ Icon, href, color }, i) => (
                  <a
                    key={i}
                    href={href}
                    className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all ${color}`}
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>

              {/* Newsletter */}
              <div className="mt-2">
                <h5 className="text-white font-black mb-1">Get exclusive offers 🎁</h5>
                <p className="text-slate-500 text-xs font-medium mb-3">Subscribe to get deals, coupons and early access.</p>
                <div className={`flex gap-2 p-1 bg-slate-900 border rounded-2xl focus-within:border-orange-500 transition-all ${emailError ? 'border-red-500' : 'border-slate-800'}`}>
                  <input
                    id="newsletter-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                    className="flex-1 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 outline-none"
                  />
                  <button
                    id="newsletter-subscribe-btn"
                    onClick={handleSubscribe}
                    className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-2.5 rounded-xl hover:scale-105 transition-all shadow-lg"
                    title="Subscribe"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
                {emailError && <p className="text-red-400 text-xs mt-1.5 font-bold">{emailError}</p>}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6">Company</h4>
              <ul className="space-y-3">
                {['About Us', 'Careers', 'Blog', 'Press', 'Partner with Us'].map((link, idx) => (
                  <li key={idx}>
                    <Link to="#" className="text-slate-400 hover:text-orange-400 transition-colors font-medium text-sm">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6">Support</h4>
              <ul className="space-y-3">
                {['Help Center', 'Track Order', 'Refunds', 'Report Issue', 'Accessibility'].map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link === 'Track Order' ? '/track-order' : '#'}
                      className="text-slate-400 hover:text-orange-400 transition-colors font-medium text-sm"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6">Contact</h4>
              <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-start gap-3 text-sm font-medium text-slate-400">
                  <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <span>42 Gourmet Street, Mumbai 400001</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
                  <Mail size={16} className="text-orange-500 shrink-0" />
                  <span>hello@foodcourt.in</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <div className="flex-1 bg-slate-800/50 rounded-2xl py-3 px-1 text-center border border-slate-700">
                    <p className="text-white font-black text-xs">24/7</p>
                    <p className="text-slate-500 text-[9px] font-bold uppercase">Help</p>
                  </div>
                  <div className="flex-1 bg-slate-800/50 rounded-2xl py-3 px-1 text-center border border-slate-700">
                    <p className="text-orange-500 font-black text-xs">4.9★</p>
                    <p className="text-slate-500 text-[9px] font-bold uppercase">App</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* App Badges */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 py-10 border-b border-slate-800">
            <div>
              <p className="text-white font-black text-lg">Experience more on mobile</p>
              <p className="text-slate-500 font-bold text-sm">Download the FoodCourt app for exclusive rewards</p>
            </div>
            <div className="flex gap-4">
              <button className="flex items-center gap-3 bg-white text-slate-950 px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all shadow-xl">
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center"><span className="text-white text-[10px]">🍎</span></div>
                App Store
              </button>
              <button className="flex items-center gap-3 bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-700 transition-all border border-slate-700 shadow-xl">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-[10px]">🤖</span></div>
                Play Store
              </button>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-10 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            <p>© 2026 FOODCOURT LIFESTYLE PVT LTD.</p>
            <div className="flex gap-8">
              {['Privacy', 'Terms', 'Cookies'].map((text, idx) => (
                <Link key={idx} to="#" className="hover:text-orange-500 transition-colors">{text}</Link>
              ))}
            </div>
          </div>

        </div>
      </footer>
    </>
  );
}