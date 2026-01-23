export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'store_credit';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type SaleStatus = 'draft' | 'completed' | 'voided' | 'returned';
export type MovementType = 'purchase' | 'sale' | 'return' | 'adjustment' | 'transfer' | 'damage' | 'theft' | 'initial';
export type PromotionType = 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'second_item_discount';
export type SessionStatus = 'open' | 'closed' | 'reconciled';
export type LayawayStatus = 'active' | 'paid' | 'delivered' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string;
  role?: Role;
}

export interface Size {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Color {
  id: string;
  name: string;
  hex_code?: string;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  brand: string;
  finish: string;
  category?: string;
  gender?: string;
  image_url?: string;
  base_cost: number;
  base_price: number;
  store_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size_id: string;
  color_id: string;
  sku: string;
  barcode?: string;
  cost?: number;
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  product?: Product;
  size?: Size;
  color?: Color;
  inventory?: Inventory;
}

export interface Inventory {
  id: string;
  variant_id: string;
  store_id: string;
  quantity: number;
  min_stock: number;
  max_stock?: number;
  location?: string;
  last_counted_at?: string;
  last_counted_by?: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  variant_id: string;
  movement_type: MovementType;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type?: string;
  reference_id?: string;
  reason?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  variant?: ProductVariant;
  creator?: Profile;
}

export interface CashRegister {
  id: string;
  name: string;
  location?: string;
  active: boolean;
  created_at: string;
}

export interface CashSession {
  id: string;
  register_id: string;
  user_id: string;
  status: SessionStatus;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  difference?: number;
  notes?: string;
  opened_at: string;
  closed_at?: string;
  reconciled_at?: string;
  reconciled_by?: string;
  register?: CashRegister;
  user?: Profile;
}

export interface Customer {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  store_credit: number;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface QuickCustomer {
  name: string;
  email: string;
}

export interface Sale {
  id: string;
  sale_number: string;
  session_id?: string;
  customer_id?: string;
  quick_customer?: QuickCustomer; // For walk-in customers
  store_id?: string;
  user_id: string;
  status: SaleStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  notes?: string;
  voided_at?: string;
  voided_by?: string;
  void_reason?: string;
  created_at: string;
  completed_at?: string;
  invoice_sent?: boolean;
  invoice_sent_at?: string;
  session?: CashSession;
  customer?: Customer;
  user?: Profile;
  items?: SaleItem[];
  payments?: Payment[];
  store?: Store;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
  promotion_id?: string;
  created_at: string;
  variant?: ProductVariant;
}

export interface Payment {
  id: string;
  sale_id: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface Return {
  id: string;
  return_number: string;
  sale_id: string;
  customer_id?: string;
  user_id: string;
  total_amount: number;
  refund_method?: PaymentMethod;
  reason?: string;
  notes?: string;
  created_at: string;
  sale?: Sale;
  customer?: Customer;
  user?: Profile;
  items?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  sale_item_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  restocked: boolean;
  created_at: string;
  variant?: ProductVariant;
}

export interface Exchange {
  id: string;
  exchange_number: string;
  sale_id: string;
  customer_id?: string;
  user_id: string;
  original_value: number;
  new_value: number;
  difference: number;
  reason?: string;
  notes?: string;
  created_at: string;
  sale?: Sale;
  customer?: Customer;
  user?: Profile;
  items?: ExchangeItem[];
}

export interface ExchangeItem {
  id: string;
  exchange_id: string;
  sale_item_id?: string;
  variant_id: string;
  quantity: number;
  type: 'returned' | 'received';
  unit_price: number;
  subtotal: number;
  created_at: string;
  variant?: ProductVariant;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: PromotionType;
  value: number;
  min_quantity: number;
  priority: number;
  stackable: boolean;
  active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  created_by?: string;
  products?: PromotionProduct[];
}

export interface PromotionProduct {
  id: string;
  promotion_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: Profile;
}

export interface ChatMessage {
  id: string;
  message: string;
  image?: string;
  sender_store_id: string;
  sender_store_name: string;
  sender_user_id: string;
  sender_user_name: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  conversation_id: string;
  type: 'public' | 'private';
  store_ids: string[];
  store_names: string[];
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface StoreLegalInfo {
  business_name?: string;
  tax_id?: string; // RFC
  business_registration?: string;
  legal_address?: string;
  legal_representative?: string;
  permits_licenses?: string;
  return_policy?: string;
  warranty_policy?: string;
  terms_conditions?: string;
  website?: string;
}

export interface Store {
  id: string;
  storeId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  legal_info?: StoreLegalInfo;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type PurchaseInvoiceStatus = 'draft' | 'confirmed' | 'cancelled';

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_id?: string;
  status: PurchaseInvoiceStatus;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  confirmed_by?: string;
  created_by?: string;
  supplier?: Supplier;
  items?: PurchaseInvoiceItem[];
  revision_history?: PurchaseInvoiceRevision[];
}

export interface PurchaseInvoiceItem {
  id: string;
  invoice_id: string;
  variant_id: string;
  product_name: string;
  supplier_id?: string;
  cost_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
  variant?: ProductVariant;
  supplier?: Supplier;
}

export interface PurchaseInvoiceRevision {
  id: string;
  invoice_id: string;
  revision_number: number;
  changes: Record<string, unknown>;
  revised_by: string;
  revised_at: string;
  notes?: string;
}

export interface PrintQueueItem {
  id: string;
  item_type: 'barcode_label' | 'invoice' | 'receipt';
  variant_id?: string;
  reference_id?: string;
  reference_type?: string;
  data: Record<string, unknown>;
  status: 'pending' | 'printed' | 'failed';
  created_at: string;
  printed_at?: string;
  printed_by?: string;
  store_id?: string;
}

export interface Layaway {
  id: string;
  layaway_number: string;
  customer_id: string;
  variant_id: string;
  store_id: string;
  status: LayawayStatus;
  total_price: number;
  amount_paid: number;
  balance: number;
  initial_payment?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  created_by?: string;
  customer?: Customer;
  variant?: ProductVariant;
  payments?: LayawayPayment[];
}

export interface LayawayPayment {
  id: string;
  layaway_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  creator?: Profile;
}
