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
}

export type RoomStatus = 'available' | 'occupied' | 'cleaning';

export interface Room {
    id: string;
    status: RoomStatus;
    label: string;
    price: number;
    metadata?: string; // JSON string from products.metadata (floor, area, etc.)
    tag?: string;
    tagColor?: string;
    borderColor: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
}
