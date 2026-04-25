import {useState} from 'react';

interface SelectableItem {
  id: string;
}

interface SelectableGroup {
  id: string;
  items: SelectableItem[];
}

export function useSelectionMode<G extends SelectableGroup>(
  filteredGroups: G[],
) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const allGroupIds = filteredGroups.map(g => g.id);
  const allItemIds = filteredGroups.flatMap(g => g.items.map(i => i.id));
  const totalSelectable = allGroupIds.length + allItemIds.length;
  const totalSelected = selectedGroups.size + selectedItems.size;
  const isAllSelected =
    totalSelectable > 0 && totalSelected === totalSelectable;

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedGroups(new Set());
    setSelectedItems(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedGroups(new Set());
    setSelectedItems(new Set());
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedGroups(new Set());
      setSelectedItems(new Set());
    } else {
      setSelectedGroups(new Set(allGroupIds));
      setSelectedItems(new Set(allItemIds));
    }
  };

  const toggleSelectGroup = (groupId: string) => {
    const group = filteredGroups.find(g => g.id === groupId);
    if (!group) {return;}
    const itemIds = group.items.map(i => i.id);
    const willBeSelected = !selectedGroups.has(groupId);

    setSelectedGroups(prev => {
      const next = new Set(prev);
      willBeSelected ? next.add(groupId) : next.delete(groupId);
      return next;
    });

    setSelectedItems(prev => {
      const next = new Set(prev);
      willBeSelected
        ? itemIds.forEach(id => next.add(id))
        : itemIds.forEach(id => next.delete(id));
      return next;
    });
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  return {
    selectionMode,
    selectedGroups,
    selectedItems,
    totalSelected,
    isAllSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectAll,
    toggleSelectGroup,
    toggleSelectItem,
  };
}
