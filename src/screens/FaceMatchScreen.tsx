import { useEffect, useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { AppButton } from '../components/ui/AppButton';
import { AppScreen } from '../components/ui/AppScreen';
import { FeedbackState } from '../components/ui/FeedbackState';
import { HeroPanel } from '../components/ui/HeroPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { useSession } from '../context/SessionContext';
import type { CaptureAsset } from '../navigation/types';
import { ApiError, getFaceFlowErrorMessage } from '../services/api';
import { matchPlayerFace, type PlayerFaceMatch } from '../services/players';
import { addVerificationHistoryItem } from '../services/verification-history';

type DraftAsset = CaptureAsset;

type Props = {
  onConsumePendingCapture?: () => void;
  onOpenLiveCapture?: () => void;
  pendingCapture?: { consumerKey: string; asset: DraftAsset; source: 'camera' } | null;
};

export function FaceMatchScreen({
  onConsumePendingCapture,
  onOpenLiveCapture,
  pendingCapture,
}: Props) {
  const { token } = useSession();
  const [draftAsset, setDraftAsset] = useState<DraftAsset | null>(null);
  const [draftSource, setDraftSource] = useState<'camera' | 'library' | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<PlayerFaceMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSlowMatchHint, setShowSlowMatchHint] = useState(false);
  const [resultState, setResultState] = useState<
    'idle' | 'match' | 'no_match' | 'no_face' | 'multiple_faces' | 'network' | 'service' | 'error'
  >('idle');

  useEffect(() => {
    if (!pendingCapture) {
      return;
    }

    setDraftAsset(pendingCapture.asset);
    setDraftSource(pendingCapture.source);
    setMatchResult(null);
    setError(null);
    setResultState('idle');
    onConsumePendingCapture?.();
  }, [onConsumePendingCapture, pendingCapture]);

  async function handlePick() {
    setError(null);
    setMatchResult(null);
    setResultState('idle');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Media library permission is required to choose a face image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 5],
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    setDraftAsset(result.assets[0]);
    setDraftSource('library');
  }

  async function handleCapture() {
    if (onOpenLiveCapture) {
      setError(null);
      setMatchResult(null);
      setResultState('idle');
      onOpenLiveCapture();
      return;
    }

    setError(null);
    setMatchResult(null);
    setResultState('idle');

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to capture a face image.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 5],
      cameraType: ImagePicker.CameraType.front,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    setDraftAsset(result.assets[0]);
    setDraftSource('camera');
  }

  async function handleMatch() {
    if (!token || !draftAsset) {
      return;
    }

    setMatching(true);
    setError(null);
    setMatchResult(null);
    setResultState('idle');
    setShowSlowMatchHint(false);

    const slowHintTimer = setTimeout(() => setShowSlowMatchHint(true), 3500);

    try {
      const result = await matchPlayerFace(token, draftAsset);
      setMatchResult(result);
      setResultState('match');
      await addVerificationHistoryItem({
        source: draftSource ?? 'library',
        status: 'matched',
        player_id: result.player_id,
        player_name: result.player_name,
        confidence: result.confidence,
        message: `Matched ${result.player_name} at ${Math.round(result.confidence * 100)}% confidence.`,
      });
    } catch (matchError) {
      const message = getFaceFlowErrorMessage(matchError, 'match');
      setError(message);
      setResultState(getMatchState(matchError));

      if (matchError instanceof ApiError && matchError.status === 404) {
        await addVerificationHistoryItem({
          source: draftSource ?? 'library',
          status: 'no_match',
          message: 'No matching player was found for the submitted face image.',
        });
      } else {
        await addVerificationHistoryItem({
          source: draftSource ?? 'library',
          status: 'error',
          message,
        });
      }
    } finally {
      clearTimeout(slowHintTimer);
      setMatching(false);
    }
  }

  return (
    <AppScreen
      accent="amber"
      hero={
        <HeroPanel
          accent="amber"
          eyebrow="Verify"
          title="Face match"
          description="Capture or choose a face image, preview it, and ask the backend to match it against enrolled player profiles."
          aside={<StatusBadge label="Verification" tone="amber" />}
        />
      }>
      <SurfaceCard eyebrow="Capture" title="Verification image">
        {draftAsset ? (
          <View className="gap-4">
            <View className="rounded-[26px] border border-amber-500/20 bg-amber-500/10 p-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-xs font-medium uppercase tracking-[2px] text-amber-300">
                    Ready to verify
                  </Text>
                  <Text className="mt-2 text-base font-semibold text-fog">
                    Preview before match
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-stone-200">
                    Use one clear face, frontal framing, and even lighting for better match
                    accuracy.
                  </Text>
                </View>
                <StatusBadge label={draftSource === 'camera' ? 'Camera' : 'Library'} tone="amber" />
              </View>

              <Image
                source={{ uri: draftAsset.uri }}
                className="mt-4 h-72 w-full rounded-[20px] bg-stone-900"
                resizeMode="cover"
              />
            </View>

            <View className="gap-3">
              {buildVerificationChecks(draftAsset, draftSource).map((item) => (
                <GuidanceItem
                  key={item.label}
                  label={item.label}
                  tone={item.tone}
                  text={item.text}
                />
              ))}
            </View>

            <View className="gap-3">
              <AppButton
                label="Run face match"
                onPress={handleMatch}
                variant="primary"
                loading={matching}
                disabled={matching}
              />
              <AppButton
                label="Discard preview"
                onPress={() => {
                  setDraftAsset(null);
                  setDraftSource(null);
                  setMatchResult(null);
                  setError(null);
                }}
                variant="ghost"
                disabled={matching}
              />
            </View>
          </View>
        ) : (
          <View className="gap-4">
            <FeedbackState
              title="No image selected"
              message="Start with a fresh camera capture or choose an existing image to verify."
            />
            <CaptureGuideCard
              title="Capture guidance"
              description="Prepare the image before opening the system camera or library picker."
              items={[
                {
                  label: 'Face position',
                  tone: 'emerald',
                  text: 'Keep one centered face visible with minimal tilt.',
                },
                {
                  label: 'Lighting',
                  tone: 'sky',
                  text: 'Avoid deep shadows and strong backlight.',
                },
                {
                  label: 'Quality',
                  tone: 'violet',
                  text: 'Use a sharp image without heavy blur or obstruction.',
                },
              ]}
            />
            <View className="gap-3">
              <AppButton label="Capture with camera" onPress={handleCapture} variant="primary" />
              <AppButton label="Choose from library" onPress={handlePick} variant="secondary" />
            </View>
            <Text className="text-xs font-medium uppercase tracking-[1.5px] text-stone-500">
              Live camera opens a guide frame. Center one face before capture, then confirm the
              preview before verifying.
            </Text>
            <Text className="text-xs leading-5 text-stone-500">
              {Platform.OS === 'web'
                ? 'Web can use the camera when the browser allows it. If not, use the library option.'
                : 'Use the front camera with the live guide overlay for verification, or fall back to the device library.'}
            </Text>
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard eyebrow="Result" title="Match outcome">
        {matching ? (
          <View className="gap-4">
            <FeedbackState
              title="Matching in progress"
              message="The backend is comparing the submitted face against enrolled player profiles."
              tone="success"
            />
            {showSlowMatchHint ? (
              <FeedbackState
                title="Verification is taking longer"
                message="Stay on this screen while the request completes. Matching can take longer on weak networks or busy backend containers."
                tone="empty"
              />
            ) : null}
          </View>
        ) : error ? (
          <View className="gap-4">
            <FeedbackState
              title={getResultTitle(resultState)}
              message={error}
              tone={resultState === 'no_match' ? 'empty' : 'error'}
            />
            <View className="rounded-[24px] border border-stone-800 bg-stone-950/70 p-4">
              <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">
                Retry guidance
              </Text>
              <View className="mt-3 gap-3">
                {getMatchRetryTips(resultState).map((tip) => (
                  <GuidanceItem key={tip.label} label={tip.label} tone={tip.tone} text={tip.text} />
                ))}
              </View>
              <View className="mt-4 gap-3">
                {draftAsset ? (
                  <AppButton label="Retry same image" onPress={handleMatch} variant="secondary" />
                ) : null}
                <AppButton
                  label="Try another image"
                  onPress={() => {
                    setDraftAsset(null);
                    setDraftSource(null);
                    setMatchResult(null);
                    setError(null);
                    setResultState('idle');
                  }}
                  variant="secondary"
                />
              </View>
            </View>
          </View>
        ) : matchResult ? (
          <View className="gap-4">
            <View className="rounded-[26px] border border-emerald-500/20 bg-emerald-500/10 p-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-xs font-medium uppercase tracking-[2px] text-emerald-300">
                    Match found
                  </Text>
                  <Text className="mt-2 text-2xl font-semibold text-fog">
                    {matchResult.player_name}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-stone-200">
                    Backend match completed successfully. Review the confidence level before acting
                    on the result.
                  </Text>
                </View>
                <StatusBadge
                  label={`${Math.round(matchResult.confidence * 100)}%`}
                  tone="emerald"
                />
              </View>

              <View className="mt-4 rounded-[22px] border border-stone-800 bg-pitch/80 p-4">
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">
                    Confidence interpretation
                  </Text>
                  <StatusBadge
                    label={getConfidenceSummary(matchResult.confidence).label}
                    tone={getConfidenceSummary(matchResult.confidence).tone}
                  />
                </View>
                <Text className="mt-3 text-sm leading-6 text-stone-200">
                  {getConfidenceSummary(matchResult.confidence).message}
                </Text>
              </View>

              {matchResult.face_image_url ? (
                <Image
                  source={{ uri: toAbsoluteAssetUrl(matchResult.face_image_url) }}
                  className="mt-4 h-56 w-full rounded-[20px] bg-stone-900"
                  resizeMode="cover"
                />
              ) : null}

              <View className="mt-4 gap-3">
                <ResultRow label="Player ID" value={String(matchResult.player_id)} />
                <ResultRow
                  label="Confidence"
                  value={`${Math.round(matchResult.confidence * 100)}%`}
                />
              </View>
            </View>

            <View className="gap-3">
              <AppButton
                label="Try another face"
                onPress={() => {
                  setDraftAsset(null);
                  setDraftSource(null);
                  setMatchResult(null);
                  setError(null);
                  setResultState('idle');
                }}
                variant="secondary"
              />
            </View>
          </View>
        ) : (
          <FeedbackState
            title="No result yet"
            message="Run a verification after selecting an image to see the match result here."
          />
        )}
      </SurfaceCard>
    </AppScreen>
  );
}

function GuidanceItem({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
}) {
  return (
    <View className="flex-row items-start gap-3">
      <StatusBadge label={label} tone={tone} />
      <Text className="flex-1 text-sm leading-6 text-stone-300">{text}</Text>
    </View>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xs uppercase tracking-[1px] text-stone-500">{label}</Text>
      <Text className="text-sm text-stone-100">{value}</Text>
    </View>
  );
}

function CaptureGuideCard({
  description,
  items,
  title,
}: {
  description: string;
  items: { label: string; tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'; text: string }[];
  title: string;
}) {
  return (
    <View className="rounded-[24px] border border-stone-800 bg-stone-950/70 p-4">
      <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-stone-300">{description}</Text>
      <View className="mt-3 gap-3">
        {items.map((item) => (
          <GuidanceItem key={item.label} label={item.label} tone={item.tone} text={item.text} />
        ))}
      </View>
    </View>
  );
}

function toAbsoluteAssetUrl(value: string) {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `${process.env.EXPO_PUBLIC_API_BASE_URL}${value}`;
}

function getConfidenceSummary(confidence: number) {
  if (confidence >= 0.9) {
    return {
      label: 'High confidence',
      message:
        'This looks like a strong match. Identity review should still follow your normal process.',
      tone: 'emerald' as const,
    };
  }

  if (confidence >= 0.75) {
    return {
      label: 'Review carefully',
      message:
        'This is a usable match candidate, but it deserves a manual review before you rely on it.',
      tone: 'amber' as const,
    };
  }

  return {
    label: 'Low confidence',
    message: 'This result is weak. Capture a better image or retry before making a decision.',
    tone: 'rose' as const,
  };
}

function buildVerificationChecks(asset: DraftAsset, source: 'camera' | 'library' | null) {
  const checks: {
    label: string;
    text: string;
    tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
  }[] = [];

  const shortestEdge = Math.min(asset.width ?? 0, asset.height ?? 0);

  checks.push({
    label: 'Face position',
    tone: 'emerald',
    text: 'Keep one centered face visible with minimal tilt.',
  });

  checks.push({
    label: 'Lighting',
    tone: 'sky',
    text: 'Avoid deep shadows and strong backlight.',
  });

  if (shortestEdge >= 720) {
    checks.push({
      label: 'Resolution',
      text: `Image size looks strong at ${asset.width}x${asset.height}.`,
      tone: 'emerald',
    });
  } else if (shortestEdge > 0) {
    checks.push({
      label: 'Resolution',
      text: `Image is ${asset.width}x${asset.height}. Verification may still work, but sharper images are safer.`,
      tone: 'amber',
    });
  }

  checks.push({
    label: 'Source',
    text:
      source === 'camera'
        ? 'Camera capture is preferred for verification because framing is easier to control.'
        : 'Library images can work, but verify they are recent, clear, and limited to one visible face.',
    tone: source === 'camera' ? 'emerald' : 'amber',
  });

  return checks;
}

function getMatchState(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 408) {
      return 'network' as const;
    }

    if (error.status === 503) {
      return 'service' as const;
    }

    if (error.status === 404) {
      return 'no_match' as const;
    }

    if (error.status === 422 && error.detail === 'No face detected in the image') {
      return 'no_face' as const;
    }

    if (error.status === 422 && error.detail === 'Multiple faces detected in the image') {
      return 'multiple_faces' as const;
    }
  }

  return 'error' as const;
}

function getResultTitle(
  state:
    | 'idle'
    | 'match'
    | 'no_match'
    | 'no_face'
    | 'multiple_faces'
    | 'network'
    | 'service'
    | 'error'
) {
  if (state === 'no_match') {
    return 'No match found';
  }

  if (state === 'no_face') {
    return 'No face detected';
  }

  if (state === 'multiple_faces') {
    return 'Multiple faces detected';
  }

  if (state === 'network') {
    return 'Connection issue';
  }

  if (state === 'service') {
    return 'Service unavailable';
  }

  return 'Verification result';
}

function getMatchRetryTips(
  state:
    | 'idle'
    | 'match'
    | 'no_match'
    | 'no_face'
    | 'multiple_faces'
    | 'network'
    | 'service'
    | 'error'
) {
  if (state === 'no_match') {
    return [
      {
        label: 'Retry capture',
        tone: 'amber' as const,
        text: 'Retake the image with stronger lighting and a straight-on angle.',
      },
      {
        label: 'Check enrollment',
        tone: 'sky' as const,
        text: 'Confirm the player has an enrolled face image before relying on verification.',
      },
    ];
  }

  if (state === 'no_face') {
    return [
      {
        label: 'Framing',
        tone: 'emerald' as const,
        text: 'Use one centered face with the eyes visible and minimal tilt.',
      },
      {
        label: 'Lighting',
        tone: 'sky' as const,
        text: 'Move to brighter front lighting and avoid dark or backlit scenes.',
      },
    ];
  }

  if (state === 'multiple_faces') {
    return [
      {
        label: 'Single face',
        tone: 'amber' as const,
        text: 'Retake the image with only one person visible in frame.',
      },
      {
        label: 'Background',
        tone: 'violet' as const,
        text: 'Avoid mirrors, posters, or other faces appearing behind the subject.',
      },
    ];
  }

  if (state === 'network') {
    return [
      {
        label: 'Connection',
        tone: 'sky' as const,
        text: 'Check network stability and confirm the backend URL is still reachable.',
      },
      {
        label: 'Retry',
        tone: 'amber' as const,
        text: 'Submit the image again after the connection stabilizes.',
      },
    ];
  }

  if (state === 'service') {
    return [
      {
        label: 'Backend',
        tone: 'rose' as const,
        text: 'Use the dashboard readiness card to confirm face recognition is still available.',
      },
      {
        label: 'Escalate',
        tone: 'violet' as const,
        text: 'If the service stays unavailable, stop verification attempts until backend health is restored.',
      },
    ];
  }

  return [
    {
      label: 'Retry',
      tone: 'amber' as const,
      text: 'Retake the image with one clear face and try again.',
    },
    {
      label: 'Review',
      tone: 'sky' as const,
      text: 'If the issue repeats, review capture conditions and backend status before continuing.',
    },
  ];
}
