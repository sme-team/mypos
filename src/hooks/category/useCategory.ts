import {useState, useMemo, useCallback, useEffect} from 'react';
import type {
  TabType,
  CategoryGroup,
  CategoryItem,
  Variant,
} from '../../screens/category/types';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export const TABS: {key: TabType; labelKey: string}[] = [
  {key: 'selling', labelKey: 'category.tab.selling'},
  {key: 'storage', labelKey: 'category.tab.storage'},
];

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_GROUPS: CategoryGroup[] = [
  {
    id: 'group-1',
    label: 'ĐỒ UỐNG',
    tab: ['selling'],
    items: [
      {
        id: 'item-1',
        name: 'Cà phê',
        variants: [
          {id: 'var-1', name: 'Cà phê đen', price: 25000, unit: 'ly'},
          {id: 'var-2', name: 'Cà phê sữa', price: 30000, unit: 'ly'},
          {id: 'var-3', name: 'Bạc xỉu', price: 32000, unit: 'ly'},
        ],
      },
      {
        id: 'item-2',
        name: 'Trà',
        variants: [
          {id: 'var-4', name: 'Trà đào', price: 35000, unit: 'ly'},
          {id: 'var-5', name: 'Trà vải', price: 35000, unit: 'ly'},
        ],
      },
      {
        id: 'item-3',
        name: 'Sinh tố',
        variants: [
          {id: 'var-6', name: 'Sinh tố bơ', price: 45000, unit: 'ly'},
          {id: 'var-7', name: 'Sinh tố xoài', price: 40000, unit: 'ly'},
        ],
      },
    ],
  },
  {
    id: 'group-2',
    label: 'ĐỒ ĂN',
    tab: ['selling'],
    items: [
      {
        id: 'item-4',
        name: 'Bánh mì',
        variants: [
          {id: 'var-8', name: 'Bánh mì thịt', price: 20000, unit: 'ổ'},
          {id: 'var-9', name: 'Bánh mì trứng', price: 15000, unit: 'ổ'},
        ],
      },
      {
        id: 'item-5',
        name: 'Cơm',
        variants: [
          {id: 'var-10', name: 'Cơm sườn', price: 55000, unit: 'phần'},
          {id: 'var-11', name: 'Cơm tấm', price: 50000, unit: 'phần'},
        ],
      },
    ],
  },
  {
    id: 'group-3',
    label: 'KHO NGUYÊN LIỆU',
    tab: ['storage'],
    items: [
      {
        id: 'item-6',
        name: 'Cà phê hạt',
        variants: [
          {id: 'var-12', name: 'Robusta', price: 180000, unit: 'kg'},
          {id: 'var-13', name: 'Arabica', price: 350000, unit: 'kg'},
        ],
      },
      {
        id: 'item-7',
        name: 'Sữa',
        variants: [
          {
            id: 'var-14',
            name: 'Sữa tươi không đường',
            price: 30000,
            unit: 'hộp',
          },
          {id: 'var-15', name: 'Sữa đặc Ông Thọ', price: 22000, unit: 'lon'},
        ],
      },
    ],
  },
  {
    id: 'group-4',
    label: 'VẬT TƯ',
    tab: ['storage'],
    items: [
      {
        id: 'item-8',
        name: 'Ly & Cốc',
        variants: [
          {id: 'var-16', name: 'Ly nhựa 500ml', price: 1500, unit: 'cái'},
          {id: 'var-17', name: 'Ly giấy 350ml', price: 800, unit: 'cái'},
        ],
      },
    ],
  },
  {
    id: 'group-5',
    label: 'COMBO',
    tab: ['selling', 'storage'],
    items: [
      {
        id: 'item-9',
        name: 'Combo sáng',
        variants: [
          {id: 'var-18', name: 'Bánh mì + Cà phê', price: 40000, unit: 'set'},
          {id: 'var-19', name: 'Bánh mì + Trà', price: 45000, unit: 'set'},
        ],
      },
    ],
  },
];

// ─── ID generator (đơn giản, dùng timestamp) ─────────────────────────────────
let _idCounter = 100;
const genId = (prefix: string) => `${prefix}-${++_idCounter}`;

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useCategory = (_storeId: string) => {
  const [data, setData] = useState<CategoryGroup[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('selling');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load mock data (giả lập async) ──────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Giả lập độ trễ network nhỏ để UI loading hoạt động
      await new Promise(resolve => setTimeout(resolve, 300));
      setData(MOCK_GROUPS);
    } catch (e) {
      setError('Không thể tải danh mục');
      console.error('[useCategory] loadData error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Expand / collapse ────────────────────────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ─── Thêm group ───────────────────────────────────────────────────────────
  const handleAddGroup = useCallback(async (label: string, tabs: TabType[]) => {
    const newGroup: CategoryGroup = {
      id: genId('group'),
      label: label.trim().toUpperCase(),
      tab: tabs,
      items: [],
    };
    setData(prev => [...prev, newGroup]);
  }, []);

  // ─── Thêm item vào group ──────────────────────────────────────────────────
  const handleAddItem = useCallback(async (groupId: string, name: string) => {
    const newItem: CategoryItem = {
      id: genId('item'),
      name: name.trim(),
      variants: [],
    };
    setData(prev =>
      prev.map(g =>
        g.id === groupId ? {...g, items: [...g.items, newItem]} : g,
      ),
    );
  }, []);

  // ─── Cập nhật group ───────────────────────────────────────────────────────
  const handleUpdateGroup = useCallback(
    async (groupId: string, label: string, tabs: TabType[]) => {
      setData(prev =>
        prev.map(g =>
          g.id === groupId
            ? {...g, label: label.trim().toUpperCase(), tab: tabs}
            : g,
        ),
      );
    },
    [],
  );

  // ─── Xóa group ────────────────────────────────────────────────────────────
  const handleDeleteGroup = useCallback(async (groupId: string) => {
    setData(prev => prev.filter(g => g.id !== groupId));
  }, []);

  // ─── Xóa item ─────────────────────────────────────────────────────────────
  const handleDeleteItem = useCallback(
    async (groupId: string, itemId: string) => {
      setData(prev =>
        prev.map(g =>
          g.id === groupId
            ? {...g, items: g.items.filter(i => i.id !== itemId)}
            : g,
        ),
      );
    },
    [],
  );

  // ─── Thêm variant vào item ────────────────────────────────────────────────
  const handleAddVariant = useCallback(
    async (
      itemId: string,
      name: string,
      price: number,
      unit: string,
      imageUri?: string,
    ) => {
      const newVariant: Variant = {
        id: genId('var'),
        name: name.trim(),
        price,
        unit: unit.trim(),
        imageUri,
      };
      setData(prev =>
        prev.map(g => ({
          ...g,
          items: g.items.map(item =>
            item.id === itemId
              ? {...item, variants: [...item.variants, newVariant]}
              : item,
          ),
        })),
      );
    },
    [],
  );

  // ─── Cập nhật variant ─────────────────────────────────────────────────────
  const handleUpdateVariant = useCallback(
    async (
      itemId: string,
      variantId: string,
      name: string,
      price: number,
      unit: string,
      imageUri?: string,
    ) => {
      setData(prev =>
        prev.map(g => ({
          ...g,
          items: g.items.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  variants: item.variants.map(v =>
                    v.id === variantId
                      ? {
                          ...v,
                          name: name.trim(),
                          price,
                          unit: unit.trim(),
                          imageUri: imageUri ?? v.imageUri,
                        }
                      : v,
                  ),
                }
              : item,
          ),
        })),
      );
    },
    [],
  );

  // ─── Filter theo tab ──────────────────────────────────────────────────────
  const filteredGroups = useMemo(
    () =>
      data
        .filter(g => g.tab.includes(activeTab))
        .map(g => ({
          ...g,
          items: g.items.map(item => ({
            ...item,
            isExpanded: expandedIds.has(item.id),
          })),
        })),
    [data, activeTab, expandedIds],
  );

  return {
    activeTab,
    setActiveTab,
    filteredGroups,
    isLoading,
    error,
    toggleExpand,
    handleAddGroup,
    handleAddItem,
    handleAddVariant,
    handleUpdateVariant,
    handleDeleteGroup,
    handleDeleteItem,
    handleUpdateGroup,
    reload: loadData,
  };
};
