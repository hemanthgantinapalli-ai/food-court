export default function Footer() {
  return (
    <footer className="bg-secondary text-gray-400 py-20 px-6 border-t border-gray-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="col-span-1 md:col-span-1">
          <h3 className="text-white text-3xl font-black mb-6 tracking-tighter">FoodCourt.</h3>
          <p className="text-sm leading-relaxed">
            Revolutionizing how you eat. From your favorite local joints to five-star dining, delivered with style.
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Company</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li className="hover:text-primary cursor-pointer transition">Experience</li>
            <li className="hover:text-primary cursor-pointer transition">Our Story</li>
            <li className="hover:text-primary cursor-pointer transition">Cuisines</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Support</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li className="hover:text-primary cursor-pointer transition">Help Center</li>
            <li className="hover:text-primary cursor-pointer transition">Safety</li>
            <li className="hover:text-primary cursor-pointer transition">Privacy</li>
          </ul>
        </div>

        <div className="bg-gray-800/50 p-6 rounded-3xl">
          <h4 className="text-white font-bold mb-2">Join the Newsletter</h4>
          <p className="text-xs mb-4">Get the best offers weekly.</p>
          <div className="flex gap-2">
            <input type="email" placeholder="Email" className="bg-gray-900 border-none rounded-xl text-xs flex-1 focus:ring-1 focus:ring-primary" />
            <button className="bg-primary text-white px-4 py-2 rounded-xl font-bold">Go</button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-gray-800 text-center text-xs">
        © 2024 FoodCourt Global. All rights reserved.
      </div>
    </footer>
  );
}