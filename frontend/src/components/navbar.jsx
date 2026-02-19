import { ShoppingCart, User, Search } from 'lucide-react';

const Navbar = () => (
  <nav className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
    <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
      FoodCourt
    </div>
    <div className="hidden md:flex space-x-8 font-medium text-gray-600">
      <a href="#" className="hover:text-orange-500 transition-colors">Restaurants</a>
      <a href="#" className="hover:text-orange-500 transition-colors">Groceries</a>
      <a href="#" className="hover:text-orange-500 transition-colors">Offers</a>
    </div>
    <div className="flex items-center space-x-5 text-gray-700">
      <Search className="w-5 h-5 cursor-pointer hover:text-orange-500" />
      <div className="relative">
        <ShoppingCart className="w-5 h-5 cursor-pointer hover:text-orange-500" />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full px-1.5">3</span>
      </div>
      <User className="w-5 h-5 cursor-pointer hover:text-orange-500" />
    </div>
  </nav>
);