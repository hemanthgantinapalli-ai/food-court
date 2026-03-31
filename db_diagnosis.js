print("Orphan count: " + db.menuitems.countDocuments({$or: [{restaurant: null}, {restaurant: {$exists: false}}]}));
print("Total restaurants: " + db.restaurants.countDocuments());
print("Total items: " + db.menuitems.countDocuments());
