import {useState} from 'react';
import {Alert, Platform, PermissionsAndroid} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

interface UseImagePickerOptions {
  initialUri?: string;
  onImageSelected?: (uri: string) => void;
}

export function useImagePicker({
  initialUri,
  onImageSelected,
}: UseImagePickerOptions = {}) {
  const [imageUri, setImageUri] = useState<string | undefined>(initialUri);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickFromLibrary = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, selectionLimit: 1},
      response => {
        if (response.didCancel || response.errorCode) return;
        const uri = response.assets?.[0]?.uri;
        if (uri) {
          setImageUri(uri);
          onImageSelected?.(uri);
        }
      },
    );
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Không có quyền camera');
      return;
    }

    launchCamera(
      {mediaType: 'photo', quality: 0.8, cameraType: 'back'},
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Lỗi camera', response.errorMessage || '');
          return;
        }
        const uri = response.assets?.[0]?.uri;
        if (uri) {
          setImageUri(uri);
          onImageSelected?.(uri);
        }
      },
    );
  };

  const chooseImage = () => {
    Alert.alert('Hãy chọn ảnh đại diện', '', [
      {text: 'Chụp ảnh', onPress: takePhoto},
      {text: 'Thư viện', onPress: pickFromLibrary},
      {text: 'Huỷ', style: 'cancel'},
    ]);
  };

  return {imageUri, chooseImage, pickFromLibrary, takePhoto};
}
