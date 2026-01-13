# Firebase Migration Status

## Completed Migrations

### 1. Authentication (100% Complete)
- `src/contexts/AuthContext.tsx` - Fully migrated to Firebase Auth
- Uses Firebase email/password authentication
- User profiles stored in Firestore
- Roles and permissions working with Firestore

### 2. Core Infrastructure (100% Complete)
- `src/lib/firebase.ts` - Firebase configuration
- `src/lib/firestore.ts` - Helper functions for Firestore operations
- Removed Supabase dependencies from package.json
- Removed Supabase configuration files

### 3. Fully Migrated Components

#### CashRegister.tsx (100% Complete)
- Cash session management migrated to Firestore
- Opening and closing sessions working
- Session activity tracking functional
- Payment method tracking by session

#### Customers.tsx (100% Complete)
- Customer CRUD operations migrated
- Search functionality working
- Customer code generation

#### Promotions.tsx (100% Complete)
- Promotion CRUD operations migrated
- Toggle active/inactive functionality
- Priority-based ordering

## Components Requiring Migration

The following components still use Supabase and need to be migrated to Firestore. They have complex relational queries that require careful refactoring:

### 1. POS.tsx (Not Migrated)
**Complexity:** High
**Issues:**
- Complex product variant queries with nested relations (product, size, color, inventory)
- Sale processing with multiple related writes (sales, sale_items, payments, inventory updates, inventory_movements)
- Uses RPC function `generate_sale_number` which doesn't exist in Firestore
- Cart validation against inventory quantities
- Multiple payment methods processing

**Migration Strategy:**
- Replace nested queries with multiple Firestore queries
- Implement client-side sale number generation
- Use Firestore batch writes for atomic multi-document operations
- Create indexes for product variant queries

### 2. Products.tsx (Not Migrated)
**Complexity:** High
**Issues:**
- Product variant generation across sizes and colors
- Nested queries for variants with size, color, inventory relations
- Automatic inventory record creation for new variants
- SKU generation logic

**Migration Strategy:**
- Load related data (sizes, colors, inventory) in separate queries
- Use Firestore batch operations for variant generation
- Manually join data in client-side code

### 3. Inventory.tsx (Not Migrated)
**Complexity:** Medium-High
**Issues:**
- Product variant queries with nested product, size, color, inventory
- Inventory movements tracking
- Stock level calculations
- Low stock alerts across multiple variants

**Migration Strategy:**
- Replace nested queries with multiple Firestore queries
- Client-side filtering for low stock alerts
- Maintain movement history in separate subcollection

### 4. Returns.tsx (Not Migrated)
**Complexity:** High
**Issues:**
- Sale lookup with complex nested data (items, variants, products, sizes, colors, customers)
- Return processing with inventory restocking
- Uses RPC function `generate_return_number`
- Multi-step transaction (create return, return items, update inventory, create movements)

**Migration Strategy:**
- Implement client-side return number generation
- Use Firestore batch writes for atomic operations
- Load nested data through multiple queries
- Maintain data consistency through proper error handling

### 5. Reports.tsx (Not Migrated)
**Complexity:** Very High
**Issues:**
- Complex aggregation queries across sales, sale_items, payments
- Nested joins for product information
- Date range filtering
- Revenue and profit calculations requiring cost data from variants
- Top products and sales by user aggregations

**Migration Strategy:**
- **Problem:** Firestore has limited aggregation capabilities
- **Solutions:**
  1. Pre-compute aggregations using Cloud Functions
  2. Store denormalized daily/weekly/monthly totals
  3. Perform aggregations client-side (slower for large datasets)
  4. Consider using BigQuery for complex analytics

## Key Differences: Supabase vs Firebase

### Query Limitations
- **Supabase:** Supports SQL joins, complex queries, aggregations
- **Firestore:** No joins, limited querying, no aggregations

### Solutions for Firestore
1. **Denormalization:** Store duplicate data to avoid joins
2. **Multiple Queries:** Load related data separately and join client-side
3. **Batch Operations:** Use batch writes for atomic multi-document updates
4. **Subcollections:** Organize related data hierarchically
5. **Cloud Functions:** Offload complex operations to backend

### Data Modeling Changes Needed

#### Current Supabase Model (Relational)
```
products
  ├── product_variants
  │   ├── size (foreign key)
  │   ├── color (foreign key)
  │   └── inventory
  └── sales
      ├── sale_items (references variants)
      └── payments
```

#### Recommended Firestore Model (NoSQL)
```
products/{productId}
  ├── variants subcollection
  │   ├── {variantId}
  │   │   ├── inventory subcollection
  │   │   └── denormalized size/color data

sales/{saleId}
  ├── items subcollection
  │   └── {itemId} (with denormalized product data)
  └── payments subcollection
```

## Next Steps

1. **Data Migration**
   - Export all data from Supabase
   - Transform to Firestore structure
   - Import using Firebase Admin SDK
   - Set up Firestore security rules

2. **Complete Component Migration**
   - Follow migration strategies above
   - Test each component thoroughly
   - Ensure data integrity

3. **Cloud Functions** (if needed)
   - Sale number generation
   - Return number generation
   - Report aggregations
   - Inventory alerts

4. **Performance Optimization**
   - Create composite indexes for common queries
   - Implement pagination for large lists
   - Cache frequently accessed data
   - Use Firestore offline persistence

## Important Notes

- All migrated components use Firebase Auth user.uid instead of user.id
- Date fields use ISO string format
- Active/inactive flags use boolean true/false
- Auto-generated IDs use Firestore document IDs
- No RLS policies needed (use Firestore Security Rules instead)

## Firestore Security Rules Needed

You'll need to create security rules similar to the existing Supabase RLS policies:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Profiles
    match /profiles/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // Products (read by authenticated users, write by authorized users)
    match /products/{productId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated(); // Add role check here
    }

    // Continue for other collections...
  }
}
```
