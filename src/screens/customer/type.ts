// ─── Types từ schema MyPOS.ts ─────────────────────────────────────────────────

export interface CustomerDetail {
  // customers table
  id: string;
  customer_code: string;
  full_name: string;
  id_number: string;
  date_of_birth: string; // date
  gender: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  address: string;
  nationality: string;
  customer_group: 'regular' | 'vip' | 'wholesale' | 'corporate' | 'staff';
  loyalty_points: number;
  total_spent: number;
  notes?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  // ui only
  imageUri?: string;
  type: 'selling' | 'storage';
  hasKey?: boolean;
}

export type BillStatus =
  | 'draft'
  | 'issued'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export interface Bill {
  // bills table
  id: string;
  bill_number: string; // VD: HĐ #AZ-9021
  customer_id: string;
  bill_type: 'pos' | 'cycle' | 'manual' | 'deposit' | 'refund';
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  bill_status: BillStatus;
  issued_at: string; // timestamp
  notes?: string;
}

export interface Contract {
  // contracts table
  id: string;
  contract_number: string;
  customer_id: string;
  product_id: string;
  start_date: string; // date
  end_date?: string;
  rent_amount: number;
  deposit_amount: number;
  status: 'pending' | 'active' | 'expired' | 'terminated';
  notes?: string;
  // joined từ products
  room_name: string; // products.name VD: "Phòng Deluxe"
  room_code: string; // product_variants.name VD: "402-A"
  room_type: string; // VD: "PHÒNG DELUXE"
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_CUSTOMER_DETAIL: CustomerDetail = {
  id: 'cust-001',
  customer_code: 'KH-001',
  full_name: 'Nguyễn Văn An',
  id_number: '038201012345',
  date_of_birth: '1992-08-15',
  gender: 'male',
  phone: '0987 654 321',
  email: 'nguyenvanan@email.com',
  address: '123 Đường Láng, Phường Láng Thượng, Quận Đống Đa, Hà Nội',
  nationality: 'VN',
  customer_group: 'regular',
  loyalty_points: 120,
  total_spent: 3800000,
  notes: '-',
  status: 'active',
  imageUri: undefined,
  type: 'storage',
  hasKey: true,
};

export const MOCK_BILLS: Bill[] = [
  {
    id: 'bill-001',
    bill_number: 'HĐ #AZ-9021',
    customer_id: 'cust-001',
    bill_type: 'cycle',
    total_amount: 1250000,
    paid_amount: 1250000,
    remaining_amount: 0,
    bill_status: 'paid',
    issued_at: '2023-10-12T14:30:00',
  },
  {
    id: 'bill-002',
    bill_number: 'HĐ #AZ-8944',
    customer_id: 'cust-001',
    bill_type: 'pos',
    total_amount: 450000,
    paid_amount: 0,
    remaining_amount: 450000,
    bill_status: 'issued',
    issued_at: '2023-10-05T09:15:00',
  },
  {
    id: 'bill-003',
    bill_number: 'HĐ #AZ-8812',
    customer_id: 'cust-001',
    bill_type: 'cycle',
    total_amount: 2100000,
    paid_amount: 2100000,
    remaining_amount: 0,
    bill_status: 'paid',
    issued_at: '2023-09-28T18:00:00',
  },
];

export const MOCK_CONTRACT: Contract | null = {
  id: 'contract-001',
  contract_number: 'HD-2023-042',
  customer_id: 'cust-001',
  product_id: 'room-402a',
  start_date: '2023-10-10',
  end_date: '2023-10-15',
  rent_amount: 2500000,
  deposit_amount: 5000000,
  status: 'active',
  room_name: 'Phòng Deluxe',
  room_code: '402-A',
  room_type: 'PHÒNG DELUXE',
};
