export type StayType = 'long_term' | 'short_term';
export type TenantTab = 'existing' | 'new';

export interface RoomInfo {
  id: string;
  name: string;
  product_name: string;
  label: string;
  floor: string;
  price: number;
  product_id: string;
  attributes: Record<string, any>;
}

export interface Service {
  id: string;
  variantId?: string;
  unitId?: string;
  name: string;
  unitPrice: number;
  unit: string;
  qty: number;
  selected: boolean;
}

export interface BookingForm {
  stayType: StayType;
  tenantTab: TenantTab;
  searchQuery: string;
  deposit: number;
  note: string;
  services: Service[];
  contractStart: string;
  contractDuration: string;
  monthlyPrice: number;
  electricStart: string;
  waterStart: string;
  // Thông tin khách (hiện lên UI)
  fullName: string;
  phone: string;
  idCard: string;
  // Thông tin ẩn từ QR CCCD hoặc nhập mới
  dateOfBirth: string;
  gender: string;
  address: string;
  placeOfOrigin?: string;  // Quê quán - thêm mới
  email: string;
  nationality: string;
  oldIdNumber?: string;
  // Thông tin đặt phòng
  checkinDate: string;
  checkinTime: string;
  checkoutDate: string;
  checkoutTime: string;
  adults: number;
  children: number;
}

export type ViewMode = 'form' | 'summary';
