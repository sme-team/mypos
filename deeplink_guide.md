# Hướng dẫn cấu hình Deep Link cho myPOS

Deep Link Scheme hiện tại: `mypos://`

## 1. Cấu hình cho Android
Mở file `android/app/src/main/AndroidManifest.xml`

Tìm thẻ `<activity>` chính (thường là `<activity android:name=".MainActivity" ...>`) và thêm thẻ `<intent-filter>` sau đây vào bên trong:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <!-- Cấu hình scheme mypos:// -->
    <data android:scheme="mypos" />
</intent-filter>
```

**Lưu ý:** Nếu app của bạn có cấu hình `launchMode="singleTask"` (hoặc tương tự) trong thẻ `<activity>`, khi bấm deep link lúc app đang mở nó sẽ chỉ trigger sự kiện `Linking.addEventListener` chứ không tải lại app từ đầu, điều này tốt cho hiệu suất và là default của React Native CLI.

## 2. Cấu hình cho iOS
Mở file `ios/myPos/Info.plist`

Thêm đoạn mã sau đây vào trước thẻ đóng `</dict>` ở cuối file:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>mypos</string>
    </array>
    <key>CFBundleURLName</key>
    <string>mypos</string>
  </dict>
</array>
```

**Nếu bạn sử dụng React Native >= 0.60**, cấu hình ở Android/iOS là đủ do React Native CLI đã liên kết sẵn thư viện `Linking`.
Tuy nhiên, để iOS handle URL chính xác tới React Native khi app đã mở hoặc đang chạy nền, bạn cần kiểm tra file `ios/myPos/AppDelegate.mm` (hoặc `AppDelegate.m`), đảm bảo có đoạn code linking callback:

```objc
#import <React/RCTLinkingManager.h>

// Thêm phương thức này vào thân AppDelegate implementation:
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}
```

(Tuỳ thuộc vào phiên bản mẫu template của phiên bản RN bạn đang dùng, đoạn code RCTLinkingManager này có thể đã được viết sẵn hoặc bạn chỉ cần import và thêm vô).

## 3. Tổng kết các file đã sửa chữa trong source code
Nhằm đáp ứng yêu cầu của bạn, tôi đã sửa các file sau đây:

1. `src/services/ServicesConfig/axiosConfig.ts`:
   - Dòng 48: Thay đổi parameter mặc định thành `baseUrl: string = 'http://192.168.1.104:3001'`
2. `src/services/auth.service.ts`:
   - Dòng 204: Bổ sung thêm hàm `getMe()` đóng vai trò là alias gọi thẳng tới `getCurrentUser()`.
3. `src/screens/login/PreLogin.tsx`:
   - Dòng 10: Import thêm `Linking` từ `react-native`.
   - Dòng 105: Thêm `onPress={() => Linking.openURL('http://192.168.1.104:3000/register')}` vào nút Đăng ký.
4. `src/store/authStore.tsx`:
   - Dòng 36: Import thêm `authService`
   - Dòng 123: Khai báo interface hàm `handleDeepLinkToken(token: string)`
   - Dòng 188: Triển khai logic hàm `handleDeepLinkToken`
     + Gọi `tokenManager.updateTokens(accessToken: token)`
     + Gọi `authService.getMe()` để lấy profile user
     + Lưu đè lại tokens với userId hoàn chỉnh
     + Gọi lệnh React `dispatch({ type: 'LOGIN_SUCCESS' })`
5. `App.tsx`:
   - Dòng 25: Import `Linking` từ `react-native`.
   - Dòng 57: Lấy hàm `handleDeepLinkToken` từ `useAuth()`.
   - Dòng 78: Triển khai UseEffect lắng nghe `Linking.addEventListener('url')`. Tự động extract scheme token `token=([^&]+)` và dispatch xử lý. Nếu success, điều hướng sang màn hình Dashboard.
