import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { AppButton } from '../components/ui/AppButton';
import { AppScreen } from '../components/ui/AppScreen';
import { DetailRow } from '../components/ui/DetailRow';
import { FeedbackState } from '../components/ui/FeedbackState';
import { HeroPanel } from '../components/ui/HeroPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { useSession } from '../context/SessionContext';
import type { CaptureAsset } from '../navigation/types';
import { ApiError, getFaceFlowErrorMessage } from '../services/api';
import { getPlayer, type Player, uploadPlayerFace } from '../services/players';

type DraftAsset = CaptureAsset;

type Props = {
  playerId: number;
  playerName: string;
  canManagePlayer?: boolean;
  onEditPlayer: () => void;
  onDeletePlayer: () => Promise<void>;
  onOpenLiveCapture?: () => void;
  onConsumePendingCapture?: () => void;
  pendingCapture?: { consumerKey: string; asset: DraftAsset; source: 'camera' } | null;
};

export function PlayerDetailScreen({
  playerId,
  playerName,
  canManagePlayer = true,
  onEditPlayer,
  onDeletePlayer,
  onOpenLiveCapture,
  onConsumePendingCapture,
  pendingCapture,
}: Props) {
  const { token } = useSession();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [draftAsset, setDraftAsset] = useState<DraftAsset | null>(null);
  const [draftSource, setDraftSource] = useState<'camera' | 'library' | null>(null);
  const [lastUploadIssue, setLastUploadIssue] = useState<
    'no_face' | 'multiple_faces' | 'invalid_image' | 'network' | 'unknown' | null
  >(null);
  const [showSlowUploadHint, setShowSlowUploadHint] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadPlayer = useCallback(
    async (sessionToken: string) => {
      setLoading(true);
      setError(null);

      try {
        const nextPlayer = await getPlayer(sessionToken, playerId);
        setPlayer(nextPlayer);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setLoading(false);
      }
    },
    [playerId]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    setDeleteError(null);
    loadPlayer(token);
  }, [loadPlayer, token]);

  useEffect(() => {
    if (!pendingCapture) {
      return;
    }

    setUploadMessage(null);
    setError(null);
    setLastUploadIssue(null);
    setDraftAsset(pendingCapture.asset);
    setDraftSource(pendingCapture.source);
    onConsumePendingCapture?.();
  }, [onConsumePendingCapture, pendingCapture]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      await onDeletePlayer();
    } catch (deleteFetchError) {
      setDeleteError(getErrorMessage(deleteFetchError));
      setDeleting(false);
    }
  }

  async function handlePickAndUpload() {
    setUploadMessage(null);
    setError(null);

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

  async function handleCaptureAndUpload() {
    if (onOpenLiveCapture) {
      setUploadMessage(null);
      setError(null);
      setLastUploadIssue(null);
      onOpenLiveCapture();
      return;
    }

    setUploadMessage(null);
    setError(null);

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

  async function handleUpload(asset: DraftAsset) {
    if (!token) {
      return;
    }

    setUploading(true);
    setLastUploadIssue(null);
    setShowSlowUploadHint(false);

    const slowHintTimer = setTimeout(() => setShowSlowUploadHint(true), 3500);

    try {
      const response = await uploadPlayerFace(token, playerId, asset);
      setUploadMessage(response.message);
      setDraftAsset(null);
      setDraftSource(null);
      await loadPlayer(token);
    } catch (uploadError) {
      setLastUploadIssue(getFaceIssue(uploadError));
      setError(getFaceFlowErrorMessage(uploadError, 'upload'));
    } finally {
      clearTimeout(slowHintTimer);
      setUploading(false);
    }
  }

  return (
    <AppScreen
      accent="amber"
      hero={
        <HeroPanel
          accent="amber"
          eyebrow="Player"
          title={playerName}
          description="Review player details, confirm whether face enrollment already exists, and upload a fresh face image when needed."
          aside={
            <View className="gap-3 md:items-end">
              <StatusBadge label={`Player #${playerId}`} tone="amber" />
              {canManagePlayer ? (
                <AppButton label="Edit player" onPress={onEditPlayer} variant="secondary" />
              ) : null}
            </View>
          }
        />
      }>
      <SurfaceCard
        eyebrow="Profile"
        title="Player details"
        action={
          token ? (
            <AppButton label="Refresh" onPress={() => loadPlayer(token)} variant="ghost" />
          ) : null
        }>
        {canManagePlayer ? (
          <View className="mb-4 gap-3">
            <AppButton
              label={confirmDelete ? 'Cancel delete' : 'Delete player'}
              onPress={() => {
                setConfirmDelete((current) => !current);
                setDeleteError(null);
              }}
              variant={confirmDelete ? 'ghost' : 'danger'}
              disabled={deleting}
            />
            {confirmDelete ? (
              <View className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-4">
                <Text className="text-xs font-medium uppercase tracking-[2px] text-rose-200">
                  Confirm deletion
                </Text>
                <Text className="mt-2 text-sm leading-6 text-rose-100">
                  Delete this player and return to the roster. This removes the player record from
                  the current subteam.
                </Text>
                {deleteError ? (
                  <View className="mt-3">
                    <FeedbackState title="Delete failed" message={deleteError} tone="error" />
                  </View>
                ) : null}
                <View className="mt-4 gap-3">
                  <AppButton
                    label="Confirm player deletion"
                    onPress={handleDelete}
                    variant="danger"
                    loading={deleting}
                    disabled={deleting}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#f59e0b" />
            <Text className="mt-3 text-sm text-stone-400">Loading player...</Text>
          </View>
        ) : player ? (
          <View className="gap-4">
            <View className="rounded-[26px] border border-stone-800 bg-pitch p-4">
              <Text className="text-lg font-semibold text-fog">
                {player.first_name} {player.last_name}
              </Text>
              <Text className="mt-1 text-sm text-stone-300">
                {player.position || 'Position not set'}
              </Text>
              <View className="mt-4 gap-3">
                <DetailRow
                  label="Email"
                  value={player.email || 'No email'}
                  valueTone={player.email ? 'default' : 'muted'}
                />
                <DetailRow
                  label="Phone"
                  value={player.phone || 'No phone'}
                  valueTone={player.phone ? 'default' : 'muted'}
                />
                <DetailRow
                  label="Height"
                  value={player.height ? `${player.height} cm` : 'Not set'}
                  valueTone={player.height ? 'default' : 'muted'}
                />
                <DetailRow
                  label="Weight"
                  value={player.weight ? `${player.weight} kg` : 'Not set'}
                  valueTone={player.weight ? 'default' : 'muted'}
                />
                <DetailRow
                  label="Jersey"
                  value={player.jersey_number ? `#${player.jersey_number}` : 'Not set'}
                  valueTone={player.jersey_number ? 'default' : 'muted'}
                />
              </View>
            </View>

            <View className="rounded-[26px] border border-stone-800 bg-pitch p-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">
                    Face profile
                  </Text>
                  <Text className="mt-2 text-base font-semibold text-fog">Enrollment image</Text>
                </View>
                <StatusBadge
                  label={player.face_image_url ? 'Uploaded' : 'Missing'}
                  tone={player.face_image_url ? 'emerald' : 'rose'}
                />
              </View>

              {player.face_image_url ? (
                <View className="mt-4">
                  <Image
                    source={{ uri: toAbsoluteAssetUrl(player.face_image_url) }}
                    className="h-72 w-full rounded-[20px] bg-stone-900"
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View className="mt-4">
                  <FeedbackState
                    title="Face image missing"
                    message="This player does not have an enrolled face image yet. Capture one now or choose an existing image from the library."
                  />
                </View>
              )}

              {uploadMessage ? (
                <View className="mt-4">
                  <FeedbackState title="Upload complete" message={uploadMessage} tone="success" />
                </View>
              ) : null}

              {uploading && showSlowUploadHint ? (
                <View className="mt-4">
                  <FeedbackState
                    title="Upload is taking longer"
                    message="Stay on this screen while the image uploads. Slow mobile networks can delay large image submissions."
                    tone="empty"
                  />
                </View>
              ) : null}

              {error ? (
                <View className="mt-4">
                  <FeedbackState title="Upload failed" message={error} tone="error" />
                </View>
              ) : null}

              {lastUploadIssue ? (
                <View className="mt-4 rounded-[24px] border border-stone-800 bg-stone-950/70 p-4">
                  <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">
                    Retry guidance
                  </Text>
                  <View className="mt-3 gap-3">
                    {getRetryTips(lastUploadIssue).map((tip) => (
                      <GuidanceItem
                        key={tip.label}
                        label={tip.label}
                        tone={tip.tone}
                        text={tip.text}
                      />
                    ))}
                  </View>
                  {draftAsset ? (
                    <View className="mt-4 gap-3">
                      <AppButton
                        label="Retry upload"
                        onPress={() => handleUpload(draftAsset)}
                        variant="secondary"
                        disabled={uploading}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}

              {draftAsset ? (
                <View className="mt-4 rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-4">
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-xs font-medium uppercase tracking-[2px] text-amber-300">
                        Ready to upload
                      </Text>
                      <Text className="mt-2 text-base font-semibold text-fog">
                        Preview before enrollment
                      </Text>
                      <Text className="mt-2 text-sm leading-6 text-stone-200">
                        Review this image before sending it to the backend. For biometric flows, a
                        quick manual check reduces bad enrollments.
                      </Text>
                    </View>
                    <StatusBadge
                      label={draftSource === 'camera' ? 'Camera' : 'Library'}
                      tone="amber"
                    />
                  </View>

                  <Image
                    source={{ uri: draftAsset.uri }}
                    className="mt-4 h-72 w-full rounded-[20px] bg-stone-900"
                    resizeMode="cover"
                  />

                  <View className="mt-4 gap-3">
                    {buildDraftChecks(draftAsset, draftSource).map((check) => (
                      <GuidanceItem
                        key={check.label}
                        label={check.label}
                        tone={check.tone}
                        text={check.text}
                      />
                    ))}
                  </View>

                  <View className="mt-4 gap-3">
                    <AppButton
                      label="Upload previewed image"
                      onPress={() => handleUpload(draftAsset)}
                      variant="primary"
                      disabled={uploading}
                      loading={uploading}
                    />
                    <AppButton
                      label="Discard preview"
                      onPress={() => {
                        setDraftAsset(null);
                        setDraftSource(null);
                      }}
                      variant="ghost"
                      disabled={uploading}
                    />
                  </View>
                </View>
              ) : (
                <CaptureGuideCard
                  title="Capture guidance"
                  description="Use this checklist before opening the camera or library picker."
                  items={[
                    {
                      label: 'Face position',
                      tone: 'emerald',
                      text: 'Keep one face centered, eyes visible, and avoid cutting off the forehead or chin.',
                    },
                    {
                      label: 'Lighting',
                      tone: 'sky',
                      text: 'Use even front lighting and avoid harsh shadows, backlight, or very dark rooms.',
                    },
                    {
                      label: 'Image quality',
                      tone: 'violet',
                      text: 'Avoid blur, extreme tilt, sunglasses, or busy backgrounds when possible.',
                    },
                  ]}
                />
              )}

              <View className="mt-5 gap-3">
                <AppButton
                  label={player.face_image_url ? 'Retake with camera' : 'Capture with camera'}
                  onPress={handleCaptureAndUpload}
                  variant="primary"
                  disabled={uploading}
                  loading={uploading}
                />
                <AppButton
                  label="Choose from library"
                  onPress={handlePickAndUpload}
                  variant="secondary"
                  disabled={uploading}
                />
                <Text className="text-xs font-medium uppercase tracking-[1.5px] text-stone-500">
                  Live camera opens a guide frame. Align first, then review the preview before
                  upload.
                </Text>
                <Text className="text-xs leading-5 text-stone-500">
                  {Platform.OS === 'web'
                    ? 'Web can use the device camera when supported by the browser. If camera access is limited, choose an image from the library instead.'
                    : 'Use the front camera with the live guide overlay for fresh enrollment, or fall back to an existing device photo.'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <FeedbackState
            title="Player unavailable"
            message="The player record could not be loaded from the backend."
            tone="error"
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

function buildDraftChecks(asset: DraftAsset, source: 'camera' | 'library' | null) {
  const checks: {
    label: string;
    text: string;
    tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
  }[] = [];

  const shortestEdge = Math.min(asset.width ?? 0, asset.height ?? 0);

  if (shortestEdge >= 720) {
    checks.push({
      label: 'Resolution',
      text: `Image size looks strong at ${asset.width}x${asset.height}.`,
      tone: 'emerald',
    });
  } else if (shortestEdge > 0) {
    checks.push({
      label: 'Resolution',
      text: `Image is ${asset.width}x${asset.height}. It may still work, but a sharper photo is safer for enrollment.`,
      tone: 'amber',
    });
  }

  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
    checks.push({
      label: 'File size',
      text: 'This image is fairly large. Upload may be slower on weak mobile networks.',
      tone: 'amber',
    });
  } else if (asset.fileSize) {
    checks.push({
      label: 'File size',
      text: 'File size looks reasonable for a mobile upload.',
      tone: 'sky',
    });
  }

  checks.push({
    label: 'Source',
    text:
      source === 'camera'
        ? 'Camera capture is preferred for fresh enrollment because framing and lighting are easier to control.'
        : 'Library images can work, but confirm they are recent, sharp, and focused on a single face.',
    tone: source === 'camera' ? 'emerald' : 'amber',
  });

  checks.push({
    label: 'Manual check',
    text: 'Before uploading, confirm there is one clear face, minimal blur, and neutral framing.',
    tone: 'violet',
  });

  return checks;
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
    <View className="mt-4 rounded-[24px] border border-stone-800 bg-stone-950/70 p-4">
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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.detail;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while loading or uploading the face image.';
}

function getFaceIssue(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 408) {
      return 'network' as const;
    }

    if (error.status === 400) {
      return 'invalid_image' as const;
    }

    if (error.status === 422 && error.detail === 'No face detected in the image') {
      return 'no_face' as const;
    }

    if (error.status === 422 && error.detail === 'Multiple faces detected in the image') {
      return 'multiple_faces' as const;
    }
  }

  return 'unknown' as const;
}

function getRetryTips(
  issue: 'no_face' | 'multiple_faces' | 'invalid_image' | 'network' | 'unknown'
) {
  if (issue === 'no_face') {
    return [
      {
        label: 'Framing',
        tone: 'emerald' as const,
        text: 'Move closer, keep one face centered, and make sure the eyes are clearly visible.',
      },
      {
        label: 'Lighting',
        tone: 'sky' as const,
        text: 'Use brighter front lighting and avoid strong shadows or backlight.',
      },
    ];
  }

  if (issue === 'multiple_faces') {
    return [
      {
        label: 'Single subject',
        tone: 'amber' as const,
        text: 'Retake the image with only the intended player in frame.',
      },
      {
        label: 'Background',
        tone: 'violet' as const,
        text: 'Avoid other people, posters, or screens appearing behind the player.',
      },
    ];
  }

  if (issue === 'invalid_image') {
    return [
      {
        label: 'File type',
        tone: 'rose' as const,
        text: 'Use a standard camera photo or JPG/PNG image from the device library.',
      },
      {
        label: 'Recapture',
        tone: 'emerald' as const,
        text: 'If the image looks corrupted or edited, capture a fresh photo instead.',
      },
    ];
  }

  if (issue === 'network') {
    return [
      {
        label: 'Connection',
        tone: 'sky' as const,
        text: 'Check the device connection and confirm the backend URL is still reachable.',
      },
      {
        label: 'Retry',
        tone: 'amber' as const,
        text: 'Try the upload again after the network stabilizes.',
      },
    ];
  }

  return [
    {
      label: 'Retry',
      tone: 'amber' as const,
      text: 'Retake the photo with one clear face and try again.',
    },
    {
      label: 'Escalate',
      tone: 'violet' as const,
      text: 'If the issue repeats, verify backend health and face-recognition availability.',
    },
  ];
}
