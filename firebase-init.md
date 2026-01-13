# Firebase Setup Instructions

## 1. Deploy Security Rules

Deploy the Firestore and Storage security rules to your Firebase project:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Firestore
# - Storage
# - Use existing project: saaszapa

# Deploy rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## 2. Initialize Default Data

You need to manually create the following collections and documents in Firestore:

### Roles Collection
Create documents in `roles` collection:

1. **Administrator**
   - name: "Administrator"
   - description: "Full system access"
   - permissions: ["all"]

2. **Manager**
   - name: "Manager"
   - description: "Store management and reporting"
   - permissions: ["sales", "inventory", "products", "reports", "cash_control"]

3. **Cashier**
   - name: "Cashier"
   - description: "Point of sale operations"
   - permissions: ["sales", "customers"]

### Sizes Collection
Create documents with these sizes: 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46

Each document should have:
- name: (size number as string)
- sort_order: (size number as integer)
- active: true

### Colors Collection
Create documents with common shoe colors:
- Black (#000000)
- White (#FFFFFF)
- Brown (#8B4513)
- Beige (#F5F5DC)
- Navy (#000080)
- Gray (#808080)

Each document should have:
- name: (color name)
- hex_code: (hex color code)
- active: true

### Cash Registers Collection
Create at least one cash register:
- name: "Main Register"
- location: "Front Counter"
- active: true

## 3. Important Notes

### Data Model Differences
Firestore is a document database, not relational like Supabase/PostgreSQL. Key differences:

1. **No foreign key constraints** - You must maintain data integrity in application code
2. **No joins** - You need to denormalize data or make multiple queries
3. **No transactions across collections** - Limited transaction support
4. **No SQL queries** - Use Firestore queries which are more limited

### Required Code Changes
Due to Firestore limitations, you'll need to:

1. **Denormalize data** - Store related data in the same document when possible
2. **Handle joins manually** - Make multiple queries and combine results in code
3. **Implement data integrity checks** - Add validation since there are no foreign keys
4. **Adjust complex queries** - Simplify or split into multiple queries
5. **Manage inventory carefully** - Use transactions for inventory updates to prevent race conditions

### Performance Considerations
- Use subcollections for one-to-many relationships
- Index fields that you query frequently
- Denormalize read-heavy data to avoid multiple queries
- Use batch writes for multiple document updates
- Consider using Cloud Functions for complex operations

## 4. Migration from Supabase

If you're migrating from Supabase, you'll need to:

1. Export all data from Supabase
2. Transform the data to fit Firestore's document model
3. Import data using Firebase Admin SDK or batch writes
4. Test thoroughly as the query patterns are different

## 5. Deploy to Firebase Hosting (Optional)

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```
