export type CaptureAsset = {
  uri: string;
  width?: number;
  height?: number;
  fileSize?: number;
  fileName?: string | null;
  mimeType?: string | null;
};

export type AppRoute =
  | {
      name: 'Home';
    }
  | {
      name: 'Teams';
      params: {
        refreshKey: number;
      };
    }
  | {
      name: 'FaceMatch';
    }
  | {
      name: 'LiveCapture';
      params: {
        consumerKey: string;
        mode: 'enroll' | 'match';
        title: string;
        description: string;
      };
    }
  | {
      name: 'CreateTeam';
    }
  | {
      name: 'EditTeam';
      params: {
        teamId: number;
      };
    }
  | {
      name: 'TeamDetail';
      params: {
        teamId: number;
        teamName: string;
        refreshKey: number;
      };
    }
  | {
      name: 'CreateSubteam';
      params: {
        teamId: number;
        teamName: string;
      };
    }
  | {
      name: 'EditSubteam';
      params: {
        subteamId: number;
        teamId: number;
      };
    }
  | {
      name: 'SubteamDetail';
      params: {
        subteamId: number;
        subteamName: string;
        refreshKey: number;
      };
    }
  | {
      name: 'CreatePlayer';
      params: {
        subteamId: number;
        subteamName: string;
      };
    }
  | {
      name: 'EditPlayer';
      params: {
        playerId: number;
        subteamId: number;
      };
    }
  | {
      name: 'Activity';
      params: {
        refreshKey: number;
      };
    }
  | {
      name: 'Profile';
    }
  | {
      name: 'PlayerDetail';
      params: {
        playerId: number;
        playerName: string;
        subteamId?: number;
      };
    };
