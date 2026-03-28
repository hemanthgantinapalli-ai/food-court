
// add_her_data.js
const owners = [
  { name: 'Restaurant Partner', email: 'partner@foodcourt.com', role: 'restaurant' },
  { name: 'Rishi', email: 'praneethgantinapalli5@gmail.com', role: 'restaurant' },
  { name: 'Bobby', email: 'bobby@gmail.com', role: 'restaurant' },
  { name: 'FoodCourt Admin', email: 'admin@foodcourt.com', role: 'admin' },
  { name: 'santosh', email: 'hemanthgantinapalli@gmail.com', role: 'rider' }
];

owners.forEach(u => {
    db.users.updateOne({ email: u.email }, { $set: u }, { upsert: true });
});

const adminId = db.users.findOne({ role: 'admin' })._id;
const pId = db.users.findOne({ email: 'partner@foodcourt.com' })._id;
const rId = db.users.findOne({ email: 'praneethgantinapalli5@gmail.com' })._id;
const bId = db.users.findOne({ email: 'bobby@gmail.com' })._id;

const herRest = [
  {
    name: 'Food Court Central Kitchen (Tenali)',
    owner: pId,
    location: { city: 'Tenali', address: 'Tenali Center' },
    isApproved: true,
    isOpen: true,
    rating: 4.5
  },
  {
    name: 'KFC',
    owner: rId,
    location: { city: 'Tenali', address: 'Tenali Market' },
    isApproved: true,
    isOpen: true,
    rating: 4.5
  },
  {
    name: 'The Pan Indian Food',
    owner: bId,
    location: { city: 'Tenali', address: 'Tenali South' },
    isApproved: true,
    isOpen: true,
    rating: 4.5
  }
];

herRest.forEach(r => {
    db.restaurants.updateOne({ name: r.name }, { $set: r }, { upsert: true });
});

console.log("Restored your 3 restaurants and users.");
