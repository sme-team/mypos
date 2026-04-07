/**
 * Modal hỗ trợ quét mã QR trên CCCD và nhận diện chữ (OCR) từ ảnh tải lên.
 * - Bóc tách đầy đủ 7 trường từ chuỗi QR CCCD Việt Nam.
 * - Hiển thị bảng xác nhận 7 trường đẹp trước khi submit.
 * - Chỉ truyền Tên + Số CCCD lên UI, các trường còn lại lưu ngầm vào DB.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner
} from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';

const { width } = Dimensions.get('window');

// ─── Kiểu dữ liệu đầy đủ sau khi quét CCCD ───────────────────────────────
export interface CCCDData {
  idCard: string;       // Số CCCD (hiện lên UI)
  fullName: string;     // Họ tên (hiện lên UI)
  dateOfBirth: string;  // Ngày sinh (ẩn, chỉ lưu DB)
  gender: string;       // Giới tính (ẩn, chỉ lưu DB)
  address: string;      // Địa chỉ thường trú (ẩn, chỉ lưu DB)
  issuedDate: string;   // Ngày cấp (ẩn, chỉ lưu DB)
  oldIdNumber: string;  // Số CMND cũ (ẩn, chỉ lưu DB)
}

interface IDScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: CCCDData) => void;
  themedColors: any;
  t: any;
}

export const IDScannerModal: React.FC<IDScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  themedColors,
  t,
}) => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isScanning, setIsScanning] = useState(true);
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const [scannedData, setScannedData] = useState<CCCDData | null>(null); // null = đang quét, có data = hiện bảng xác nhận
  const [isProcessing, setIsProcessing] = useState(false);

  // Trì hoãn việc bật Camera để tránh lỗi "already-in-use"
  useEffect(() => {
    let timer: any;
    if (visible) {
      timer = setTimeout(() => setIsCameraInitialized(true), 500);
    } else {
      setIsCameraInitialized(false);
      setScannedData(null);
      setIsScanning(true);
    }
    return () => clearTimeout(timer);
  }, [visible]);

  // Yêu cầu quyền truy cập Camera
  useEffect(() => {
    if (visible && !hasPermission) requestPermission();
  }, [visible, hasPermission]);

  /**
   * Bóc tách TOÀN BỘ 7 trường từ chuỗi QR CCCD Việt Nam.
   * Định dạng: Số CCCD | Số CMND cũ | Họ tên | Ngày sinh | Giới tính | Địa chỉ | Ngày cấp
   */
  const parseCCCDQRCode = (rawString: string): CCCDData | null => {
    const parts = rawString.split('|');
    if (parts.length >= 7) {
      return {
        idCard: parts[0]?.trim() || '',
        oldIdNumber: parts[1]?.trim() || '',
        fullName: parts[2]?.trim() || '',
        dateOfBirth: formatDate(parts[3]?.trim() || ''),
        gender: formatGender(parts[4]?.trim() || ''),
        address: parts[5]?.trim() || '',
        issuedDate: formatDate(parts[6]?.trim() || ''),
      };
    }
    // Hỗ trợ định dạng ngắn hơn (tối thiểu 3 trường)
    if (parts.length >= 3) {
      return {
        idCard: parts[0]?.trim() || '',
        oldIdNumber: parts[1]?.trim() || '',
        fullName: parts[2]?.trim() || '',
        dateOfBirth: parts[3]?.trim() || '',
        gender: formatGender(parts[4]?.trim() || ''),
        address: parts[5]?.trim() || '',
        issuedDate: parts[6]?.trim() || '',
      };
    }
    return null;
  };

  /** Định dạng ngày DDMMYYYY → DD/MM/YYYY */
  const formatDate = (raw: string): string => {
    if (!raw || raw.length < 8) return raw;
    return `${raw.substring(0, 2)}/${raw.substring(2, 4)}/${raw.substring(4)}`;
  };

  /** Dịch giới tính từ tiếng Anh hoặc mã số */
  const formatGender = (raw: string): string => {
    const lower = raw.toLowerCase();
    if (lower === 'male' || lower === 'nam' || lower === '1') return 'Nam';
    if (lower === 'female' || lower === 'nữ' || lower === '0') return 'Nữ';
    return raw;
  };

  // ─── Code Scanner (QR) ──────────────────────────────────────────────────
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && isScanning && !scannedData) {
        setIsScanning(false);
        const rawValue = codes[0].value;
        if (rawValue) {
          const result = parseCCCDQRCode(rawValue);
          if (result) {
            setScannedData(result); // Hiện màn hình xác nhận
          } else {
            Alert.alert('Không hợp lệ', 'Mã QR này không phải CCCD gắn chíp Việt Nam.', [
              { text: 'Thử lại', onPress: () => setIsScanning(true) }
            ]);
          }
        }
      }
    }
  });

  // ─── OCR (chọn ảnh từ thư viện) ─────────────────────────────────────────
  const handlePickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: false });
    if (!result.assets?.[0]?.uri) return;

    setIsProcessing(true);
    try {
      const visionResult = await TextRecognition.recognize(result.assets[0].uri);
      const text = visionResult.text;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      // Tìm số CCCD (12 chữ số)
      const idCardMatch = text.match(/\d{12}/);
      const idCard = idCardMatch ? idCardMatch[0] : '';

      // Tìm họ tên (dòng chứa từ khóa "Full name" hoặc "Họ và tên")
      let fullName = '';
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (lower.includes('full name') || lower.includes('họ và tên') || lower.includes('ho va ten')) {
          fullName = lines[i].includes(':') ? lines[i].split(':')[1].trim() : (lines[i + 1] ?? '').trim();
          break;
        }
      }
      // Fallback: dòng toàn chữ hoa
      if (!fullName) {
        const upper = lines.find(l => l.length > 5 && l === l.toUpperCase() && !/\d/.test(l));
        if (upper) fullName = upper;
      }

      // Tìm ngày sinh (định dạng DD/MM/YYYY hoặc ngày tháng năm)
      const dobMatch = text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
      const dateOfBirth = dobMatch ? dobMatch[0] : '';

      setScannedData({
        idCard,
        fullName: fullName.toUpperCase(),
        dateOfBirth,
        gender: '',
        address: '',
        issuedDate: '',
        oldIdNumber: '',
      });
    } catch {
      Alert.alert('Lỗi', 'Không thể nhận diện chữ từ ảnh này.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRescan = () => {
    setScannedData(null);
    setIsScanning(true);
  };

  const handleConfirm = () => {
    if (scannedData) {
      onScanned(scannedData);
    }
  };

  if (!visible) return null;

  // ─── Màn hình xác nhận (sau khi quét xong) ──────────────────────────────
  if (scannedData) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={[styles.container, { backgroundColor: themedColors.bg }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleRescan} style={styles.closeBtn}>
              <Icon name="arrow-back" size={24} color={themedColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themedColors.text }]}>Xác nhận thông tin</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.confirmContainer}>
            {/* Icon thành công */}
            <View style={[styles.successBadge, { backgroundColor: themedColors.primaryLight }]}>
              <Icon name="verified-user" size={48} color={themedColors.primary} />
              <Text style={[styles.successTitle, { color: themedColors.primary }]}>Quét CCCD thành công</Text>
              <Text style={[styles.successSub, { color: themedColors.textSecondary }]}>
                Vui lòng kiểm tra thông tin trước khi xác nhận
              </Text>
            </View>

            {/* Bảng thông tin 7 trường */}
            <View style={[styles.infoCard, { backgroundColor: themedColors.surface, borderColor: themedColors.border }]}>
              <InfoRow icon="badge" label="Số CCCD" value={scannedData.idCard} highlight themedColors={themedColors} />
              <InfoRow icon="person" label="Họ và tên" value={scannedData.fullName} highlight themedColors={themedColors} />
              <Divider themedColors={themedColors} />
              <InfoRow icon="cake" label="Ngày sinh" value={scannedData.dateOfBirth || '—'} themedColors={themedColors} />
              <InfoRow icon="wc" label="Giới tính" value={scannedData.gender || '—'} themedColors={themedColors} />
              <InfoRow icon="home" label="Địa chỉ" value={scannedData.address || '—'} themedColors={themedColors} />
              <InfoRow icon="calendar-today" label="Ngày cấp" value={scannedData.issuedDate || '—'} themedColors={themedColors} />
              {scannedData.oldIdNumber ? (
                <InfoRow icon="history" label="Số CMND cũ" value={scannedData.oldIdNumber} themedColors={themedColors} />
              ) : null}
            </View>

            <Text style={[styles.noteText, { color: themedColors.textSecondary }]}>
              💡 Sau khi xác nhận, Họ tên và Số CCCD sẽ hiện trên form. Các thông tin khác sẽ được lưu lại hệ thống.
            </Text>
          </ScrollView>

          {/* Nút hành động */}
          <View style={[styles.confirmFooter, { backgroundColor: themedColors.surface, borderColor: themedColors.border }]}>
            <TouchableOpacity style={[styles.rescanBtn, { borderColor: themedColors.border }]} onPress={handleRescan}>
              <Icon name="qr-code-scanner" size={20} color={themedColors.text} />
              <Text style={[styles.rescanBtnText, { color: themedColors.text }]}>Quét lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: themedColors.primary }]} onPress={handleConfirm}>
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // ─── Màn hình quét Camera ────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.bg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="close" size={24} color={themedColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themedColors.text }]}>Quét CCCD / Passport</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.cameraContainer}>
          {hasPermission && device ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible && isScanning && isCameraInitialized}
              codeScanner={codeScanner}
            />
          ) : (
            <View style={styles.noPermissionView}>
              <Icon name="no-photography" size={48} color={themedColors.textSecondary} />
              <Text style={[{ color: themedColors.textSecondary, textAlign: 'center', marginTop: 12 }]}>
                Chưa có quyền truy cập Camera.{'\n'}Hãy cấp quyền trong Cài đặt hoặc sử dụng tính năng tải ảnh bên dưới.
              </Text>
            </View>
          )}

          {/* Khung quét QR */}
          <View style={styles.overlay}>
            <View style={[styles.scanFrame, { borderColor: themedColors.primary }]}>
              {/* 4 góc khung */}
              <View style={[styles.corner, styles.topLeft, { borderColor: themedColors.primary }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: themedColors.primary }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: themedColors.primary }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: themedColors.primary }]} />
            </View>
            <Text style={styles.hintText}>Đưa mã QR trên CCCD vào khung</Text>
          </View>
        </View>

        <View style={styles.footer}>
          {isProcessing ? (
            <ActivityIndicator size="large" color={themedColors.primary} style={{ marginBottom: 16 }} />
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: themedColors.primary }]}
              onPress={handlePickImage}
            >
              <Icon name="photo-library" size={22} color="#fff" />
              <Text style={styles.actionBtnText}>Tải ảnh CCCD lên (OCR)</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.tipText, { color: themedColors.textSecondary }]}>
            💡 Gợi ý: Quét mã QR mặt sau CCCD để lấy đầy đủ thông tin.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const InfoRow = ({ icon, label, value, highlight, themedColors }: any) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowLeft}>
      <Icon name={icon} size={18} color={highlight ? themedColors.primary : themedColors.textSecondary} />
      <Text style={[styles.infoLabel, { color: themedColors.textSecondary }]}>{label}</Text>
    </View>
    <Text
      style={[styles.infoValue, {
        color: highlight ? themedColors.primary : themedColors.text,
        fontWeight: highlight ? '700' : '500',
      }]}
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

const Divider = ({ themedColors }: any) => (
  <View style={[styles.divider, { backgroundColor: themedColors.border }]} />
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, zIndex: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: 4 },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  noPermissionView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  overlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center',
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scanFrame: {
    width: width * 0.7, height: width * 0.7,
    backgroundColor: 'transparent', position: 'relative',
  },
  corner: { position: 'absolute', width: 24, height: 24, borderWidth: 3 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  hintText: {
    color: '#fff', marginTop: 20, fontWeight: '600', fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  footer: { padding: 24, alignItems: 'center' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, gap: 10, width: '100%',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  tipText: { marginTop: 16, fontSize: 12, textAlign: 'center' },

  // Xác nhận
  confirmContainer: { padding: 20, paddingBottom: 40 },
  successBadge: {
    alignItems: 'center', padding: 24, borderRadius: 16, marginBottom: 20,
  },
  successTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  successSub: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  infoCard: {
    borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 14, textAlign: 'right', flex: 1.2 },
  divider: { height: 1, marginHorizontal: 16 },
  noteText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  confirmFooter: {
    flexDirection: 'row', gap: 12, padding: 20,
    borderTopWidth: 1,
  },
  rescanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 8,
  },
  rescanBtnText: { fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
