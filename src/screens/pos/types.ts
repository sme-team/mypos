export interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
    available: boolean;
}

export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';

export interface Room {
    id: string;
    status: RoomStatus;
    label: string;
    price: number;
    tag?: string;
    tagColor?: string;
    borderColor: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
}
