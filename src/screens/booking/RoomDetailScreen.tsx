import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RoomQueryService } from '../../services/ResidentServices/RoomQueryService';
import { RoomActionService } from '../../services/ResidentServices/RoomActionService';
import BookingScreen from './BookingScreen';

type ViewState = 'detail' | 'edit' | 'switch';

export default function RoomDetailScreen({ room, onBack }: { room: any; onBack: () => void }) {
  const [view, setView] = useState<ViewState>('detail');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editData, setEditData] = useState({
    tenant: '',
    phone: '',
    cccd: '',
    rentPrice: '0',
    electricOld: '0',
    electricNew: '0',
    electricRate: '3500',
    waterOld: '0',
    waterNew: '0',
    waterRate: '18000',
  });

  // Switch State
  const [switchFloor, setSwitchFloor] = useState('1');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedNewRoom, setSelectedNewRoom] = useState<any>(null);

  // Booking Screen State
  const [showBooking, setShowBooking] = useState(false);

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';
  const extractFloor = (name: string) => {
    const m = String(name || '').match(/\d/);
    return m ? m[0] : '1';
  };

  const loadDetails = async () => {
    setLoading(true);
    try {
      const dbDetails = await RoomQueryService.getRoomDetails(room.id);
      if (dbDetails) {
        setDetails(dbDetails);
        setEditData({
          tenant: dbDetails.customer_name || '',
          phone: dbDetails.customer_phone || '',
          cccd: '', // CCCD logic could be added if queried
          rentPrice: room.price ? room.price.toString() : '0',
          electricOld: dbDetails.electric_index ? dbDetails.electric_index.toString() : '0',
          electricNew: dbDetails.electric_index ? dbDetails.electric_index.toString() : '0',
          electricRate: '3500',
          waterOld: dbDetails.water_index ? dbDetails.water_index.toString() : '0',
          waterNew: dbDetails.water_index ? dbDetails.water_index.toString() : '0',
          waterRate: '18000',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRoomsForSwitch = async () => {
    try {
      const allRooms = await RoomQueryService.getAvailableRooms(room.id);
      setAvailableRooms(allRooms);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    if (view === 'switch') {
      loadAvailableRoomsForSwitch();
    }
  }, [view]);

  // Handlers
  const handleCheckOut = async () => {
    Alert.alert('Trả phòng', 'Bạn có chắc chắn muốn trả phòng này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đồng ý', onPress: async () => {
        try {
          await RoomActionService.checkOut(room.id);
          onBack();
        } catch(e) { console.error(e); }
      }},
    ]);
  };

  const handleExtend = async () => {
    Alert.alert('Gia hạn', 'Gia hạn thêm 1 tháng cho phòng này?', [
       { text: 'Hủy', style: 'cancel' },
       { text: 'Đồng ý', onPress: async () => {
         try {
           await RoomActionService.extendContract(room.id, 1);
           loadDetails();
           Alert.alert('Thành công', 'Đã gia hạn 1 tháng');
         } catch(e) { console.error(e); }
       }},
    ]);
  };

  const handleSwap = async () => {
    if (!selectedNewRoom) {return;}
    try {
      await RoomActionService.swapRoom(room.id, selectedNewRoom.id);
      Alert.alert('Thành công', 'Đã chuyển sang phòng ' + selectedNewRoom.name);
      onBack();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateEdit = async () => {
    // Updating edit logic...
    Alert.alert('Sắp ra mắt', 'Tính năng cập nhật thông tin đang được hoàn thiện.');
    setView('detail');
  };

  const isOccupied = room.contract_status === 'active';

  if (showBooking || !isOccupied) {
    return (
      <BookingScreen
         room={{ id: room.id, code: room.name, name: room.name, floor: extractFloor(room.name), price: room.price }}
         onClose={() => { setShowBooking(false); onBack(); }}
         onConfirm={async (form) => {
           try {
              await RoomActionService.checkIn(room.id, form);
              setShowBooking(false);
              onBack();
           } catch(e) { console.error(e); }
         }}
      />
    );
  }

  if (loading && isOccupied) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <ActivityIndicator size="large" color="#1565C0" />
      </SafeAreaView>
    );
  }

  const renderBadge = (occupied: boolean) => (
    <View style={[styles.badge, { backgroundColor: occupied ? '#1565C0' : '#E8F5E9' }]}>
       <Text style={{ fontSize: 11, fontWeight: '700', color: occupied ? '#fff' : '#2E7D32' }}>
         {occupied ? 'ĐANG THUÊ' : 'TRỐNG'}
       </Text>
    </View>
  );

  // 1. SWITCH VIEW
  if (view === 'switch') {
    const listForFloor = availableRooms.filter(r => extractFloor(r.name) === switchFloor);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('detail')} style={{ padding: 8 }}>
             <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đổi phòng</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.body}>
           <Text style={styles.sectionTitle}>PHÒNG HIỆN TẠI</Text>
           <View style={styles.currentRoomBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <View style={styles.iconBox}>
                    <Icon name="meeting-room" size={20} color="#1565C0" />
                 </View>
                 <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16 }}>{room.name}</Text>
                    <Text style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                       Khách: {details?.customer_name || 'Không rõ'}
                    </Text>
                 </View>
              </View>
              <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
                 <Text style={{ color: '#1565C0', fontSize: 11, fontWeight: '700' }}>Ở đây</Text>
              </View>
           </View>

           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>CHỌN PHÒNG MỚI</Text>
              <View style={{ flexDirection: 'row' }}>
                 {['1','2','3'].map(f => (
                    <TouchableOpacity
                       key={f}
                       onPress={() => setSwitchFloor(f)}
                       style={[styles.floorBtn, switchFloor === f && styles.floorBtnActive]}
                    >
                       <Text style={[styles.floorBtnText, switchFloor === f && { color: '#fff' }]}>Tầng {f}</Text>
                    </TouchableOpacity>
                 ))}
              </View>
           </View>

           {listForFloor.length === 0 ? (
             <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 20 }}>Không có phòng trống</Text>
           ) : (
             listForFloor.map(r => (
               <TouchableOpacity
                 key={r.id}
                 activeOpacity={0.8}
                 onPress={() => setSelectedNewRoom(r)}
                 style={[styles.switchRoomCard, selectedNewRoom?.id === r.id && { borderColor: '#1565C0', backgroundColor: '#F0F6FF' }]}
               >
                 <View>
                   <Text style={{ fontWeight: '700', fontSize: 15, color: '#1a1a2e' }}>{r.name}</Text>
                   <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Phòng trống</Text>
                 </View>
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Text style={{ fontWeight: '700', fontSize: 15, color: '#1565C0', marginRight: 10 }}>{formatPrice(r.price)}</Text>
                   {selectedNewRoom?.id === r.id && (
                      <View style={styles.checkIcon}>
                         <Icon name="check" size={14} color="#fff" />
                      </View>
                   )}
                 </View>
               </TouchableOpacity>
             ))
           )}

           <TouchableOpacity style={[styles.primaryBtn, { marginTop: 30 }]} onPress={handleSwap}>
              <Text style={styles.primaryBtnText}>Xác nhận đổi phòng</Text>
           </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 2. EDIT VIEW
  if (view === 'edit') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('detail')} style={{ padding: 8 }}>
             <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa</Text>
          <TouchableOpacity onPress={handleUpdateEdit} style={{ padding: 8 }}>
             <Text style={{ color: '#1565C0', fontWeight: '700', fontSize: 16 }}>Lưu</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body}>
           <Text style={styles.sectionTitle}>THÔNG TIN PHÒNG</Text>
           <View style={[styles.currentRoomBox, { marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <View style={styles.iconBox}>
                    <Icon name="meeting-room" size={20} color="#1565C0" />
                 </View>
                 <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16 }}>{room.name}</Text>
                    <Text style={{ color: '#888', fontSize: 13, marginTop: 2 }}>Trạng thái: Đang thuê</Text>
                 </View>
              </View>
              <TouchableOpacity style={styles.outlineBtnSmall} onPress={() => setView('switch')}>
                 <Text style={{ color: '#1565C0', fontSize: 12, fontWeight: '700' }}>Đổi phòng</Text>
              </TouchableOpacity>
           </View>

           <Text style={styles.sectionTitle}>THÔNG TIN KHÁCH THUÊ</Text>
           <Text style={styles.inputLabel}>Họ và tên</Text>
           <TextInput style={styles.input} value={editData.tenant} onChangeText={t => setEditData({...editData, tenant: t})} />
           <Text style={styles.inputLabel}>Số điện thoại</Text>
           <TextInput style={styles.input} value={editData.phone} onChangeText={t => setEditData({...editData, phone: t})} keyboardType="phone-pad" />
           <Text style={styles.inputLabel}>CCCD/Passport</Text>
           <TextInput style={styles.input} value={editData.cccd} onChangeText={t => setEditData({...editData, cccd: t})} />

           <Text style={[styles.sectionTitle, { marginTop: 12 }]}>DỊCH VỤ & CHI PHÍ</Text>

           <View style={styles.serviceBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                 <Icon name="home" size={20} color="#1a1a2e" style={{ marginRight: 8 }} />
                 <Text style={{ fontWeight: '700', fontSize: 15 }}>Tiền phòng</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                 <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.inputSubLabel}>Đơn giá</Text>
                    <TextInput style={styles.inputSmall} value={editData.rentPrice} onChangeText={t => setEditData({...editData, rentPrice: t})} keyboardType="numeric" />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={styles.inputSubLabel}>Số lượng</Text>
                    <TextInput style={styles.inputSmall} value="1" editable={false} />
                 </View>
              </View>
           </View>

           <View style={styles.serviceBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                 <Icon name="bolt" size={20} color="#1a1a2e" style={{ marginRight: 8 }} />
                 <Text style={{ fontWeight: '700', fontSize: 15 }}>Tiền điện</Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                 <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.inputSubLabel}>Số cũ</Text>
                    <TextInput style={styles.inputSmall} value={editData.electricOld} onChangeText={t => setEditData({...editData, electricOld: t})} keyboardType="numeric" />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={styles.inputSubLabel}>Số mới</Text>
                    <TextInput style={styles.inputSmall} value={editData.electricNew} onChangeText={t => setEditData({...editData, electricNew: t})} keyboardType="numeric" />
                 </View>
              </View>
              <Text style={styles.inputSubLabel}>Đơn giá (đ/kWh)</Text>
              <TextInput style={styles.inputSmall} value={editData.electricRate} onChangeText={t => setEditData({...editData, electricRate: t})} keyboardType="numeric" />
           </View>

           <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20, marginBottom: 40 }]} onPress={handleUpdateEdit}>
              <Text style={styles.primaryBtnText}>Cập nhật thay đổi</Text>
           </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 3. MAIN DETAIL VIEW

  // Occupied View
  const eNew = parseFloat(editData.electricNew) || 0;
  const eOld = parseFloat(editData.electricOld) || 0;
  const eRate = parseFloat(editData.electricRate) || 3500;
  const wNew = parseFloat(editData.waterNew) || 0;
  const wOld = parseFloat(editData.waterOld) || 0;
  const wRate = parseFloat(editData.waterRate) || 18000;

  const electricCost = (eNew - eOld) * eRate;
  const waterCost = (wNew - wOld) * wRate;
  const totalBill = (room.price || 0) + electricCost + waterCost;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
            <Icon name="arrow-back" size={24} color="#333" />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Chi tiết phòng</Text>
         <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.body}>
         <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={[styles.iconBox, { width: 48, height: 48, borderRadius: 14 }]}>
               <Icon name="meeting-room" size={28} color="#1565C0" />
            </View>
            <View style={{ marginLeft: 16 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: '#1a1a2e', marginRight: 10 }}>{room.name}</Text>
                  {renderBadge(true)}
               </View>
               <Text style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                 Checkout: {details?.end_date ? new Date(details.end_date).toLocaleDateString('vi-VN') : '---'}
               </Text>
            </View>
         </View>

         <View style={styles.divider} />
         <Text style={styles.sectionTitle}>THÔNG TIN KHÁCH HÀNG</Text>

         <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Icon name="person" size={20} color="#1565C0" />
               <Text style={styles.infoLabel}>Họ và tên</Text>
            </View>
            <Text style={styles.infoValue}>{details?.customer_name || 'Không rõ'}</Text>
         </View>
         <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Icon name="phone" size={20} color="#1565C0" />
               <Text style={styles.infoLabel}>Số điện thoại</Text>
            </View>
            <Text style={styles.infoValue}>{details?.customer_phone || '---'}</Text>
         </View>

         <View style={styles.divider} />
         <Text style={styles.sectionTitle}>DỊCH VỤ & TIỀN PHÒNG</Text>

         <View style={styles.serviceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Icon name="home" size={24} color="#1a1a2e" />
               <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15 }}>Tiền thuê phòng</Text>
                  <Text style={{ fontSize: 13, color: '#888' }}>Giá cố định / tháng</Text>
               </View>
            </View>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#1565C0' }}>{formatPrice(room.price)}</Text>
         </View>

         <View style={styles.divider} />

         <View style={styles.serviceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Icon name="bolt" size={24} color="#E65100" />
               <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15 }}>Điện</Text>
                  <Text style={{ fontSize: 13, color: '#888' }}>Cũ: {eOld}  Mới: {eNew} (Giảo định)</Text>
               </View>
            </View>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#1565C0' }}>{formatPrice(electricCost)}</Text>
         </View>

         <View style={styles.divider} />

         <View style={styles.serviceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Icon name="water-drop" size={24} color="#0288D1" />
               <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15 }}>Nước</Text>
                  <Text style={{ fontSize: 13, color: '#888' }}>Cũ: {wOld}  Mới: {wNew} (Giả định)</Text>
               </View>
            </View>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#1565C0' }}>{formatPrice(waterCost)}</Text>
         </View>

         <View style={styles.divider} />
         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#555' }}>Tạm tính:</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1565C0' }}>{formatPrice(totalBill)}</Text>
         </View>

         <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20, backgroundColor: '#FF4444' }]} onPress={handleCheckOut}>
            <Text style={styles.primaryBtnText}>Trả phòng (Check-out)</Text>
         </TouchableOpacity>

         <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, paddingBottom: 40 }}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleExtend}>
               <Text style={styles.secondaryBtnText}>Gia hạn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#E0E0E0', backgroundColor: '#fff' }]} onPress={() => setView('edit')}>
               <Text style={[styles.secondaryBtnText, { color: '#444' }]}>Chỉnh sửa</Text>
            </TouchableOpacity>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#1565C0',
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F0F6FF',
    borderWidth: 1.5,
    borderColor: '#1565C0',
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '700',
  },
  currentRoomBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
  },
  outlineBtnSmall: {
    borderWidth: 1,
    borderColor: '#1565C0',
    backgroundColor: '#F0F6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  floorBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginLeft: 6,
  },
  floorBtnActive: {
    backgroundColor: '#1565C0',
  },
  floorBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  switchRoomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 14,
    color: '#1a1a2e',
  },
  serviceBox: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  inputSubLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  inputSmall: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#1a1a2e',
  },
});
