# Shoe Store POS System - Production Ready

A complete, production-grade Point of Sale system built for shoe retail stores with real-time inventory management, customer tracking, sales processing, and comprehensive reporting.

## System Overview

This is a full-featured POS system designed for daily commercial use in shoe stores. All data is persisted in a real Supabase PostgreSQL database with proper security, transactions, and audit trails.

## Key Features

### 1. Authentication & Security
- Email/password authentication via Supabase Auth
- Role-based access control (Administrator, Manager, Cashier)
- Secure session management
- Row Level Security (RLS) policies on all database tables
- Audit logging for sensitive operations

### 2. Point of Sale (POS)
- Real-time product search with filtering
- Product variant selection (size + color combinations)
- Shopping cart with quantity management
- Multiple payment methods (Cash, Card, Transfer)
- Split payment support
- Automatic inventory deduction
- Cash session validation
- Customer assignment to sales
- Transaction-safe sales processing

### 3. Product Management
- Product catalog with images
- Variant generation (size/color matrix)
- SKU and barcode management
- Cost and price tracking
- Brand and category organization
- Active/inactive product status
- Bulk variant creation

### 4. Inventory Management
- Real-time stock levels
- Low stock alerts
- Stock adjustment with reason tracking
- Complete movement history audit trail
- Size and color variant tracking
- Minimum stock thresholds
- Movement types: purchase, sale, return, adjustment, damage, theft

### 5. Cash Register Control
- Open/close cash sessions per user
- Opening cash declaration
- Real-time session sales tracking
- Expected vs actual cash reconciliation
- Difference tracking and reporting
- Session notes and audit trail

### 6. Customer Management
- Customer database
- Contact information
- Purchase history
- Store credit tracking
- Customer search by name, email, phone

### 7. Returns & Exchanges
- Process returns with inventory restocking
- Link to original sale
- Multiple item returns
- Refund method tracking
- Return reason and notes
- Exchange support (via new sale + return)

### 8. Promotions
- Percentage discounts
- Fixed amount discounts
- Buy X Get Y promotions
- Second item discount
- Date-based activation
- Priority and stackable settings
- Product-specific promotions

### 9. Reports & Analytics
- Date range filtering
- Total sales and revenue
- Profit calculations
- Top selling products
- Sales by user performance
- New customer tracking
- Revenue breakdown by payment method

## Database Schema

The system uses a comprehensive relational database with the following main entities:

- **profiles** - User profiles extending Supabase auth.users
- **roles** - System roles with permissions
- **user_roles** - User-role assignments
- **products** - Base product models
- **sizes** - Available shoe sizes
- **colors** - Available colors
- **product_variants** - Specific SKUs (product + size + color)
- **inventory** - Stock levels per variant
- **inventory_movements** - Complete audit trail
- **cash_registers** - Physical registers
- **cash_sessions** - Open/close sessions
- **customers** - Customer database
- **sales** - Sale transactions
- **sale_items** - Line items
- **payments** - Payment records (supports multiple per sale)
- **returns** - Return transactions
- **return_items** - Returned items
- **promotions** - Promotional campaigns
- **audit_logs** - System audit trail

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase project configured
- Environment variables set in .env

### First Time Setup

1. The database schema is already created via migrations
2. Default data is pre-populated:
   - Roles: Administrator, Manager, Cashier
   - Sizes: 35-46
   - Colors: Common shoe colors
   - Default cash register

3. Create your first user:
   - Go to the registration page
   - Create an account with email/password
   - New users are automatically assigned the Cashier role

4. Open a cash session:
   - Navigate to Cash Register
   - Click "Open Cash Session"
   - Enter opening cash amount
   - Submit to activate POS

5. Add products:
   - Go to Products
   - Click "Add Product"
   - Fill in product details
   - Click "Variants" to generate size/color combinations
   - Select sizes and colors to create

6. Set inventory levels:
   - Go to Inventory
   - Find your product variants
   - Click "Adjust" to add stock
   - Enter quantity and reason

7. Make your first sale:
   - Go to Point of Sale
   - Search for products
   - Add to cart
   - Proceed to payment
   - Enter payment amounts
   - Complete sale

## User Roles & Permissions

### Cashier
- Access to POS
- Process sales
- View and create customers
- Cannot access reports or admin functions

### Manager
- All Cashier permissions
- Product management
- Inventory management
- Cash register operations
- View reports
- Process returns/exchanges
- Manage promotions

### Administrator
- Full system access
- User management
- Role assignment
- System configuration
- All Manager permissions

## Important Business Rules

1. **Cash Sessions**: Users must have an open cash session to process sales
2. **Inventory**: Sales automatically deduct inventory and create movement records
3. **Returns**: Returned items are automatically restocked unless specified otherwise
4. **Transactions**: All sales are atomic - if any part fails, the entire sale is rolled back
5. **Audit Trail**: All inventory changes are logged with user, reason, and timestamp
6. **Stock Validation**: Cannot sell more than available inventory
7. **Sequential Numbers**: Sale numbers, return numbers, and exchange numbers are auto-generated

## Extension Points

The system is designed to be easily extended:

1. **Payment Methods**: Add new payment types in database enum and update POS
2. **Promotion Types**: Extend promotion logic in POS cart calculations
3. **Reports**: Add new report types in Reports page
4. **Customer Features**: Add loyalty points, membership tiers
5. **Multi-location**: Add location field to inventory and sessions
6. **Advanced Pricing**: Add price rules, bulk discounts
7. **Supplier Management**: Add suppliers table and purchase orders
8. **Employee Scheduling**: Add shift management
9. **Receipt Printing**: Integrate receipt printer
10. **Barcode Scanning**: Add barcode scanner support

## Production Deployment Checklist

- [ ] Update Supabase environment variables for production
- [ ] Configure proper CORS settings
- [ ] Set up automated database backups
- [ ] Enable SSL/TLS for all connections
- [ ] Configure proper session timeouts
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure email templates for Supabase Auth
- [ ] Test all user roles and permissions
- [ ] Perform load testing on POS operations
- [ ] Set up monitoring and alerting
- [ ] Train staff on system usage
- [ ] Create runbook for common operations
- [ ] Set up regular database maintenance

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Build**: Vite
- **Deployment**: Static hosting (Vercel, Netlify, etc.)

## Security Features

- Passwords hashed via Supabase Auth (bcrypt)
- Row Level Security enforced at database level
- JWT-based session management
- XSS protection via React
- SQL injection prevention via parameterized queries
- CSRF protection via SameSite cookies
- Secure environment variable management

## Support & Maintenance

This system is production-ready but should be maintained regularly:

- Monitor database performance and optimize queries as needed
- Review audit logs for suspicious activity
- Update dependencies monthly for security patches
- Back up database daily
- Test disaster recovery procedures quarterly
- Review and optimize RLS policies as usage patterns emerge

## License

This is proprietary software designed for commercial sale and deployment.
