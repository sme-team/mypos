/**
 * Modal hỗ trợ quét mã QR trên CCCD và nhận diện chữ (OCR) từ ảnh tải lên.
 * - Bóc tách đầy đủ 7 trường từ chuỗi QR CCCD Việt Nam.
 * - Hiển thị bảng xác nhận 7 trường đẹp trước khi submit.
 * - Chỉ truyền Tên + Số CCCD lên UI, các trường còn lại lưu ngầm vào DB.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  TextInput,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
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
  placeOfOrigin: string; // Quê quán (ẩn, chỉ lưu DB)
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
  const [isCameraActive, setIsCameraActive] = useState(false); // Camera đã sẵn sàng và đang chạy
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<CCCDData | null>(null); // null = đang quét, có data = hiện bảng xác nhận
  const [isProcessing, setIsProcessing] = useState(false);
  const [editMode, setEditMode] = useState(false); // Chế độ chỉnh sửa
  const [editableData, setEditableData] = useState<CCCDData | null>(null); // Data đang chỉnh sửa

  // Trì hoãn việc bật Camera để tránh lỗi "already-in-use" trên một số thiết bị
  useEffect(() => {
    let timer: any;
    if (visible) {
      timer = setTimeout(() => setIsCameraInitialized(true), 200);
    } else {
      setIsCameraInitialized(false);
      setIsCameraActive(false);
      setCameraError(null);
      setScannedData(null);
      setIsScanning(true);
    }
    return () => clearTimeout(timer);
  }, [visible]);

  // Yêu cầu quyền truy cập Camera
  useEffect(() => {
    if (visible && !hasPermission) {requestPermission();}
  }, [visible, hasPermission]);

  const parseCCCDQRCode = (rawString: string): CCCDData | null => {
    if (!rawString) {return null;}
    console.log('[IDScanner] Raw scanned string:', rawString);

    // Một số QR có thể bị dính ký tự lạ ở đầu/cuối
    const cleanString = rawString.trim();
    const parts = cleanString.split('|');

    // Định dạng CCCD gắn chip chuẩn là 7 trường
    // Tuy nhiên một số loại thẻ cũ hoặc quét lỗi có thể ít hơn
    // Lưu ý: QR CCCD không chứa thông tin Quê quán, cần OCR từ ảnh
    if (parts.length >= 3) {
      return {
        idCard: parts[0]?.trim() || '',
        oldIdNumber: parts[1]?.trim() || '',
        fullName: parts[2]?.trim() || '',
        dateOfBirth: parts[3] ? formatDate(parts[3].trim()) : '',
        gender: parts[4] ? formatGender(parts[4].trim()) : '',
        address: parts[5]?.trim() || '',
        placeOfOrigin: '', // QR CCCD không chứa quê quán, cần OCR từ ảnh
      };
    }

    return null;
  };

  /** Định dạng ngày DDMMYYYY → DD/MM/YYYY */
  const formatDate = (raw: string): string => {
    if (!raw || raw.length < 8) {return raw;}
    return `${raw.substring(0, 2)}/${raw.substring(2, 4)}/${raw.substring(4)}`;
  };

  /** Dịch giới tính từ tiếng Anh hoặc mã số */
  const formatGender = (raw: string): string => {
    const lower = raw.toLowerCase();
    if (lower === 'male' || lower === 'nam' || lower === '1') {return t('gender.male', 'Nam');}
    if (lower === 'female' || lower === 'nữ' || lower === '0') {return t('gender.female', 'Nữ');}
    return raw;
  };

  // Cấu hình Scanner với nhiều loại mã hơn để tăng khả năng nhận diện
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'aztec', 'data-matrix', 'pdf-417'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && isScanning && !scannedData) {
        const firstCode = codes[0];
        if (firstCode.value) {
          console.log('[IDScanner] Code detected:', firstCode.type, firstCode.value);
          setIsScanning(false); // Tạm dừng quét
          const result = parseCCCDQRCode(firstCode.value);
          if (result) {
            setScannedData(result); // Hiện màn hình xác nhận
          } else {
            console.warn('[IDScanner] Parse failed for:', firstCode.value);
            Alert.alert(
              t('idScanner.invalid'),
              `${t('idScanner.invalidDesc')}\n\nRaw: ${firstCode.value.substring(0, 50)}...`,
              [{ text: t('idScanner.btnRetry'), onPress: () => setIsScanning(true) }]
            );
          }
        }
      }
    },
  });

  // ─── OCR (chọn ảnh từ thư viện) ─────────────────────────────────────────
  const handlePickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: false });
    if (!result.assets?.[0]?.uri) {return;}

    setIsProcessing(true);
    try {
      const visionResult = await TextRecognition.recognize(result.assets[0].uri);
      const text = visionResult.text;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      console.log('[OCR] Raw text:', text);
      console.log('[OCR] Lines:', lines);

      // Tìm số CCCD (12 chữ số)
      const idCardMatch = text.match(/\d{12}/);
      const idCard = idCardMatch ? idCardMatch[0] : '';

      // Tìm họ tên (dòng chứa từ khóa "Full name", "Họ và tên", "Họ tên")
      let fullName = '';
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (lower.includes('full name') || lower.includes('họ và tên') || lower.includes('ho va ten') ||
            lower.includes('họ tên') || lower.includes('ho ten') || lower.includes('name')) {
          // Nếu dòng chứa dấu :, lấy phần sau dấu :
          if (lines[i].includes(':')) {
            fullName = lines[i].split(':').slice(1).join(':').trim();
          } else {
            // Nếu không có dấu :, lấy dòng tiếp theo
            fullName = (lines[i + 1] ?? '').trim();
          }
          break;
        }
      }
      // Fallback 1: Tìm dòng chứa chữ hoa có dấu tiếng Việt (thường là tên)
      // Loại trừ các dòng chứa từ khóa như "Số", "No", "ID", "CCCD", "NUMBER", "CARD"
      if (!fullName) {
        const namePattern = lines.find(l =>
          l.length > 5 &&
          l.length < 50 &&
          !/\d/.test(l) &&
          !/\b(SỐ|SO|NO\.?|N[Oo]|ID|CCCD|IDENTITY|NUMBER|NUM|CARD|CMT)\b/i.test(l) && // Loại trừ nhiều từ khóa hơn
          /^[A-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶĐÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ\s]+$/.test(l)
        );
        if (namePattern) {
          console.log('[OCR] Found name pattern (with accents):', namePattern);
          fullName = namePattern;
        }
      }
      // Fallback 2: dòng toàn chữ hoa không dấu
      // Loại trừ các dòng chứa từ khóa như "SO", "NO", "ID", "NUMBER", "CARD"
      if (!fullName) {
        const upper = lines.find(l =>
          l.length > 5 &&
          l === l.toUpperCase() &&
          !/\d/.test(l) &&
          !/\b(SO|NO|ID|NUMBER|NUM|CARD|CMT)\b/.test(l) // Loại trừ nhiều từ khóa hơn
        );
        if (upper) {
          console.log('[OCR] Found name pattern (uppercase):', upper);
          fullName = upper;
        }
      }
      // Fallback 3: Tìm dòng có 2-4 từ, mỗi từ bắt đầu bằng chữ hoa (kiểu tên người)
      // Loại trừ các dòng chứa từ khóa không phải tên
      if (!fullName) {
        const wordPattern = lines.find(l =>
          l.length > 5 &&
          l.length < 50 &&
          !/\d/.test(l) &&
          !/\b(SỐ|SO|NO\.?|N[Oo]|ID|CCCD|IDENTITY|NUMBER|NUM|CARD|CMT|FULL|NAME|GIOI|TINH|NGAY|SINH|DIA|CHI|QUE|QUAN)\b/i.test(l) &&
          /^[A-Z][a-zÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶĐÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]+(\s[A-Z][a-zÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶĐÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]+){1,3}$/.test(l)
        );
        if (wordPattern) {
          console.log('[OCR] Found name pattern (word case):', wordPattern);
          fullName = wordPattern;
        }
      }

      // Tìm ngày sinh (định dạng DD/MM/YYYY, DD-MM-YYYY, hoặc YYYY-MM-DD)
      let dateOfBirth = '';
      const dobPatterns = [
        /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/,  // DD/MM/YYYY hoặc DD-MM-YYYY
        /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,  // YYYY/MM/DD hoặc YYYY-MM-DD
      ];
      for (const pattern of dobPatterns) {
        const dobMatch = text.match(pattern);
        if (dobMatch) {
          dateOfBirth = dobMatch[0];
          break;
        }
      }
      // Nếu tìm thấy từ khóa "Ngày sinh" hoặc "Date of birth", ưu tiên lấy ngày gần đó
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (lower.includes('ngày sinh') || lower.includes('ngay sinh') || lower.includes('date of birth') || lower.includes('dob')) {
          // Tìm ngày trong dòng hiện tại hoặc dòng tiếp theo
          const lineToCheck = lines[i] + ' ' + (lines[i + 1] ?? '');
          const dateMatch = lineToCheck.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
          if (dateMatch) {
            dateOfBirth = dateMatch[0];
            break;
          }
        }
      }

      // Tìm giới tính
      let gender = '';
      const genderMatch = text.match(/(Nam|Nữ|Male|Female|Giới tính|Gender)/i);
      if (genderMatch) {
        const genderText = genderMatch[0].toLowerCase();
        if (genderText.includes('nam') || genderText.includes('male')) {gender = 'Nam';}
        else if (genderText.includes('nữ') || genderText.includes('female')) {gender = 'Nữ';}
      }
      // Fallback: tìm "Nam" hoặc "Nữ" đứng riêng hoặc sau từ khóa
      if (!gender) {
        for (let i = 0; i < lines.length; i++) {
          const lower = lines[i].toLowerCase();
          if (lower.includes('giới tính') || lower.includes('gioi tinh') || lower.includes('sex') || lower.includes('gender')) {
            // Kiểm tra dòng hiện tại và dòng tiếp theo
            const checkText = (lines[i] + ' ' + (lines[i + 1] ?? '')).toLowerCase();
            if (checkText.includes('nam')) {gender = 'Nam';}
            else if (checkText.includes('nữ') || checkText.includes('nu')) {gender = 'Nữ';}
            break;
          }
        }
      }
      if (!gender) {
        if (text.includes(' Nam ')) {gender = 'Nam';}
        else if (text.includes(' Nữ ')) {gender = 'Nữ';}
      }

      // Tìm Quê quán (Place of origin) - TRƯỜNG MỚI
      let placeOfOrigin = '';
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (lower.includes('quê quán') || lower.includes('que quan') || lower.includes('place of origin') || lower.includes('native place')) {
          if (lines[i].includes(':')) {
            placeOfOrigin = lines[i].split(':').slice(1).join(':').trim();
          } else {
            placeOfOrigin = (lines[i + 1] ?? '').trim();
          }
          break;
        }
      }
      // Nếu không tìm được quê quán, thử tìm theo pattern địa chỉ-like trước khi tìm địa chỉ
      if (!placeOfOrigin) {
        // Tìm dòng có chứa tỉnh/thành phố nhưng không có số nhà (thường là quê quán)
        const originLikeLine = lines.find(l =>
          !/\d/.test(l) && // Không có số (khác với địa chỉ thường có số nhà)
          (l.toLowerCase().includes('tỉnh') || l.toLowerCase().includes('thành phố') ||
           l.toLowerCase().includes('tp.') || l.toLowerCase().includes('huyện') ||
           l.toLowerCase().includes('quận') || l.toLowerCase().includes('province') ||
           l.toLowerCase().includes('city')) &&
          l.length > 10 && l.length < 100
        );
        if (originLikeLine) {placeOfOrigin = originLikeLine;}
      }

      // Tìm Địa chỉ thường trú (thường sau từ khóa "Địa chỉ" hoặc "Nơi thường trú")
      let address = '';
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (lower.includes('địa chỉ') || lower.includes('nơi thường trú') || lower.includes('dia chi') ||
            lower.includes('place of residence') || lower.includes('residence')) {
          if (lines[i].includes(':')) {
            address = lines[i].split(':').slice(1).join(':').trim();
          } else {
            address = (lines[i + 1] ?? '').trim();
          }
          break;
        }
      }
      // Nếu không tìm được, lấy dòng dài nhất có thể là địa chỉ (thường chứa số nhà, đường, phường...)
      if (!address) {
        const addressLikeLine = lines.find(l =>
          /\d/.test(l) && // Có số (số nhà)
          (l.toLowerCase().includes('đường') || l.toLowerCase().includes('phố') ||
           l.toLowerCase().includes('phường') || l.toLowerCase().includes('quận') ||
           l.toLowerCase().includes('huyện') || l.toLowerCase().includes('thành phố') ||
           l.toLowerCase().includes('tỉnh') || l.toLowerCase().includes('street') ||
           l.toLowerCase().includes('district') || l.toLowerCase().includes('ward'))
        );
        if (addressLikeLine) {address = addressLikeLine;}
      }

      const scannedResult: CCCDData = {
        idCard,
        fullName: fullName.toUpperCase(),
        dateOfBirth,
        gender,
        address,
        placeOfOrigin,
        oldIdNumber: '',
      };

      console.log('[OCR] Extracted data:', scannedResult);
      setScannedData(scannedResult);
    } catch (error) {
      console.error('[OCR] Error:', error);
      Alert.alert(t('common.error'), t('idScanner.ocrError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRescan = () => {
    setScannedData(null);
    setEditableData(null);
    setEditMode(false);
    setIsScanning(true);
  };

  const handleEdit = () => {
    setEditableData({ ...scannedData! });
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditableData(null);
  };

  const handleSaveEdit = () => {
    if (editableData) {
      setScannedData(editableData);
      setEditMode(false);
    }
  };

  const updateEditableField = useCallback((field: keyof CCCDData, value: string) => {
    setEditableData(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const handleConfirm = () => {
    if (scannedData) {
      onScanned(scannedData);
    }
  };

  if (!visible) {return null;}

  // ─── Màn hình xác nhận (sau khi quét xong) ──────────────────────────────
  if (scannedData) {
    const data = editMode && editableData ? editableData : scannedData;
    const hasMissingData = !data.dateOfBirth || !data.gender || !data.address || !data.placeOfOrigin;

    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={[styles.container, { backgroundColor: themedColors.bg }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={editMode ? handleCancelEdit : handleRescan} style={styles.closeBtn}>
              <Icon name={editMode ? 'close' : 'arrow-back'} size={24} color={themedColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themedColors.text }]}>
              {editMode ? t('idScanner.editTitle') : t('idScanner.confirmTitle')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.confirmContainer}
            removeClippedSubviews={true}
            scrollEventThrottle={16}
            automaticallyAdjustContentInsets={false}>
            {/* Icon thành công / Edit mode */}
            <View style={[styles.successBadge, { backgroundColor: editMode ? themedColors.warningLight : themedColors.primaryLight }]}>
              <Icon name={editMode ? 'edit' : 'verified-user'} size={48} color={editMode ? themedColors.warning : themedColors.primary} />
              <Text style={[styles.successTitle, { color: editMode ? themedColors.warning : themedColors.primary }]}>
                {editMode ? t('idScanner.editTitle') : t('idScanner.successTitle')}
              </Text>
              <Text style={[styles.successSub, { color: themedColors.textSecondary }]}>
                {editMode ? t('idScanner.editSub') : t('idScanner.successSub')}
              </Text>
            </View>

            {/* Hiển thị cảnh báo nếu thiếu dữ liệu */}
            {hasMissingData && !editMode && (
              <View style={[styles.warningBadge, { backgroundColor: themedColors.warningLight }]}>
                <Icon name="warning" size={20} color={themedColors.warning} />
                <Text style={[styles.warningText, { color: themedColors.warning }]}>
                  {t('idScanner.missingWarning')}
                </Text>
              </View>
            )}

            {/* Bảng thông tin 7 trường - Edit hoặc View mode */}
            <View style={[styles.infoCard, { backgroundColor: themedColors.surface, borderColor: themedColors.border }]}>
              {editMode ? (
                // Edit mode - Input fields
                <>
                  <EditRow icon="badge" label={t('idScanner.idCard')} value={data.idCard}
                    onChange={(val: string) => updateEditableField('idCard', val)} themedColors={themedColors} />
                  <EditRow icon="person" label={t('idScanner.fullName')} value={data.fullName}
                    onChange={(val: string) => updateEditableField('fullName', val)} themedColors={themedColors} />
                  <Divider themedColors={themedColors} />
                  <EditRow icon="cake" label={t('idScanner.dob')} value={data.dateOfBirth}
                    placeholder="DD/MM/YYYY"
                    onChange={(val: string) => updateEditableField('dateOfBirth', val)} themedColors={themedColors} />
                  <EditRow icon="wc" label={t('idScanner.gender')} value={data.gender}
                    placeholder={t('idScanner.gender_placeholder', 'Nam/Nữ')}
                    onChange={(val: string) => updateEditableField('gender', val)} themedColors={themedColors} />
                  <EditRow icon="home" label={t('idScanner.address')} value={data.address}
                    placeholder={t('idScanner.address_placeholder', 'Số nhà, đường, phường...')}
                    onChange={(val: string) => updateEditableField('address', val)} themedColors={themedColors} multiline />
                  <EditRow icon="location-city" label={t('idScanner.placeOfOrigin', 'Quê quán')} value={data.placeOfOrigin}
                    placeholder={t('idScanner.placeOfOriginPlaceholder', 'Tỉnh/Thành phố...')}
                    onChange={(val: string) => updateEditableField('placeOfOrigin', val)} themedColors={themedColors} />
                </>
              ) : (
                // View mode - Display only
                <>
                  <InfoRow icon="badge" label={t('idScanner.idCard')} value={data.idCard} highlight themedColors={themedColors} t={t} />
                  <InfoRow icon="person" label={t('idScanner.fullName')} value={data.fullName} highlight themedColors={themedColors} t={t} />
                  <Divider themedColors={themedColors} />
                  <InfoRow icon="cake" label={t('idScanner.dob')} value={data.dateOfBirth || '—'} themedColors={themedColors} missing={!data.dateOfBirth} t={t} />
                  <InfoRow icon="wc" label={t('idScanner.gender')} value={data.gender || '—'} themedColors={themedColors} missing={!data.gender} t={t} />
                  <InfoRow icon="home" label={t('idScanner.address')} value={data.address || '—'} themedColors={themedColors} missing={!data.address} t={t} />
                  <InfoRow icon="location-city" label={t('idScanner.placeOfOrigin', 'Quê quán')} value={data.placeOfOrigin || '—'} themedColors={themedColors} missing={!data.placeOfOrigin} t={t} />
                  {data.oldIdNumber ? (
                    <InfoRow icon="history" label={t('idScanner.oldId')} value={data.oldIdNumber} themedColors={themedColors} t={t} />
                  ) : null}
                </>
              )}
            </View>

            <Text style={[styles.noteText, { color: themedColors.textSecondary }]}>
              {editMode ? t('idScanner.editNote') : t('idScanner.note')}
            </Text>
          </ScrollView>

          {/* Nút hành động */}
          <View style={[styles.confirmFooter, { backgroundColor: themedColors.surface, borderColor: themedColors.border }]}>
            {editMode ? (
              // Edit mode buttons
              <>
                <TouchableOpacity style={[styles.rescanBtn, { borderColor: themedColors.border }]} onPress={handleCancelEdit}>
                  <Icon name="close" size={20} color={themedColors.text} />
                  <Text style={[styles.rescanBtnText, { color: themedColors.text }]}>{t('idScanner.btnCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: themedColors.success }]} onPress={handleSaveEdit}>
                  <Icon name="save" size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>{t('idScanner.btnSave')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              // View mode buttons
              <>
                <TouchableOpacity style={[styles.editBtn, { borderColor: themedColors.border }]} onPress={handleEdit}>
                  <Icon name="edit" size={20} color={themedColors.text} />
                  <Text style={[styles.editBtnText, { color: themedColors.text }]}>{t('idScanner.btnEdit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rescanBtn, { borderColor: themedColors.border }]} onPress={handleRescan}>
                  <Icon name="qr-code-scanner" size={20} color={themedColors.text} />
                  <Text style={[styles.rescanBtnText, { color: themedColors.text }]}>{t('idScanner.btnRescan')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: themedColors.primary }]} onPress={handleConfirm}>
                  <Icon name="check-circle" size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>{t('idScanner.btnConfirm')}</Text>
                </TouchableOpacity>
              </>
            )}
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
          <Text style={[styles.headerTitle, { color: themedColors.text }]}>{t('idScanner.scanTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.cameraContainer}>
          {hasPermission && device ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible && isScanning && isCameraInitialized}
              codeScanner={codeScanner}
              pixelFormat={Platform.OS === 'android' ? 'yuv' : 'rgb'}
              enableZoomGesture={true}
              photo={false}
              video={false}
              audio={false}
              onInitialized={() => {
                console.log('[IDScanner] Camera initialized and active');
                setIsCameraActive(true);
              }}
              onError={(e) => {
                console.error('[IDScanner] Camera Error:', e);
                setCameraError(e.message);
              }}
            />
          ) : (
            <View style={styles.noPermissionView}>
              <Icon name="no-photography" size={48} color={themedColors.textSecondary} />
              <Text style={[{ color: themedColors.textSecondary, textAlign: 'center', marginTop: 12 }]}>
                {cameraError ? `${t('idScanner.cameraError', 'Lỗi Camera')}: ${cameraError}` : t('idScanner.cameraNoPermission')}
                {'\n'}{t('idScanner.cameraPermissionHint')}
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
            <Text style={styles.hintText}>{t('idScanner.hint', 'Đưa mã QR trên CCCD vào khung')}</Text>

            {/* Trạng thái quét - diagnostic UI */}
            <View style={[styles.statusBadge, { backgroundColor: isCameraActive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)' }]}>
              <View style={[styles.statusDot, { backgroundColor: isCameraActive ? '#4CAF50' : '#FF9800' }]} />
              <Text style={[styles.statusText, { color: isCameraActive ? '#4CAF50' : '#FF9800' }]}>
                {isCameraActive ? (isScanning ? t('idScanner.waiting', 'Đang chờ quét...') : t('idScanner.recognized', 'Đã nhận diện')) : t('idScanner.initializing', 'Đang khởi tạo...')}
              </Text>
            </View>
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
              <Text style={styles.actionBtnText}>{t('idScanner.btnPickImage')}</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.tipText, { color: themedColors.textSecondary }]}>
            {t('idScanner.tip')}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const InfoRow = ({ icon, label, value, highlight, themedColors, missing, t }: any) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowLeft}>
      <Icon name={icon} size={18} color={highlight ? themedColors.primary : (missing ? themedColors.warning : themedColors.textSecondary)} />
      <Text style={[styles.infoLabel, { color: themedColors.textSecondary }]}>{label}</Text>
    </View>
    <Text
      style={[styles.infoValue, {
        color: missing ? themedColors.warning : (highlight ? themedColors.primary : themedColors.text),
        fontWeight: highlight ? '700' : '500',
        fontStyle: missing ? 'italic' : 'normal',
      }]}
      numberOfLines={2}
    >
      {missing ? t('idScanner.missingData') : value}
    </Text>
  </View>
);

const EditRow = ({ icon, label, value, onChange, themedColors, placeholder, multiline }: any) => (
  <View style={styles.editRow}>
    <View style={styles.editRowLeft}>
      <Icon name={icon} size={18} color={themedColors.textSecondary} />
      <Text style={[styles.editLabel, { color: themedColors.textSecondary }]}>{label}</Text>
    </View>
    <TextInput
      style={[styles.editInput, {
        color: themedColors.text,
        borderColor: themedColors.border,
        backgroundColor: themedColors.surface,
        minHeight: multiline ? 60 : 40,
        textAlignVertical: multiline ? 'top' : 'center',
      }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={themedColors.textSecondary}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
    />
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
    borderRadius: 12, borderWidth: 1, marginBottom: 16,
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
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 8,
  },
  editBtnText: { fontWeight: '600', fontSize: 15 },

  // Edit mode
  warningBadge: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 8, marginBottom: 16, gap: 8,
  },
  warningText: { fontSize: 13, flex: 1 },
  editRow: {
    flexDirection: 'column',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  editRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  editLabel: { fontSize: 13 },
  editInput: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14,
  },
  statusBadge: {
    position: 'absolute',
    bottom: -60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)', // Fallback
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
