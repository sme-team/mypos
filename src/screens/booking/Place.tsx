import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "react-i18next";

// ─── Types ───────────────────────────────────────────────────────────────────

type RoomStatus = "occupied" | "available" | "cleaning" | "maintenance";

interface Room {
  id: string;
  status: RoomStatus;
  label: string;
  price: number;
  tag?: string;
  tagColor?: string;
  borderColor: string;
}

interface FloorData {
  floor: string;
  rooms: Room[];
}

type TabKey = "all" | "available" | "occupied" | "cleaning" | "maintenance";

interface Tab {
  key: TabKey;
  label: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const roomsData: FloorData[] = [
  {
    floor: "Tầng 1",
    rooms: [
      { id: "P.101", status: "occupied",     label: "Đang ở",   price: 500000, tag: "Hết hạn: 30/11",        tagColor: "#FF6B6B", borderColor: "#FF6B6B" },
      { id: "P.102", status: "available",    label: "Sẵn sàng", price: 450000, tag: "Checkout: 12:00 15/10", tagColor: "#4E9FFF", borderColor: "#4CAF50" },
      { id: "P.103", status: "cleaning",     label: "Đang dọn", price: 450000, tag: "Hết hạn: 25/11",        tagColor: "#FF6B6B", borderColor: "#FFA726" },
      { id: "P.104", status: "available",    label: "Sẵn sàng", price: 600000, tag: "Checkout: 14:00 16/10", tagColor: "#4E9FFF", borderColor: "#4CAF50" },
      { id: "P.105", status: "occupied",     label: "Đang ở",   price: 500000, tag: "Hết hạn: 05/12",        tagColor: "#FF6B6B", borderColor: "#FF6B6B" },
      { id: "P.106", status: "available",    label: "Sẵn sàng", price: 480000, borderColor: "#4CAF50" },
      { id: "P.107", status: "maintenance",  label: "Bảo trì",  price: 520000, borderColor: "#9E9E9E" },
      { id: "P.108", status: "available",    label: "Sẵn sàng", price: 450000, tag: "Checkout: 10:00 18/10", tagColor: "#4E9FFF", borderColor: "#4CAF50" },
    ],
  },
  {
    floor: "Tầng 2",
    rooms: [
      { id: "P.201", status: "available",    label: "Sẵn sàng", price: 550000, tag: "Hết hạn: 15/12",        tagColor: "#FF6B6B", borderColor: "#4CAF50" },
      { id: "P.202", status: "occupied",     label: "Đang ở",   price: 550000, tag: "Checkout: 11:00 15/10", tagColor: "#4E9FFF", borderColor: "#FF6B6B" },
      { id: "P.203", status: "available",    label: "Sẵn sàng", price: 600000, borderColor: "#4CAF50" },
      { id: "P.204", status: "cleaning",     label: "Đang dọn", price: 580000, tag: "Hết hạn: 20/11",        tagColor: "#FF6B6B", borderColor: "#FFA726" },
      { id: "P.205", status: "occupied",     label: "Đang ở",   price: 560000, tag: "Hết hạn: 01/12",        tagColor: "#FF6B6B", borderColor: "#FF6B6B" },
      { id: "P.206", status: "available",    label: "Sẵn sàng", price: 550000, borderColor: "#4CAF50" },
    ],
  },
];

const STATUS_DOT: Record<RoomStatus, string> = {
  occupied:    "#FF4444",
  available:   "#4CAF50",
  cleaning:    "#FFA726",
  maintenance: "#9E9E9E",
};

const TABS: Tab[] = [
  { key: "all",       label: "Tất cả"     },
  { key: "available", label: "Đang trống" },
  { key: "occupied",  label: "Đang ở"     },
  { key: "cleaning",  label: "Dọn dẹp"   },
  { key: "maintenance", label: "Bảo trì"  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const allRooms = roomsData.flatMap((f) => f.rooms);

function formatPrice(price: number): string {
  return price.toLocaleString("vi-VN") + "đ";
}

function countByStatus(status: RoomStatus): number {
  return allRooms.filter((r) => r.status === status).length;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface RoomCardProps {
  room: Room;
  onPress: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[styles.card, { borderLeftColor: room.borderColor }]}
  >
    <View style={styles.cardHeader}>
      <Text style={styles.cardId}>{room.id}</Text>
      {room.tag && room.tagColor ? (
        <View style={[styles.cardTag, { backgroundColor: room.tagColor + "20", borderColor: room.tagColor + "40" }]}>
          <Text style={[styles.cardTagText, { color: room.tagColor }]} numberOfLines={1}>
            {room.tag}
          </Text>
        </View>
      ) : null}
    </View>

    <View style={styles.cardStatus}>
      <View style={[styles.dot, { backgroundColor: STATUS_DOT[room.status] }]} />
      <Text style={styles.cardStatusLabel}>{room.label}</Text>
    </View>

    <Text style={styles.cardPrice}>{formatPrice(room.price)}</Text>
  </TouchableOpacity>
);

// ─── Room Detail Modal ────────────────────────────────────────────────────────

interface RoomModalProps {
  room: Room;
  onClose: () => void;
}

const RoomModal: React.FC<RoomModalProps> = ({ room, onClose }) => (
  <Modal visible animationType="slide" transparent onRequestClose={onClose}>
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
    <View style={styles.bottomSheet}>
      <View style={styles.handle} />

      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{room.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_DOT[room.status] + "20", borderColor: STATUS_DOT[room.status] + "50" }]}>
          <Text style={[styles.statusBadgeText, { color: STATUS_DOT[room.status] }]}>{room.label}</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <InfoRow label="Giá phòng" value={formatPrice(room.price)} bold />
        {room.tag ? <InfoRow label="Ghi chú" value={room.tag} /> : null}
        <InfoRow label="Trạng thái" value={room.label} />
      </View>

      <View style={styles.actionGrid}>
        {room.status === "available" && <ActionButton color="#1A73E8" label="  Check-in" />}
        {room.status === "occupied"  && <ActionButton color="#FF4444" label="  Check-out" />}
        <ActionButton color="#4CAF50" label=" Thu tiền" />
        <ActionButton color="#FFA726" label=" Bảo trì" />
        <ActionButton color="#78909C" label=" Chỉnh sửa" />
      </View>
    </View>
  </Modal>
);

interface InfoRowProps {
  label: string;
  value: string;
  bold?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, bold }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, bold && { fontWeight: "700" }]}>{value}</Text>
  </View>
);

interface ActionButtonProps {
  color: string;
  label: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ color, label }) => (
  <TouchableOpacity
    activeOpacity={0.75}
    style={[styles.actionBtn, { backgroundColor: color + "18", borderColor: color + "40" }]}
  >
    <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Add Room Modal ───────────────────────────────────────────────────────────

interface AddRoomModalProps {
  onClose: () => void;
}

interface NewRoomForm {
  id: string;
  floor: string;
  price: string;
}

const AddRoomModal: React.FC<AddRoomModalProps> = ({ onClose }) => {
  const [form, setForm] = useState<NewRoomForm>({ id: "", floor: "", price: "" });

  const fields: { label: string; key: keyof NewRoomForm; placeholder: string }[] = [
    { label: "Mã phòng",              key: "id",    placeholder: "VD: P.301"  },
    { label: "Tầng",                  key: "floor", placeholder: "VD: Tầng 3" },
    { label: "Giá phòng (đ/tháng)",   key: "price", placeholder: "VD: 500000" },
  ];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        <Text style={styles.modalTitle}> Thêm phòng mới</Text>

        {fields.map((f) => (
          <View key={f.key} style={styles.formField}>
            <Text style={styles.formLabel}>{f.label}</Text>
            <TextInput
              value={form[f.key]}
              onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
              placeholder={f.placeholder}
              placeholderTextColor="#BDBDBD"
              style={styles.formInput}
              keyboardType={f.key === "price" ? "numeric" : "default"}
            />
          </View>
        ))}

        <TouchableOpacity activeOpacity={0.85} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Lưu phòng</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const { width } = Dimensions.get("window");

const QuanLyPhong: React.FC<{ onOpenMenu?: () => void, onBack?: () => void }> = ({ onOpenMenu, onBack }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab]     = useState<TabKey>("all");
  const [search, setSearch]           = useState<string>("");
  const [showSearch, setShowSearch]   = useState<boolean>(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const tabCounts: Record<TabKey, number> = {
    all:         allRooms.length,
    available:   countByStatus("available"),
    occupied:    countByStatus("occupied"),
    cleaning:    countByStatus("cleaning"),
    maintenance: countByStatus("maintenance"),
  };

  const filteredData: FloorData[] = roomsData
    .map((floor) => ({
      ...floor,
      rooms: floor.rooms.filter((r) => {
        const matchTab =
          activeTab === "all" ? true : r.status === (activeTab as RoomStatus);
        const matchSearch = r.id.toLowerCase().includes(search.toLowerCase());
        return matchTab && matchSearch;
      }),
    }))
    .filter((f) => f.rooms.length > 0);

  const tabIcon: Record<TabKey, string> = {
    all: "apps",
    available: "check-circle-outline",
    occupied: "hotel",
    cleaning: "cleaning-services",
    maintenance: "build",
  };

  const summaryItems = [
    { color: "#4CAF50", label: "Trống",   count: countByStatus("available"),   icon: "check-circle-outline" },
    { color: "#FF4444", label: "Đang ở",  count: countByStatus("occupied"),    icon: "hotel" },
    { color: "#FFA726", label: "Dọn dẹp", count: countByStatus("cleaning"),    icon: "cleaning-services" },
    { color: "#9E9E9E", label: "Bảo trì", count: countByStatus("maintenance"), icon: "build" },
  ];

  const bgColor = isDark ? "#111827" : "#FFFFFF";
  const headerBg = isDark ? "#1f2937" : "#FFFFFF";
  const textColor = isDark ? "#f8fafc" : "#0F172A";
  const subTextColor = isDark ? "#94a3b8" : "#64748B";
  const borderColor = isDark ? "#374151" : "#EEF2F6";
  const itemBg = isDark ? "#1f2937" : "#F1F5F9";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bgColor} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {onBack && (
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: itemBg, borderColor: borderColor }]}
                onPress={onBack}
                activeOpacity={0.8}
              >
                <Icon name="arrow-back" size={20} color={textColor} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: itemBg, borderColor: borderColor }]}
              onPress={onOpenMenu}
              activeOpacity={0.8}
            >
              <Icon name="menu" size={20} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]}>Quản lý phòng</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearch((s) => !s)}>
              <Icon name="search" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {showSearch && (
          <TextInput
            autoFocus
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm phòng..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        )}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab, 
                activeTab === tab.key ? (isDark ? { backgroundColor: "#1e3a8a", borderColor: "#2563EB" } : styles.tabActive) : { backgroundColor: itemBg, borderColor: borderColor }
              ]}
            >
              <Icon
                name={tabIcon[tab.key]}
                size={16}
                color={activeTab === tab.key ? (isDark ? "#fff" : "#2563EB") : subTextColor}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.tabText, 
                  { color: subTextColor },
                  activeTab === tab.key && (isDark ? { color: "#fff" } : styles.tabTextActive)
                ]}
              >
                {tab.label} ({tabCounts[tab.key]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Summary Row ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll} contentContainerStyle={styles.summaryContent}>
        {summaryItems.map((s) => (
          <View key={s.label} style={[styles.summaryChip, { backgroundColor: headerBg, borderColor: borderColor }]}>
            <Icon name={s.icon} size={20} color={s.color} />
            <Text style={[styles.summaryLabel, { color: subTextColor }]}>
              {s.label}: <Text style={[styles.summaryCount, { color: textColor }]}>{s.count}</Text>
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Floor + Room Grid ── */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredData.length === 0 && (
          <Text style={styles.emptyText}>Không tìm thấy phòng</Text>
        )}
        {filteredData.map((floor) => (
          <View key={floor.floor} style={styles.floorSection}>
            <View style={styles.floorHeader}>
              <Text style={[styles.floorTitle, { color: textColor }]}>{floor.floor}</Text>
              <Text style={[styles.floorCount, { color: subTextColor }]}>{floor.rooms.length} phòng</Text>
            </View>
            <View style={styles.roomGrid}>
              {floor.rooms.map((room) => (
                <View key={room.id} style={styles.roomGridItem}>
                  <RoomCard room={room} onPress={() => setSelectedRoom(room)} />
                </View>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Modals ── */}
      {selectedRoom && (
        <RoomModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
      )}
      {showAddModal && (
        <AddRoomModal onClose={() => setShowAddModal(false)} />
      )}
    </SafeAreaView>
  );
};

export default QuanLyPhong;

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_WIDTH = (width - 16 * 2 - 10) / 2;
const TAB_HEIGHT = 36;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
  },
  iconBtn: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  searchInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: "#0F172A",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabsScroll: {
    marginTop: 12,
  },
  tab: {
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    height: TAB_HEIGHT,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignSelf: "flex-start",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#2563EB",
  },
  tabText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#2563EB",
  },

  // Summary
  summaryScroll: {
    paddingVertical: 12,
    paddingLeft: 14,
  },
  summaryContent: {
    gap: 8,
    paddingRight: 14,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 40,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  summaryCount: {
    color: "#0F172A",
    fontWeight: "800",
  },

  // List
  listContent: {
    paddingHorizontal: 14,
  },
  emptyText: {
    textAlign: "center",
    color: "#BDBDBD",
    marginTop: 60,
    fontSize: 15,
  },
  floorSection: {
    marginBottom: 20,
  },
  floorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  floorCount: {
    fontSize: 12,
    color: "#999",
  },
  roomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  roomGridItem: {
    width: CARD_WIDTH,
  },

  // Room Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  cardTag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    maxWidth: 110,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardStatusLabel: {
    fontSize: 12,
    color: "#666",
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A73E8",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 28,
    right: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1A73E8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A73E8",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "300",
    lineHeight: 34,
  },

  // Modal shared
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 16,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1.5,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Info box
  infoBox: {
    backgroundColor: "#F8FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#999",
  },
  infoValue: {
    fontSize: 13,
    color: "#1A1A2E",
    fontWeight: "500",
  },

  // Action grid
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    minWidth: "45%",
    flex: 1,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Add Room form
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1A1A2E",
  },
  saveBtn: {
    backgroundColor: "#1A73E8",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});