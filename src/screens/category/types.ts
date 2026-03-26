export type TabType = 'selling' | 'storage';

export interface Variant {
  id: string;
  name: string;
  price: number;
  unit: string;
  imageUri?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  variants: Variant[];
}

export interface CategoryGroup {
  id: string;
  label: string;
  tab: TabType[];
  items: CategoryItem[];
}
