export default function OrderHistoryPage() {
  const orders = [
    { id: '#FC-9921', date: 'Feb 18, 2026', status: 'Delivered', total: 24.50 },
    { id: '#FC-8810', date: 'Feb 15, 2026', status: 'Pending', total: 12.00 },
  ];

  return (
    <div className="max-w-4xl mx-auto p-md">
      <h1 className="text-2xl font-bold mb-md">My Orders</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white p-sm rounded-lg shadow-sm border flex justify-between items-center">
            <div>
              <p className="font-bold">{order.id}</p>
              <p className="text-sm text-gray-500">{order.date}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">${order.total}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {order.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}