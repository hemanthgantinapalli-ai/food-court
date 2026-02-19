const Hero = () => (
  <div className="relative h-[500px] flex items-center justify-center overflow-hidden">
    <img 
      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920&q=80" 
      alt="Delicious Food"
      className="absolute inset-0 w-full h-full object-cover brightness-[0.4]"
    />
    <div className="relative z-10 text-center px-4">
      <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6">
        Premium Taste, <span className="text-orange-400">Delivered.</span>
      </h1>
      <p className="text-gray-200 text-xl mb-8 max-w-2xl mx-auto">
        Discover the best restaurants and fresh groceries in your area, delivered straight to your door.
      </p>
      <div className="flex flex-col md:flex-row gap-4 justify-center">
        <input 
          type="text" 
          placeholder="Enter your delivery address..." 
          className="px-6 py-4 rounded-full w-full md:w-96 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold transition-all transform hover:scale-105">
          Find Food
        </button>
      </div>
    </div>
  </div>
);