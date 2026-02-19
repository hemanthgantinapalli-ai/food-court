import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Hero from '../components/Hero';
import RestaurantCard from '../components/RestaurantCard';
import Loader_Component from '../components/Loader';

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data } = await axios.get('/api/restaurants');
        setRestaurants(data);
      } catch (error) {
        console.error("Failed to fetch restaurants", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  if (loading) return <Loader_Component message="Finding the best kitchens..." />;

  return (
    <div className="bg-[#F8F9FB] min-h-screen pb-20">
      <Hero />
      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-slate-900">Popular Near You</h2>
            <div className="h-1 w-20 bg-orange-500 mt-2 rounded-full" />
          </div>
          <button className="bg-white border border-gray-200 px-6 py-2 rounded-full font-bold text-sm hover:shadow-md transition-all">
            See All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map(restaurant => (
            <RestaurantCard key={restaurant._id} restaurant={restaurant} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;