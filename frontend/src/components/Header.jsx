import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Search, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../context/authStore';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const items = useCartStore((state) => state.items);
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  const isHomePage = location.pathname === '/';

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 px-6 ${isScrolled || !isHomePage
        ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100 py-4'
        : 'bg-transparent py-6'
        }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <span className="text-white font-black text-sm">FC</span>
          </div>
          <span className={`text-xl font-black tracking-tight ${isScrolled || !isHomePage ? 'text-slate-900' : 'text-white'}`}>
            Food<span className="text-orange-500">Court</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Restaurants', to: '/' },
            { label: 'Offers', to: '/offers' },
            { label: 'Track Order', to: '/track-order' },
          ].map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className={`text-sm font-bold transition-colors ${isScrolled || !isHomePage
                ? 'text-slate-500 hover:text-orange-600'
                : 'text-white/70 hover:text-white'
                }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">

          {/* Search Toggle */}
          <button
            id="search-toggle-btn"
            onClick={() => setSearchOpen(!searchOpen)}
            className={`p-2.5 rounded-xl transition-all ${isScrolled || !isHomePage
              ? 'text-slate-500 hover:bg-slate-100 hover:text-orange-600'
              : 'text-white/70 hover:text-white'
              }`}
          >
            <Search size={20} />
          </button>

          {/* Cart */}
          <Link
            id="cart-header-btn"
            to="/cart"
            className={`relative p-2.5 rounded-xl transition-all ${isScrolled || !isHomePage
              ? 'bg-slate-50 border border-slate-100 text-slate-700 hover:border-orange-400 hover:text-orange-600'
              : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
              }`}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          {user ? (
            <div className="relative hidden md:block">
              <button
                id="user-menu-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm hover:opacity-90 transition-all"
              >
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center font-black text-xs">
                  {user.name?.[0]?.toUpperCase() || user.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <span>{user.name?.split(' ')[0] || user.firstName || 'Me'}</span>
                <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                  <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                    <User size={16} /> My Profile
                  </Link>
                  <Link to="/orders" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                    <ShoppingBag size={16} /> My Orders
                  </Link>
                  <div className="border-t border-slate-100" />
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              id="signin-header-btn"
              to="/signin"
              className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-orange-200"
            >
              <User size={16} />
              Sign In
            </Link>
          )}

          {/* Mobile Hamburger */}
          <button
            id="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2.5 rounded-xl transition-colors ${isScrolled || !isHomePage ? 'text-slate-700 hover:bg-slate-100' : 'text-white'
              }`}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Search Expanded */}
      {searchOpen && (
        <div className="max-w-7xl mx-auto mt-3 px-0 animate-fade-up">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="global-search-input"
              type="text"
              placeholder="Search restaurants, cuisines, dishes..."
              autoFocus
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-orange-200 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 font-medium text-slate-900"
            />
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-2xl border-t border-slate-100 p-6 space-y-4 animate-fade-up z-50">
          {[
            { label: 'Restaurants', to: '/' },
            { label: 'Offers', to: '/offers' },
            { label: 'Track Order', to: '/track-order' },
          ].map(({ label, to }) => (
            <Link key={label} to={to} className="block font-bold text-slate-700 hover:text-orange-600 py-2 border-b border-slate-50 transition-colors">
              {label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/profile" className="block font-bold text-slate-700 hover:text-orange-600 py-2">My Profile</Link>
              <button onClick={() => { logout(); navigate('/'); }} className="w-full text-left font-bold text-rose-500 py-2">Sign Out</button>
            </>
          ) : (
            <Link to="/signin" className="block w-full text-center bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl">
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}