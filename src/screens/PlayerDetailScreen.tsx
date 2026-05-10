import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { StatusBadge } from '../components/ui/StatusBadge';
import {
  WorkflowButton,
  WorkflowFeedback,
  WorkflowScreen,
  WorkflowSection,
} from '../components/ui/WorkflowScreen';
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
    <WorkflowScreen
      badgeLabel={`Player #${playerId}`}
      badgeTone="amber"
      title={playerName}
      description="Review player details, manage face enrollment, and update the roster record when needed."
      heroActions={
        canManagePlayer ? <HeroButton label="Edit player" onPress={onEditPlayer} /> : null
      }>
      <WorkflowSection
        eyebrow="Profile"
        title="Player details"
        action={
          token ? (
            <WorkflowButton label="Refresh" onPress={() => loadPlayer(token)} disabled={loading} />
          ) : null
        }>
        {canManagePlayer ? (
          <View className="mb-4 gap-3">
            <WorkflowButton
              label={confirmDelete ? 'Cancel delete' : 'Delete player'}
              onPress={() => {
                setConfirmDelete((current) => !current);
                setDeleteError(null);
              }}
              tone={confirmDelete ? 'neutral' : 'danger'}
              disabled={deleting}
            />
            {confirmDelete ? (
              <View className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <Text className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  Confirm deletion
                </Text>
                <Text className="mt-2 text-sm leading-6 text-red-700">
                  Delete this player and return to the roster. This removes the player record from
                  the current subteam.
                </Text>
                {deleteError ? (
                  <View className="mt-3">
                    <WorkflowFeedback title="Delete failed" message={deleteError} tone="error" />
                  </View>
                ) : null}
                <View className="mt-4">
                  <WorkflowButton
                    label="Confirm player deletion"
                    onPress={handleDelete}
                    tone="danger"
                    loading={deleting}
                    disabled={deleting}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-slate-50 py-10">
            <ActivityIndicator color="#10b981" />
            <Text className="mt-3 text-sm text-slate-500">Loading player...</Text>
          </View>
        ) : player ? (
          <View className="gap-4">
            <ProfileCard player={player} />
            <FaceProfileCard
              draftAsset={draftAsset}
              draftSource={draftSource}
              error={error}
              lastUploadIssue={lastUploadIssue}
              player={player}
              showSlowUploadHint={showSlowUploadHint}
              uploadMessage={uploadMessage}
              uploading={uploading}
              onCapture={handleCaptureAndUpload}
              onChooseLibrary={handlePickAndUpload}
              onDiscardDraft={() => {
                setDraftAsset(null);
                setDraftSource(null);
              }}
              onUpload={handleUpload}
            />
          </View>
        ) : (
          <WorkflowFeedback
            title="Player unavailable"
            message="The player record could not be loaded from the backend."
            tone="error"
          />
        )}
      </WorkflowSection>
    </WorkflowScreen>
  );
}

function HeroButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <WorkflowButton label={label} onPress={onPress} />;
}

function ProfileCard({ player }: { player: Player }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className="h-[3px] w-full bg-amber-500" />
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-slate-800">
              {player.first_name} {player.last_name}
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              {player.position || 'Position not set'}
            </Text>
          </View>
          <StatusBadge label={player.is_active ? 'Active' : 'Inactive'} tone="amber" />
        </View>

        <View className="mt-4 gap-3">
          <DetailField label="Email" value={player.email || 'No email'} muted={!player.email} />
          <DetailField label="Phone" value={player.phone || 'No phone'} muted={!player.phone} />
          <DetailField
            label="Height"
            value={player.height ? `${player.height} cm` : 'Not set'}
            muted={!player.height}
          />
          <DetailField
            label="Weight"
            value={player.weight ? `${player.weight} kg` : 'Not set'}
            muted={!player.weight}
          />
          <DetailField
            label="Jersey"
            value={player.jersey_number ? `#${player.jersey_number}` : 'Not set'}
            muted={!player.jersey_number}
          />
        </View>
      </View>
    </View>
  );
}

function FaceProfileCard({
  draftAsset,
  draftSource,
  error,
  lastUploadIssue,
  player,
  showSlowUploadHint,
  uploadMessage,
  uploading,
  onCapture,
  onChooseLibrary,
  onDiscardDraft,
  onUpload,
}: {
  draftAsset: DraftAsset | null;
  draftSource: 'camera' | 'library' | null;
  error: string | null;
  lastUploadIssue: 'no_face' | 'multiple_faces' | 'invalid_image' | 'network' | 'unknown' | null;
  player: Player;
  showSlowUploadHint: boolean;
  uploadMessage: string | null;
  uploading: boolean;
  onCapture: () => void;
  onChooseLibrary: () => void;
  onDiscardDraft: () => void;
  onUpload: (asset: DraftAsset) => void;
}) {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className="h-[3px] w-full bg-emerald-500" />
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Face profile
            </Text>
            <Text className="mt-2 text-base font-semibold text-slate-800">Enrollment image</Text>
          </View>
          <StatusBadge
            label={player.face_image_url ? 'Uploaded' : 'Missing'}
            tone={player.face_image_url ? 'emerald' : 'rose'}
          />
        </View>

        {player.face_image_url ? (
          <Image
            source={{ uri: toAbsoluteAssetUrl(player.face_image_url) }}
            className="mt-4 h-72 w-full rounded-2xl bg-slate-100"
            resizeMode="cover"
          />
        ) : (
          <View className="mt-4">
            <WorkflowFeedback
              title="Face image missing"
              message="Capture one now or choose an existing image from the library."
            />
          </View>
        )}

        {uploadMessage ? (
          <View className="mt-4">
            <WorkflowFeedback title="Upload complete" message={uploadMessage} tone="success" />
          </View>
        ) : null}

        {uploading && showSlowUploadHint ? (
          <View className="mt-4">
            <WorkflowFeedback
              title="Upload is taking longer"
              message="Stay on this screen while the image uploads. Slow mobile networks can delay large image submissions."
            />
          </View>
        ) : null}

        {error ? (
          <View className="mt-4">
            <WorkflowFeedback title="Upload failed" message={error} tone="error" />
          </View>
        ) : null}

        {lastUploadIssue ? (
          <GuidanceCard title="Retry guidance" items={getRetryTips(lastUploadIssue)} />
        ) : null}

        {draftAsset ? (
          <View className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Ready to upload
                </Text>
                <Text className="mt-2 text-base font-semibold text-slate-800">
                  Preview before enrollment
                </Text>
                <Text className="mt-2 text-sm leading-6 text-slate-600">
                  Review this image before sending it to the backend.
                </Text>
              </View>
              <StatusBadge label={draftSource === 'camera' ? 'Camera' : 'Library'} tone="amber" />
            </View>

            <Image
              source={{ uri: draftAsset.uri }}
              className="mt-4 h-72 w-full rounded-2xl bg-slate-100"
              resizeMode="cover"
            />

            <GuidanceList items={buildDraftChecks(draftAsset, draftSource)} />

            <View className="mt-4 gap-3">
              <WorkflowButton
                label="Upload previewed image"
                onPress={() => onUpload(draftAsset)}
                tone="emerald"
                disabled={uploading}
                loading={uploading}
              />
              <WorkflowButton
                label="Discard preview"
                onPress={onDiscardDraft}
                disabled={uploading}
              />
            </View>
          </View>
        ) : (
          <GuidanceCard
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
          <WorkflowButton
            label={player.face_image_url ? 'Retake with camera' : 'Capture with camera'}
            onPress={onCapture}
            tone="emerald"
            disabled={uploading}
            loading={uploading}
          />
          <WorkflowButton
            label="Choose from library"
            onPress={onChooseLibrary}
            disabled={uploading}
          />
          <Text className="text-xs leading-5 text-slate-500">
            {Platform.OS === 'web'
              ? 'Web can use the device camera when supported by the browser. If camera access is limited, choose an image from the library instead.'
              : 'Use the live guide overlay for fresh enrollment, or fall back to an existing device photo.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function DetailField({ label, muted, value }: { label: string; muted?: boolean; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xs uppercase tracking-[1px] text-slate-400">{label}</Text>
      <Text className={`text-sm ${muted ? 'text-slate-400' : 'text-slate-700'}`}>{value}</Text>
    </View>
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
    <View className="gap-2">
      <StatusBadge label={label} tone={tone} />
      <Text className="text-sm leading-6 text-slate-600">{text}</Text>
    </View>
  );
}

function GuidanceList({
  items,
}: {
  items: { label: string; tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'; text: string }[];
}) {
  return (
    <View className="mt-3 gap-3">
      {items.map((item) => (
        <GuidanceItem key={item.label} label={item.label} tone={item.tone} text={item.text} />
      ))}
    </View>
  );
}

function GuidanceCard({
  description,
  items,
  title,
}: {
  description?: string;
  items: { label: string; tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'; text: string }[];
  title: string;
}) {
  return (
    <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</Text>
      {description ? (
        <Text className="mt-2 text-sm leading-6 text-slate-500">{description}</Text>
      ) : null}
      <GuidanceList items={items} />
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
