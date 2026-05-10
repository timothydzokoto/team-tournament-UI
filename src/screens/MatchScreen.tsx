import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { StatusBadge } from '../components/ui/StatusBadge';
import {
  WorkflowButton,
  WorkflowFeedback,
  WorkflowInput,
  WorkflowScreen,
  WorkflowSection,
} from '../components/ui/WorkflowScreen';
import { useSession } from '../context/SessionContext';
import { getConnectivityMessage } from '../services/api';
import {
  createMatch,
  deleteMatch,
  deletePlayerMatchStat,
  getMatchStats,
  recordPlayerMatchStat,
  updateMatch,
  updatePlayerMatchStat,
  type Match,
  type MatchStatus,
  type PlayerMatchStat,
} from '../services/matches';
import { getTeams, type Team } from '../services/teams';
import {
  getTopScorers,
  getTournamentMatches,
  getTournaments,
  getTournamentStandings,
  type TeamStanding,
  type TopScorer,
  type Tournament,
} from '../services/tournaments';

type Props = {
  refreshKey: number;
};

export function MatchScreen({ refreshKey }: Props) {
  const { token } = useSession();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [matchStats, setMatchStats] = useState<PlayerMatchStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savingScore, setSavingScore] = useState(false);
  const [savingStat, setSavingStat] = useState(false);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [deletingMatch, setDeletingMatch] = useState(false);
  const [deletingStatPlayerId, setDeletingStatPlayerId] = useState<number | null>(null);
  const [newHomeTeamId, setNewHomeTeamId] = useState('');
  const [newAwayTeamId, setNewAwayTeamId] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [status, setStatus] = useState<MatchStatus>('scheduled');
  const [playerId, setPlayerId] = useState('');
  const [goals, setGoals] = useState('0');
  const [assists, setAssists] = useState('0');
  const [yellowCards, setYellowCards] = useState('0');
  const [redCards, setRedCards] = useState('0');
  const [minutesPlayed, setMinutesPlayed] = useState('0');

  const teamNameById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team.name]));
  }, [teams]);
  const selectedTournament = tournaments.find((item) => item.id === selectedTournamentId) ?? null;
  const selectedMatch = matches.find((item) => item.id === selectedMatchId) ?? null;

  const loadMatchData = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextTournaments, nextTeams] = await Promise.all([
        getTournaments(token),
        getTeams(token),
      ]);
      setTournaments(nextTournaments);
      setTeams(nextTeams);

      const nextTournamentId =
        selectedTournamentId ??
        nextTournaments.find((item) => item.status === 'ongoing')?.id ??
        nextTournaments[0]?.id ??
        null;
      setSelectedTournamentId(nextTournamentId);

      if (nextTournamentId) {
        const [nextMatches, nextStandings, nextTopScorers] = await Promise.all([
          getTournamentMatches(token, nextTournamentId),
          getTournamentStandings(token, nextTournamentId),
          getTopScorers(token, nextTournamentId),
        ]);
        setMatches(nextMatches);
        setStandings(nextStandings);
        setTopScorers(nextTopScorers);
        setSelectedMatchId((current) => current ?? nextMatches[0]?.id ?? null);
      } else {
        setMatches([]);
        setStandings([]);
        setTopScorers([]);
        setSelectedMatchId(null);
      }
    } catch (fetchError) {
      setError(getConnectivityMessage(fetchError, 'Could not load match data.'));
    } finally {
      setLoading(false);
    }
  }, [selectedTournamentId, token]);

  const loadStats = useCallback(
    async (matchId: number) => {
      if (!token) {
        return;
      }

      setStatsLoading(true);
      try {
        const nextStats = await getMatchStats(token, matchId);
        setMatchStats(nextStats);
      } catch {
        setMatchStats([]);
      } finally {
        setStatsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadMatchData();
  }, [loadMatchData, refreshKey]);

  useEffect(() => {
    if (!selectedMatchId) {
      setMatchStats([]);
      return;
    }

    loadStats(selectedMatchId);
  }, [loadStats, selectedMatchId]);

  useEffect(() => {
    if (!selectedMatch) {
      setHomeScore('');
      setAwayScore('');
      setStatus('scheduled');
      return;
    }

    setHomeScore(selectedMatch.home_score == null ? '' : String(selectedMatch.home_score));
    setAwayScore(selectedMatch.away_score == null ? '' : String(selectedMatch.away_score));
    setStatus(selectedMatch.status);
  }, [selectedMatch]);

  async function handleSelectTournament(tournamentId: number) {
    if (!token) {
      return;
    }

    setSelectedTournamentId(tournamentId);
    setSelectedMatchId(null);
    setLoading(true);
    setError(null);

    try {
      const [nextMatches, nextStandings, nextTopScorers] = await Promise.all([
        getTournamentMatches(token, tournamentId),
        getTournamentStandings(token, tournamentId),
        getTopScorers(token, tournamentId),
      ]);
      setMatches(nextMatches);
      setStandings(nextStandings);
      setTopScorers(nextTopScorers);
      setSelectedMatchId(nextMatches[0]?.id ?? null);
    } catch (fetchError) {
      setError(getConnectivityMessage(fetchError, 'Could not load tournament match data.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveScore() {
    if (!token || !selectedMatch) {
      return;
    }

    const parsedHomeScore = parseOptionalInteger(homeScore, 'Home score');
    const parsedAwayScore = parseOptionalInteger(awayScore, 'Away score');

    if (typeof parsedHomeScore === 'string') {
      setError(parsedHomeScore);
      return;
    }

    if (typeof parsedAwayScore === 'string') {
      setError(parsedAwayScore);
      return;
    }

    setSavingScore(true);
    setError(null);
    setSaveMessage(null);

    try {
      const updated = await updateMatch(token, selectedMatch.id, {
        status,
        home_score: parsedHomeScore,
        away_score: parsedAwayScore,
      });
      setMatches((current) => current.map((match) => (match.id === updated.id ? updated : match)));
      setSaveMessage('Match score was saved.');

      if (selectedTournamentId) {
        const [nextStandings, nextTopScorers] = await Promise.all([
          getTournamentStandings(token, selectedTournamentId),
          getTopScorers(token, selectedTournamentId),
        ]);
        setStandings(nextStandings);
        setTopScorers(nextTopScorers);
      }
    } catch (saveError) {
      setError(getConnectivityMessage(saveError, 'Could not save match score.'));
    } finally {
      setSavingScore(false);
    }
  }

  async function handleCreateMatch() {
    if (!token || !selectedTournamentId) {
      return;
    }

    const parsedHomeTeamId = parseRequiredInteger(newHomeTeamId, 'Home team ID');
    const parsedAwayTeamId = parseRequiredInteger(newAwayTeamId, 'Away team ID');

    if (typeof parsedHomeTeamId === 'string') {
      setError(parsedHomeTeamId);
      return;
    }

    if (typeof parsedAwayTeamId === 'string') {
      setError(parsedAwayTeamId);
      return;
    }

    if (parsedHomeTeamId === parsedAwayTeamId) {
      setError('Home team and away team must be different.');
      return;
    }

    const scheduledAt = parseRequiredDateTime(newScheduledAt);
    if (typeof scheduledAt === 'string') {
      setError(scheduledAt);
      return;
    }

    setCreatingMatch(true);
    setError(null);
    setSaveMessage(null);

    try {
      const created = await createMatch(token, {
        tournament_id: selectedTournamentId,
        home_team_id: parsedHomeTeamId,
        away_team_id: parsedAwayTeamId,
        scheduled_at: scheduledAt.toISOString(),
        venue: toOptionalString(newVenue),
        status: 'scheduled',
      });
      setMatches((current) => [created, ...current]);
      setSelectedMatchId(created.id);
      setNewHomeTeamId('');
      setNewAwayTeamId('');
      setNewScheduledAt('');
      setNewVenue('');
      setSaveMessage('Match was created.');
    } catch (createError) {
      setError(getConnectivityMessage(createError, 'Could not create match.'));
    } finally {
      setCreatingMatch(false);
    }
  }

  async function handleDeleteMatch() {
    if (!token || !selectedMatch) {
      return;
    }

    setDeletingMatch(true);
    setError(null);
    setSaveMessage(null);

    try {
      await deleteMatch(token, selectedMatch.id);
      setMatches((current) => {
        const next = current.filter((match) => match.id !== selectedMatch.id);
        setSelectedMatchId(next[0]?.id ?? null);
        return next;
      });
      setMatchStats([]);
      setSaveMessage('Match was deleted.');

      if (selectedTournamentId) {
        const [nextStandings, nextTopScorers] = await Promise.all([
          getTournamentStandings(token, selectedTournamentId),
          getTopScorers(token, selectedTournamentId),
        ]);
        setStandings(nextStandings);
        setTopScorers(nextTopScorers);
      }
    } catch (deleteError) {
      setError(getConnectivityMessage(deleteError, 'Could not delete match.'));
    } finally {
      setDeletingMatch(false);
    }
  }

  async function handleSavePlayerStat() {
    if (!token || !selectedMatch) {
      return;
    }

    const parsedPlayerId = parseRequiredInteger(playerId, 'Player ID');
    const parsedGoals = parseRequiredInteger(goals, 'Goals');
    const parsedAssists = parseRequiredInteger(assists, 'Assists');
    const parsedYellowCards = parseRequiredInteger(yellowCards, 'Yellow cards');
    const parsedRedCards = parseRequiredInteger(redCards, 'Red cards');
    const parsedMinutes = parseRequiredInteger(minutesPlayed, 'Minutes played');

    if (typeof parsedPlayerId === 'string') {
      setError(parsedPlayerId);
      return;
    }

    if (typeof parsedGoals === 'string') {
      setError(parsedGoals);
      return;
    }

    if (typeof parsedAssists === 'string') {
      setError(parsedAssists);
      return;
    }

    if (typeof parsedYellowCards === 'string') {
      setError(parsedYellowCards);
      return;
    }

    if (typeof parsedRedCards === 'string') {
      setError(parsedRedCards);
      return;
    }

    if (typeof parsedMinutes === 'string') {
      setError(parsedMinutes);
      return;
    }

    const payload = {
      player_id: parsedPlayerId,
      goals: parsedGoals,
      assists: parsedAssists,
      yellow_cards: parsedYellowCards,
      red_cards: parsedRedCards,
      minutes_played: parsedMinutes,
    };

    setSavingStat(true);
    setError(null);
    setSaveMessage(null);

    try {
      const existing = matchStats.find((item) => item.player_id === parsedPlayerId);
      const saved = existing
        ? await updatePlayerMatchStat(token, selectedMatch.id, parsedPlayerId, {
            goals: parsedGoals,
            assists: parsedAssists,
            yellow_cards: parsedYellowCards,
            red_cards: parsedRedCards,
            minutes_played: parsedMinutes,
          })
        : await recordPlayerMatchStat(token, selectedMatch.id, payload);

      setMatchStats((current) => {
        if (current.some((item) => item.player_id === saved.player_id)) {
          return current.map((item) => (item.player_id === saved.player_id ? saved : item));
        }

        return [saved, ...current];
      });
      setSaveMessage(existing ? 'Player stat was updated.' : 'Player stat was recorded.');

      if (selectedTournamentId) {
        setTopScorers(await getTopScorers(token, selectedTournamentId));
      }
    } catch (saveError) {
      setError(getConnectivityMessage(saveError, 'Could not save player stat.'));
    } finally {
      setSavingStat(false);
    }
  }

  async function handleDeletePlayerStat(stat: PlayerMatchStat) {
    if (!token || !selectedMatch) {
      return;
    }

    setDeletingStatPlayerId(stat.player_id);
    setError(null);
    setSaveMessage(null);

    try {
      await deletePlayerMatchStat(token, selectedMatch.id, stat.player_id);
      setMatchStats((current) => current.filter((item) => item.player_id !== stat.player_id));
      setSaveMessage(`Stats for player #${stat.player_id} were deleted.`);

      if (selectedTournamentId) {
        setTopScorers(await getTopScorers(token, selectedTournamentId));
      }
    } catch (deleteError) {
      setError(getConnectivityMessage(deleteError, 'Could not delete player stat.'));
    } finally {
      setDeletingStatPlayerId(null);
    }
  }

  return (
    <WorkflowScreen
      badgeLabel="Match"
      badgeTone="emerald"
      title="Match center"
      description="Review tournament fixtures, record scores, update player stat lines, and follow standings.">
      {error ? (
        <View className="mb-4">
          <WorkflowFeedback title="Match issue" message={error} tone="error" />
        </View>
      ) : null}
      {saveMessage ? (
        <View className="mb-4">
          <WorkflowFeedback title="Saved" message={saveMessage} tone="success" />
        </View>
      ) : null}

      <WorkflowSection
        eyebrow="Tournament"
        title="Active competition"
        action={<WorkflowButton label="Refresh" onPress={loadMatchData} disabled={loading} />}>
        {loading && tournaments.length === 0 ? (
          <LoadingState label="Loading tournaments..." />
        ) : tournaments.length === 0 ? (
          <WorkflowFeedback
            title="No tournaments"
            message="No tournament records were returned by the backend."
          />
        ) : (
          <View className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              {tournaments.map((tournament) => (
                <WorkflowButton
                  key={tournament.id}
                  label={tournament.name}
                  tone={tournament.id === selectedTournamentId ? 'emerald' : 'neutral'}
                  onPress={() => handleSelectTournament(tournament.id)}
                  disabled={loading}
                />
              ))}
            </View>
            {selectedTournament ? (
              <InfoCard
                title={selectedTournament.name}
                badge={selectedTournament.status}
                rows={[
                  ['Tournament ID', String(selectedTournament.id)],
                  ['Start', formatDate(selectedTournament.start_date)],
                  ['End', formatDate(selectedTournament.end_date)],
                ]}
                description={selectedTournament.description || 'No description provided.'}
              />
            ) : null}
          </View>
        )}
      </WorkflowSection>

      <WorkflowSection eyebrow="Fixtures" title="Matches">
        {loading && selectedTournamentId ? (
          <LoadingState label="Loading matches..." />
        ) : matches.length === 0 ? (
          <WorkflowFeedback
            title="No matches"
            message="This tournament does not have any matches returned by the backend yet."
          />
        ) : (
          <View className="gap-3">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                selected={match.id === selectedMatchId}
                teamNameById={teamNameById}
                onPress={() => setSelectedMatchId(match.id)}
              />
            ))}
          </View>
        )}
      </WorkflowSection>

      <WorkflowSection eyebrow="Create" title="Create match">
        {selectedTournamentId ? (
          <View className="gap-4">
            <View className="gap-4 md:flex-row">
              <View className="flex-1">
                <WorkflowInput
                  label="Home team ID"
                  value={newHomeTeamId}
                  onChangeText={setNewHomeTeamId}
                  placeholder="1"
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <WorkflowInput
                  label="Away team ID"
                  value={newAwayTeamId}
                  onChangeText={setNewAwayTeamId}
                  placeholder="2"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <WorkflowInput
              label="Scheduled time"
              value={newScheduledAt}
              onChangeText={setNewScheduledAt}
              placeholder="2026-05-10T15:00:00"
              autoCapitalize="none"
              helperText="Use a date/time value such as 2026-05-10T15:00:00."
            />
            <WorkflowInput
              label="Venue"
              value={newVenue}
              onChangeText={setNewVenue}
              placeholder="Main pitch"
            />
            <WorkflowButton
              label="Create match"
              onPress={handleCreateMatch}
              tone="emerald"
              loading={creatingMatch}
              disabled={creatingMatch}
            />
          </View>
        ) : (
          <WorkflowFeedback
            title="No tournament selected"
            message="Select a tournament before creating a match."
          />
        )}
      </WorkflowSection>

      <WorkflowSection eyebrow="Scoring" title="Record match score">
        {selectedMatch ? (
          <View className="gap-4">
            <InfoCard
              title={`${getTeamName(teamNameById, selectedMatch.home_team_id)} vs ${getTeamName(
                teamNameById,
                selectedMatch.away_team_id
              )}`}
              badge={selectedMatch.status}
              rows={[
                ['Match ID', String(selectedMatch.id)],
                ['Venue', selectedMatch.venue || 'Not set'],
                ['Scheduled', formatDateTime(selectedMatch.scheduled_at)],
              ]}
            />
            <View className="gap-4 md:flex-row">
              <View className="flex-1">
                <WorkflowInput
                  label="Home score"
                  value={homeScore}
                  onChangeText={setHomeScore}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <WorkflowInput
                  label="Away score"
                  value={awayScore}
                  onChangeText={setAwayScore}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {(['scheduled', 'ongoing', 'completed', 'cancelled'] as MatchStatus[]).map((item) => (
                <WorkflowButton
                  key={item}
                  label={item}
                  tone={status === item ? 'emerald' : 'neutral'}
                  onPress={() => setStatus(item)}
                  disabled={savingScore}
                />
              ))}
            </View>
            <WorkflowButton
              label="Save score"
              onPress={handleSaveScore}
              tone="emerald"
              loading={savingScore}
              disabled={savingScore}
            />
            <WorkflowButton
              label="Delete selected match"
              onPress={handleDeleteMatch}
              tone="danger"
              loading={deletingMatch}
              disabled={deletingMatch}
            />
          </View>
        ) : (
          <WorkflowFeedback
            title="No match selected"
            message="Select a match before recording a score."
          />
        )}
      </WorkflowSection>

      <WorkflowSection eyebrow="Player stats" title="Scoring details">
        {selectedMatch ? (
          <View className="gap-4">
            <View className="gap-4 md:flex-row">
              <View className="flex-1">
                <WorkflowInput
                  label="Player ID"
                  value={playerId}
                  onChangeText={setPlayerId}
                  placeholder="12"
                  keyboardType="number-pad"
                  helperText="Use the player ID from the roster/player detail screen."
                />
              </View>
              <View className="flex-1">
                <WorkflowInput
                  label="Minutes"
                  value={minutesPlayed}
                  onChangeText={setMinutesPlayed}
                  placeholder="90"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View className="gap-4 md:flex-row">
              <View className="flex-1">
                <WorkflowInput
                  label="Goals"
                  value={goals}
                  onChangeText={setGoals}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <WorkflowInput
                  label="Assists"
                  value={assists}
                  onChangeText={setAssists}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View className="gap-4 md:flex-row">
              <View className="flex-1">
                <WorkflowInput
                  label="Yellow cards"
                  value={yellowCards}
                  onChangeText={setYellowCards}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <WorkflowInput
                  label="Red cards"
                  value={redCards}
                  onChangeText={setRedCards}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <WorkflowButton
              label="Save player stat"
              onPress={handleSavePlayerStat}
              tone="emerald"
              loading={savingStat}
              disabled={savingStat}
            />
            {statsLoading ? (
              <LoadingState label="Loading match stats..." />
            ) : matchStats.length === 0 ? (
              <WorkflowFeedback
                title="No stat lines"
                message="No player scoring details have been recorded for this match yet."
              />
            ) : (
              <View className="gap-3">
                {matchStats.map((stat) => (
                  <StatCard
                    key={stat.id}
                    stat={stat}
                    deleting={deletingStatPlayerId === stat.player_id}
                    onDelete={() => handleDeletePlayerStat(stat)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <WorkflowFeedback
            title="No match selected"
            message="Select a match before adding stats."
          />
        )}
      </WorkflowSection>

      <WorkflowSection eyebrow="Table" title="Standings">
        {standings.length === 0 ? (
          <WorkflowFeedback
            title="No standings"
            message="Standings appear after completed matches with recorded scores."
          />
        ) : (
          <View className="gap-3">
            {standings.map((standing, index) => (
              <StandingCard key={standing.team_id} position={index + 1} standing={standing} />
            ))}
          </View>
        )}
      </WorkflowSection>

      <WorkflowSection eyebrow="Leaders" title="Top scorers">
        {topScorers.length === 0 ? (
          <WorkflowFeedback
            title="No scorers"
            message="Top scorers appear after player match stats are recorded."
          />
        ) : (
          <View className="gap-3">
            {topScorers.map((scorer, index) => (
              <TopScorerCard key={scorer.player_id} scorer={scorer} rank={index + 1} />
            ))}
          </View>
        )}
      </WorkflowSection>
    </WorkflowScreen>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View className="items-center rounded-2xl border border-slate-200 bg-slate-50 py-10">
      <ActivityIndicator color="#10b981" />
      <Text className="mt-3 text-sm text-slate-500">{label}</Text>
    </View>
  );
}

function MatchCard({
  match,
  onPress,
  selected,
  teamNameById,
}: {
  match: Match;
  onPress: () => void;
  selected: boolean;
  teamNameById: Map<number, string>;
}) {
  return (
    <View
      className={`overflow-hidden rounded-2xl border ${
        selected ? 'border-emerald-300' : 'border-slate-200'
      } bg-white`}>
      <View className={`h-[3px] w-full ${selected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-800">
              {getTeamName(teamNameById, match.home_team_id)} vs{' '}
              {getTeamName(teamNameById, match.away_team_id)}
            </Text>
            <Text className="mt-1 text-sm leading-6 text-slate-500">
              {formatDateTime(match.scheduled_at)} · {match.venue || 'Venue not set'}
            </Text>
          </View>
          <StatusBadge label={match.status} tone={getStatusTone(match.status)} />
        </View>
        <Text className="mt-4 text-3xl font-bold text-slate-800">
          {formatScore(match.home_score)} - {formatScore(match.away_score)}
        </Text>
        <View className="mt-4">
          <WorkflowButton
            label={selected ? 'Selected match' : 'Select match'}
            onPress={onPress}
            tone={selected ? 'emerald' : 'neutral'}
          />
        </View>
      </View>
    </View>
  );
}

function InfoCard({
  badge,
  description,
  rows,
  title,
}: {
  badge: string;
  description?: string;
  rows: [string, string][];
  title: string;
}) {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className="h-[3px] w-full bg-emerald-500" />
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-4">
          <Text className="flex-1 text-base font-semibold text-slate-800">{title}</Text>
          <StatusBadge label={badge} tone="emerald" />
        </View>
        {description ? (
          <Text className="mt-2 text-sm leading-6 text-slate-500">{description}</Text>
        ) : null}
        <View className="mt-4 gap-2">
          {rows.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </View>
      </View>
    </View>
  );
}

function StandingCard({ position, standing }: { position: number; standing: TeamStanding }) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-800">
            {position}. {standing.team_name}
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            {standing.wins}W {standing.draws}D {standing.losses}L · GD {standing.goal_difference}
          </Text>
        </View>
        <StatusBadge label={`${standing.points} pts`} tone="emerald" />
      </View>
      <View className="mt-3 gap-2">
        <DetailRow label="Played" value={String(standing.played)} />
        <DetailRow
          label="Goals"
          value={`${standing.goals_for} for / ${standing.goals_against} against`}
        />
      </View>
    </View>
  );
}

function TopScorerCard({ rank, scorer }: { rank: number; scorer: TopScorer }) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-800">
            {rank}. {scorer.player_name}
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            {scorer.assists} assists · {scorer.matches_played} matches
          </Text>
        </View>
        <StatusBadge label={`${scorer.goals} goals`} tone="amber" />
      </View>
    </View>
  );
}

function StatCard({
  deleting,
  onDelete,
  stat,
}: {
  deleting: boolean;
  onDelete: () => void;
  stat: PlayerMatchStat;
}) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="flex-1 text-base font-semibold text-slate-800">
          Player #{stat.player_id}
        </Text>
        <StatusBadge label={`${stat.goals} goals`} tone="emerald" />
      </View>
      <View className="mt-3 gap-2">
        <DetailRow label="Assists" value={String(stat.assists)} />
        <DetailRow label="Cards" value={`${stat.yellow_cards} yellow / ${stat.red_cards} red`} />
        <DetailRow label="Minutes" value={String(stat.minutes_played)} />
        <WorkflowButton
          label="Delete stat"
          onPress={onDelete}
          tone="danger"
          loading={deleting}
          disabled={deleting}
        />
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xs uppercase tracking-[1px] text-slate-400">{label}</Text>
      <Text className="text-sm text-slate-700">{value}</Text>
    </View>
  );
}

function getTeamName(teamNameById: Map<number, string>, teamId: number) {
  return teamNameById.get(teamId) ?? `Team #${teamId}`;
}

function getStatusTone(status: MatchStatus) {
  if (status === 'completed') {
    return 'emerald' as const;
  }

  if (status === 'ongoing') {
    return 'amber' as const;
  }

  if (status === 'cancelled') {
    return 'rose' as const;
  }

  return 'sky' as const;
}

function formatScore(value: number | null) {
  return value == null ? '-' : String(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function parseOptionalInteger(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return `${label} must be a non-negative whole number.`;
  }

  return parsed;
}

function parseRequiredInteger(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return `${label} is required.`;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return `${label} must be a non-negative whole number.`;
  }

  return parsed;
}

function parseRequiredDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Scheduled time is required.';
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return 'Scheduled time must be a valid date/time value.';
  }

  return parsed;
}

function toOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
