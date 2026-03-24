import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/ui/AppButton';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { CaptureAsset } from '../navigation/types';

type Props = {
  mode: 'enroll' | 'match';
  title: string;
  description: string;
  onCancel: () => void;
  onCaptured: (asset: CaptureAsset) => void;
};

export function LiveCaptureScreen({ description, mode, onCancel, onCaptured, title }: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const { height, width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [facing, setFacing] = useState<CameraType>('front');
  const [captureError, setCaptureError] = useState<string | null>(null);
  const isCompactHeight = height < 760;
  const overlaySize = useMemo(() => {
    const frameWidth = Math.min(Math.max(width * 0.62, 220), 290);
    const frameHeight = Math.min(Math.max(height * 0.42, 280), 360);
    const radius = Math.round(Math.min(frameWidth, frameHeight) / 2);

    return {
      frameHeight,
      frameWidth,
      radius,
    };
  }, [height, width]);
  const overlayTopOffset = useMemo(() => {
    return isCompactHeight ? -16 : 0;
  }, [isCompactHeight]);
  const frameRect = useMemo(() => {
    const top = height / 2 + overlayTopOffset - overlaySize.frameHeight / 2;
    const left = width / 2 - overlaySize.frameWidth / 2;

    return {
      top,
      left,
      right: left + overlaySize.frameWidth,
      bottom: top + overlaySize.frameHeight,
    };
  }, [height, overlaySize.frameHeight, overlaySize.frameWidth, overlayTopOffset, width]);
  const captureHints = getCaptureHints(mode, facing);

  async function handleCapture() {
    if (!cameraRef.current || capturing) {
      return;
    }

    setCapturing(true);
    setCaptureError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (!photo?.uri) {
        throw new Error('Camera did not return an image.');
      }

      onCaptured({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        fileName: `${mode}-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
    } catch (error) {
      if (error instanceof Error) {
        setCaptureError(error.message);
      } else {
        setCaptureError('Capture failed. Try again with the face centered in frame.');
      }
    } finally {
      setCapturing(false);
    }
  }

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-pitch px-6">
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text className="mt-4 text-sm text-stone-300">Loading camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-pitch px-6 py-10">
        <View className="flex-1 items-center justify-center">
          <View className="w-full max-w-[420px] rounded-[28px] border border-stone-800 bg-panel p-6">
            <Text className="text-xs font-medium uppercase tracking-[2px] text-amber-300">
              Camera access
            </Text>
            <Text className="mt-3 text-2xl font-semibold text-fog">{title}</Text>
            <Text className="mt-3 text-sm leading-6 text-stone-300">{description}</Text>
            <Text className="mt-4 text-sm leading-6 text-stone-300">
              Grant camera permission to use the live guide frame and capture a fresh face image.
            </Text>
            <View className="mt-6 gap-3">
              <AppButton
                label="Allow camera access"
                onPress={() => {
                  void requestPermission();
                }}
                variant="primary"
              />
              <AppButton label="Cancel" onPress={onCancel} variant="ghost" />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        active
        mode="picture"
      />
      <View pointerEvents="none" className="absolute inset-0">
        <View
          style={{ height: Math.max(frameRect.top, 0) }}
          className="absolute left-0 right-0 top-0 bg-black/45"
        />
        <View
          style={{
            top: Math.max(frameRect.top, 0),
            height: overlaySize.frameHeight,
            width: Math.max(frameRect.left, 0),
          }}
          className="absolute left-0 bg-black/45"
        />
        <View
          style={{
            top: Math.max(frameRect.top, 0),
            left: Math.max(frameRect.right, 0),
            height: overlaySize.frameHeight,
            right: 0,
          }}
          className="absolute bg-black/45"
        />
        <View
          style={{ top: Math.max(frameRect.bottom, 0), bottom: 0 }}
          className="absolute left-0 right-0 bg-black/45"
        />
        <View
          className="absolute items-center justify-center"
          style={{
            top: Math.max(frameRect.top, 0),
            left: Math.max(frameRect.left, 0),
            height: overlaySize.frameHeight,
            width: overlaySize.frameWidth,
            borderRadius: overlaySize.radius,
            backgroundColor: 'transparent',
            borderColor: 'rgba(251, 191, 36, 0.98)',
            borderWidth: 4,
            shadowColor: '#fbbf24',
            shadowOpacity: 0.45,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
            elevation: 10,
          }}>
          <View
            style={{
              height: overlaySize.frameHeight - 14,
              width: overlaySize.frameWidth - 14,
              borderRadius: Math.max(overlaySize.radius - 7, 0),
              borderColor: 'rgba(23, 23, 23, 0.7)',
              borderWidth: 2,
            }}
          />
          <View className="absolute left-4 top-5 h-7 w-7 rounded-tl-[14px] border-l-4 border-t-4 border-stone-50/90" />
          <View className="absolute right-4 top-5 h-7 w-7 rounded-tr-[14px] border-r-4 border-t-4 border-stone-50/90" />
          <View className="absolute bottom-5 left-4 h-7 w-7 rounded-bl-[14px] border-b-4 border-l-4 border-stone-50/90" />
          <View className="absolute bottom-5 right-4 h-7 w-7 rounded-br-[14px] border-b-4 border-r-4 border-stone-50/90" />
        </View>
      </View>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 px-4 pb-6">
          <View className="flex-row items-start justify-between gap-4 pt-2">
            <Pressable
              className="rounded-full border border-stone-200/20 bg-black/55 px-4 py-3"
              onPress={onCancel}>
              <Text className="text-sm font-medium text-stone-100">Cancel</Text>
            </Pressable>
            <View className="max-w-[220px] rounded-[22px] border border-amber-400/25 bg-black/55 px-4 py-3">
              <Text className="text-[11px] font-medium uppercase tracking-[2px] text-amber-300">
                Live capture
              </Text>
              <Text className="mt-2 text-sm font-semibold text-stone-50">{title}</Text>
            </View>
          </View>

          <View className={`items-center ${isCompactHeight ? 'mt-3' : 'mt-5'}`}>
            <View className="w-full max-w-[360px] rounded-[22px] border border-stone-200/15 bg-black/55 px-4 py-3">
              <Text className="text-center text-[11px] font-medium uppercase tracking-[1.5px] text-stone-300">
                Before capture
              </Text>
              <View className="mt-3 flex-row flex-wrap justify-center gap-2">
                {captureHints.map((hint) => (
                  <StatusBadge key={hint.label} label={hint.label} tone={hint.tone} />
                ))}
              </View>
              <Text className="mt-3 text-center text-xs leading-5 text-stone-100">
                {description}
              </Text>
            </View>
          </View>

          <View className="flex-1" />

          <View className="gap-4">
            {captureError ? (
              <View className="rounded-[22px] border border-rose-400/25 bg-rose-500/15 px-4 py-3">
                <Text className="text-xs font-medium uppercase tracking-[1.5px] text-rose-200">
                  Capture failed
                </Text>
                <Text className="mt-2 text-sm leading-6 text-rose-100">{captureError}</Text>
              </View>
            ) : null}

            <View className="flex-row items-end justify-between gap-3">
              <View className="max-w-[150px] flex-1">
                <AppButton
                  label={facing === 'front' ? 'Use rear camera' : 'Use front camera'}
                  onPress={() => setFacing((current) => (current === 'front' ? 'back' : 'front'))}
                  variant="ghost"
                  disabled={capturing}
                />
              </View>
              <Pressable
                className={`h-20 w-20 items-center justify-center rounded-full border-4 ${
                  capturing
                    ? 'border-amber-300/40 bg-amber-300/20'
                    : 'border-amber-300 bg-amber-300'
                }`}
                disabled={capturing}
                onPress={() => {
                  void handleCapture();
                }}>
                {capturing ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <View className="h-14 w-14 rounded-full border-2 border-stone-900 bg-amber-100" />
                )}
              </Pressable>
              <View className="max-w-[150px] flex-1 items-end">
                <StatusBadge label={capturing ? 'Capturing' : 'Ready'} tone="amber" />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function getCaptureHints(mode: 'enroll' | 'match', facing: CameraType) {
  return [
    {
      label: facing === 'front' ? 'Front camera' : 'Rear camera',
      tone: 'amber' as const,
    },
    {
      label: mode === 'enroll' ? 'Single face' : 'Match check',
      tone: 'emerald' as const,
    },
    {
      label: 'Eyes visible',
      tone: 'sky' as const,
    },
    {
      label: 'Minimal tilt',
      tone: 'violet' as const,
    },
  ];
}
