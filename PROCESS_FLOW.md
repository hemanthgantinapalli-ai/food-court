# 📋 Food Court Process Flow

This document outlines the end-to-end lifecycle of the Food Court application.

---

### 🔐 AUTHENTICATION & ACCESS FLOW
1. **Landing**: User lands on the Home page.
2. **Sign In/Up**: User chooses to Sign In or Create an Account.
3. **Role Selection**: During signup, the system distinguishes between **Customer**, **Rider**, and **Restaurant Admin**.
4. **Dashboard Redirection**: 
   - Customers go to the **Home/Browse** page.
   - Riders are locked into the **Delivery Center**.
   - Restaurant owners go to the **Kitchen Command**.
   - System Admins access the **Master Console**.

> **👉 Telugu:**
> User app open చేసి Login లేదా Signup అవుతారు. వాళ్ళ Role ని బట్టి (Customer, Rider, or Restaurant) వాళ్ళకి కావాల్సిన Dashboard కనిపిస్తుంది.

---

### 👤 USER (CUSTOMER) FLOW
1. **Browse**: User opens the restaurant app.
2. **Explore**: User browses the menu of one restaurant only.
3. **Select**: User selects food items and adds them to **Cart**.
4. **Data Sync**: Cart data is temporarily stored in the database.
5. **Checkout**: User goes to Checkout page.
6. **Information Entry**: User enters Delivery address and Payment method (UPI / Card / Cash on Delivery).
7. **Place Order**: User clicks **Place Order**.
8. **Backend Sync**: Backend creates a new order with status `placed`.
9. **Tracking**: User sees “Order placed successfully” and the Order tracking screen opens.

> **👉 Telugu:**
> User menu చూసి items cart లో add చేసి, address & payment select చేసి order place చేస్తాడు. అప్పుడు Order Tracking screen కనిపిస్తుంది.

---

### 🏪 RESTAURANT (DASHBOARD) FLOW
1. **Login**: Restaurant staff logs into Restaurant Dashboard.
2. **Monitoring**: Dashboard shows all new orders with status `placed`.
3. **Decision**: Restaurant can:
   - **Accept order**: Status changes to `confirmed`.
   - **Reject order**: (If item unavailable) Status changes to `cancelled`.
4. **Kitchen Flow**:
   - If accepted: Order status changes to `preparing` while cooking.
   - Food ready: Status changes to `ready`.
5. **Assignment**: Order becomes visible to riders in the Marketplace.

> **👉 Telugu:**
> Restaurant వాళ్లు order accept చేసి, cook చేసి, ready చేస్తారు. ఒకవేళ items లేకపోతే Reject చేస్తారు. Food ready అయినప్పుడు అది automatic గా Riders కి కనిపిస్తుంది.

---

### 🍱 MENU MANAGEMENT FLOW
1. **Admin Access**: Admin or Restaurant Owner goes to the **Menu Management** section.
2. **Add Item**: Clicks on "Add New Item".
3. **Details**: Enters Item Name, Price, Category (Veg/Non-Veg), and Description.
4. **Visibility**: Once saved, the item immediately appears on the Customer's restaurant menu.

> **👉 Telugu:**
> Admin లేదా Restaurant Owner కొత్త food items ని add చేయవచ్చు. Save చేసిన వెంటనే ఆ items Customers కి మెనూ లో కనిపిస్తాయి.

---

### 🛵 RIDER (DELIVERY) FLOW
1. **Online Status**: Rider logs in and switches status to **Online**.
2. **Marketplace Explorer**: Rider opens Marketplace.
3. **Claim Task**: Rider sees orders with status `ready` and no rider assigned.
4. **Acceptance**: Rider clicks **Accept**. Rider ID is linked to that order.
5. **Pickup**: Rider reaches restaurant and clicks **Pickup**.
   - Status → `picked_up`.
   - Customer gets notification: “Out for delivery”.
6. **Destination**: Rider delivers food and clicks **Deliver**.
7. **Completion**:
   - Order status → `delivered`.
   - Order moves to rider history.
   - Rider earnings update.

> **👉 Telugu:**
> Rider online వచ్చి, Marketplace లో ఉన్న orders ని Accept చేస్తాడు. Restaurant దగ్గర Pickup కొట్టి, Customer కి food ఇచ్చాక Deliver అని క్లిక్ చేస్తాడు. అప్పుడు వాళ్ళ Earnings update అవుతాయి.

---

### 👑 ADMIN FLOW
- **Access**: Global access to all orders and riders.
- **Analytics**: Real-time monitoring of earnings and restaurant performance.
- **Support**: Ability to override statuses or manually assign riders.
