export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  category_id: string;
  available: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  is_default: boolean;
}

export interface PosCategory {
  id: string;
  name: string;
  category_code: string;
  parent_id?: string | null;
  apply_to?: string;
}

export type RoomStatus = 'available' | 'occupied' | 'booked' | 'cleaning' | 'maintenance';

export interface Room {
  id: string; // product_variants.id
  status: RoomStatus;
  name: string; // tên gốc (r.name)
  label: string; // tên phòng hiển thị
  product_name: string; // tên loại phòng
  monthly_price?: number; // Giá theo tháng (unit-019), chỉ có ở phòng dài hạn
  displayPriceText?: string; // Giá hiển thị theo độ ưu tiên (Tháng > Ngày > Đêm > Giờ)
  floor: string;
  customer_name?: string;
  product_id: string;
  attributes: Record<string, any>;
  borderColor: string;
  tag?: string; // Nhãn hiển thị (Hết hạn, v.v.)
  contract_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  checkInTime?: string; // Giờ check-in từ contract metadata (HH:mm)
}

export interface CartItem {
  product: Product;
  quantity: number;
  variants: ProductVariant[]; // ← toàn bộ danh sách variant, load 1 lần khi thêm vào giỏ
  selectedVariant?: ProductVariant | null; // variant đang chọn
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  customer_code?: string;
  customer_group?: string;
  email?: string;
}
