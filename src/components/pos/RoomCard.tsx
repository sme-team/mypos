/**
 * @file: RoomCard.tsx
 * @description: Component hiển thị thẻ thông tin phòng trong phân hệ LƯU TRÚ.
 * Hiển thị số phòng, trạng thái (màu sắc động), giá tiền và các nhãn (tags).
 * @path: src/components/pos/RoomCard.tsx
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

/**
 * Định nghĩa kiểu dữ liệu cho một Phòng
 */
interface Room {
    id: string; // Số phòng (e.g., P.101)
    status: 'available' | 'occupied' | 'cleaning' | 'maintenance'; // Trạng thái
    label: string; // Nhãn hiển thị trạng thái (e.g., Đang ở, Sẵn sàng)
    price: number; // Giá phòng
    tag?: string;  // Nhãn phụ (e.g., Hết hạn: 30/11)
    tagColor?: string;
    borderColor: string; // Màu viền bên trái để nhận diện nhanh
}

interface RoomCardProps {
    room: Room;
    cardWidth: number; // Chiều rộng thẻ tính toán theo thiết bị
}

/**
 * Bảng màu tương ứng với từng trạng thái phòng
 */
const STATUS_DOT: Record<Room['status'], string> = {
    occupied: "#FF4444",    // Đang có khách - Đỏ
    available: "#4CAF50",   // Trống/Sẵn sàng - Xanh lá
    cleaning: "#FFA726",    // Đang dọn dẹp - Cam
    maintenance: "#9E9E9E", // Bảo trì - Xám
};

/**
 * Hàm định dạng tiền tệ Việt Nam
 */
const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

const RoomCard: React.FC<RoomCardProps> = ({ room, cardWidth }) => {
    const { isDark } = useTheme();

    // Thiết lập màu sắc linh hoạt theo giao diện Sáng/Tối
    const cardBg = isDark ? '#1f2937' : '#fff';
    const textColor = isDark ? '#F9FAFB' : '#1A1A2E';
    const subTextColor = isDark ? '#9CA3AF' : '#666';
    const tagBg = isDark ? '#374151' : '#FEE2E2';
    const tagBorder = isDark ? '#4B5563' : '#FECACA';

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={[
                styles.roomCard,
                {
                    width: cardWidth,
                    borderLeftColor: room.borderColor, // Vạch màu bên trái thẻ
                    backgroundColor: cardBg,
                }
            ]}>

            {/* --- PHẦN TIÊU ĐỀ: SỐ PHÒNG & TAG THỜI GIAN --- */}
            <View style={styles.roomHeader}>
                <Text style={[styles.roomId, { color: textColor }]}>{room.id}</Text>
                {room.tag && (
                    <View style={[styles.roomTag, { backgroundColor: tagBg, borderColor: tagBorder, borderWidth: 0.5 }]}>
                        {/* Logic đổi màu chữ tag dựa trên nội dung (Hết hạn hoặc Checkout) */}
                        <Text style={[styles.roomTagText, { color: room.id.includes('101') || room.id.includes('103') ? '#EF4444' : '#3B82F6' }]}>
                            {room.tag}
                        </Text>
                    </View>
                )}
            </View>

            {/* --- PHẦN TRẠNG THÁI: CHẤM TRÒN & TEXT --- */}
            <View style={styles.roomStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_DOT[room.status] }]} />
                <Text style={[styles.roomStatusLabel, { color: subTextColor }]}>{room.label}</Text>
            </View>

            {/* --- PHẦN GIÁ TIỀN --- */}
            <Text style={[styles.roomPrice, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                {formatPrice(room.price)}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    roomCard: {
        borderRadius: 16,
        padding: 12,
        borderLeftWidth: 4, // Độ dày của vạch màu bên trái
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 12, // Khoảng cách dưới giữa các thẻ
    },
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    roomId: {
        fontSize: 15,
        fontWeight: '700',
    },
    roomTag: {
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    roomTagText: {
        fontSize: 10,
        fontWeight: '600',
    },
    roomStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    roomStatusLabel: {
        fontSize: 12,
    },
    roomPrice: {
        fontSize: 14,
        fontWeight: '700',
    },
});

export default RoomCard;