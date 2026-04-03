export interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
    category_id: string;
    available: boolean;
}

export interface PosCategory {
    id: string;
    name: string;
    category_code: string;
    parent_id: string | null;
    apply_to?: string;
}

export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';

export interface Room {
    id: string;             // product_variants.id
    status: RoomStatus;
    name: string;           // tên gốc (r.name)
    label: string;          // tên phòng hiển thị
    product_name: string;   // tên loại phòng
    price: number;
    floor: string;
    customer_name?: string;
    product_id: string;
    attributes: Record<string, any>;
    borderColor: string;
    tag?: string;           // Nhãn hiển thị (Hết hạn, v.v.)
}

export interface CartItem {
    product: Product;
    quantity: number;
}
