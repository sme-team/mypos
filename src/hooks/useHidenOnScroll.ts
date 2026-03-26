import {useRef} from 'react';
import {Animated} from 'react-native';

export default function useHideOnScroll(height: number = 60) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerOffset = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{nativeEvent: {contentOffset: {y: scrollY}}}],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastScrollY.current;

        // Không xử lý khi scroll quá đầu (bounce effect iOS)
        if (currentY < 0) {return;}

        if (diff > 0) {
          // Scroll xuống → ẩn header
          Animated.timing(headerOffset, {
            toValue: -height,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else if (diff < -10) {
          // Scroll lên > 10px → hiện lại header
          // threshold 10px tránh hiện lại khi chỉ rung nhẹ
          Animated.timing(headerOffset, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }

        lastScrollY.current = currentY;
      },
    },
  );

  return {
    translateY: headerOffset,
    onScroll,
  };
}
