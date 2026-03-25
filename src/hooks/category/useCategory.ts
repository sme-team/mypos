import {useState, useMemo, useCallback} from 'react';
import type {
  TabType,
  CategoryGroup,
  CategoryItem,
  Variant,
} from '../../screens/category/types';

// ─── Tabs ────────────────────────────────────────────────────
export const TABS: {key: TabType; labelKey: string}[] = [
  {key: 'selling', labelKey: 'category.tab.selling'},
  {key: 'storage', labelKey: 'category.tab.storage'},
];

// ─── Mock data ───────────────────────────────────────────────
// TODO: xoá MOCK_DATA, thay bằng getAllCategoryGroups() từ services
const MOCK_DATA: CategoryGroup[] = [
  {
    id: 'food',
    label: 'THỰC PHẨM',
    tab: ['selling'],
    items: [
      {
        id: 'banh-ca',
        name: 'Bánh cá',
        variants: [
          {id: 'bc-1', name: 'Bánh cá Đậu đỏ', price: 15000, unit: 'cái'},
          {id: 'bc-2', name: 'Bánh cá Phô mai', price: 18000, unit: 'cái'},
        ],
      },
      {
        id: 'mi-tom',
        name: 'Mì tôm',
        variants: [],
      },
    ],
  },
  {
    id: 'drink',
    label: 'ĐỒ UỐNG',
    tab: ['selling'],
    items: [],
  },
];

// ─── Hook ────────────────────────────────────────────────────
export const useCategory = () => {
  // TODO: đổi useState(MOCK_DATA) → useState([]) + useEffect gọi service
  const [data, setData] = useState<CategoryGroup[]>(MOCK_DATA);
  const [activeTab, setActiveTab] = useState<TabType>('selling');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([]));

  // ─── Expand / collapse ──────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ─── Thêm nhóm danh mục ─────────────────────────────────
  const handleAddGroup = useCallback((label: string, tab: TabType[]) => {
    const newGroup: CategoryGroup = {
      id: Date.now().toString(),
      label: label.toUpperCase(),
      tab,
      items: [],
    };
    // TODO: await createCategoryGroup(...) rồi reload từ DB
    setData(prev => [...prev, newGroup]);
  }, []);

  // ─── Thêm item vào nhóm ─────────────────────────────────
  const handleAddItem = useCallback((groupId: string, name: string) => {
    const newItem: CategoryItem = {
      id: Date.now().toString(),
      name,
      variants: [],
    };
    // TODO: await createCategoryItem(...) rồi reload từ DB
    setData(prev =>
      prev.map(g =>
        g.id === groupId ? {...g, items: [...g.items, newItem]} : g,
      ),
    );
  }, []);

  // ─── Thêm biến thể vào item ─────────────────────────────
  const handleAddVariant = useCallback(
    (
      itemId: string,
      name: string,
      price: number,
      unit: string,
      imageUri?: string,
    ) => {
      const newVariant: Variant = {
        id: Date.now().toString(),
        name,
        price,
        unit,
        imageUri,
      };
      // TODO: await createVariant(...) rồi reload từ DB
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

  // ─── Cập nhật biến thể ──────────────────────────────────
  const handleUpdateVariant = useCallback(
    (
      itemId: string,
      variantId: string,
      name: string,
      price: number,
      unit: string,
      imageUri?: string,
    ) => {
      // TODO: await updateVariant(...) rồi reload từ DB
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
                          name,
                          price,
                          unit,
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

  // ─── Xóa nhóm danh mục ─────────────────────────────────
  const handleDeleteGroup = useCallback((groupId: string) => {
    setData(prev => prev.filter(g => g.id !== groupId));
  }, []);

  // ─── Cập nhật tên + loại tab cho nhóm ────────────────────
  const handleUpdateGroup = useCallback(
    (groupId: string, label: string, tab: TabType[]) => {
      setData(prev =>
        prev.map(g =>
          g.id === groupId
            ? {
                ...g,
                label: label.trim().toUpperCase(),
                tab: tab.length ? tab : ['selling'],
              }
            : g,
        ),
      );
    },
    [],
  );

  // ─── Filter theo tab ────────────────────────────────────
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
    toggleExpand,
    handleAddGroup,
    handleAddItem,
    handleAddVariant,
    handleUpdateVariant,
    handleDeleteGroup,
    handleUpdateGroup,
  };
};
