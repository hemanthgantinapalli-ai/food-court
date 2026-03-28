
// Push the 3 new coupons to Atlas
const newCoupons = [
  {
    code: "WELCOME20",
    description: "Welcome Offer! 20% off on your first order",
    discountType: "percentage",
    discountValue: 20,
    maxDiscount: 100,
    minOrderValue: 199,
    applicableOn: "all",
    usageLimit: 1000,
    usageCount: 0,
    perUserLimit: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: "TENALI30",
    description: "Tenali Special! Flat 30% off on orders above ₹400",
    discountType: "percentage",
    discountValue: 30,
    maxDiscount: 150,
    minOrderValue: 400,
    applicableOn: "all",
    usageLimit: 500,
    usageCount: 0,
    perUserLimit: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: "FLAT100",
    description: "Flat ₹100 off on orders above ₹599",
    discountType: "fixed",
    discountValue: 100,
    minOrderValue: 599,
    applicableOn: "all",
    usageLimit: 300,
    usageCount: 0,
    perUserLimit: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

newCoupons.forEach(c => {
  const exists = db.coupons.findOne({ code: c.code });
  if (!exists) {
    db.coupons.insertOne(c);
    console.log("Added coupon: " + c.code);
  } else {
    console.log("Already exists: " + c.code);
  }
});
console.log("Total coupons in Atlas:", db.coupons.countDocuments());
