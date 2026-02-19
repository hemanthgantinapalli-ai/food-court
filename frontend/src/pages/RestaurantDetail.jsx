import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api/axios';
import MenuItemCard from '../components/MenuItemCard';

export default function RestaurantDetail() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await API.get(`/restaurants/${id}`);
        const payload = res.data.data;
        setRestaurant(payload.restaurant || payload);
        setMenu(payload.menu || []);
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!restaurant) return <div className="text-center py-20">Restaurant not found.</div>;

  return (
    <div className="container-custom py-10">
      <div className="relative h-64 w-full mb-8">
        <img
          src={restaurant.image || 'https://via.placeholder.com/800x400'}
          alt={restaurant.name}
          className="w-full h-full object-cover rounded-xl"
        />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold">{restaurant.name}</h1>
          <p className="text-gray-500 text-lg mt-2">{restaurant.cuisines?.join(' • ')} | {restaurant.location?.city}</p>
          <div className="flex items-center mt-4">
            <span className="bg-green-600 text-white px-2 py-1 rounded text-sm font-bold">⭐ {restaurant.rating}</span>
            <span className="ml-3 text-gray-400">({restaurant.reviewCount || 0} reviews)</span>
          </div>
        </div>

        <div className="bg-gray-100 p-6 rounded-lg mt-6 md:mt-0 w-full md:w-1/3">
          <h3 className="font-bold text-lg mb-2">Delivery Info</h3>
          <p>🕒 Time: {restaurant.deliveryTime || 30} mins</p>
          <p>💰 Fee: ₹{restaurant.deliveryFee || 50}</p>
          <p>📍 {restaurant.location?.address}</p>
        </div>
      </div>

      <hr className="my-10" />

      <h2 className="text-2xl font-bold mb-6">Menu</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menu && menu.length > 0 ? (
          menu.map((mi) => <MenuItemCard key={mi._id} item={mi} restaurantId={restaurant._id} />)
        ) : (
          <p className="text-gray-500 italic">No menu items available.</p>
        )}
      </div>
    </div>
  );
}