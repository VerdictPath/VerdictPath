export const AVATARS = {
  CAPTAIN: {
    id: 'captain',
    name: 'The Captain',
    description: 'Bold and adventurous - leads the voyage through litigation',
    calmVideo: null,
    actionVideo: null,
    thumbnail: null,
    primaryColor: '#1E40AF',
    accentColor: '#60A5FA',
  },
  NAVIGATOR: {
    id: 'navigator',
    name: 'The Navigator',
    description: 'Strategic and precise - charts the course to victory',
    calmVideo: null,
    actionVideo: null,
    thumbnail: null,
    primaryColor: '#0F766E',
    accentColor: '#5EEAD4',
  },
  STRATEGIST: {
    id: 'strategist',
    name: 'The Strategist',
    description: 'Calculated and wise - plans every move carefully',
    calmVideo: null,
    actionVideo: null,
    thumbnail: null,
    primaryColor: '#7C3AED',
    accentColor: '#C4B5FD',
  },
  ADVOCATE: {
    id: 'advocate',
    name: 'The Advocate',
    description: 'Passionate and determined - fights for justice',
    calmVideo: null,
    actionVideo: null,
    thumbnail: null,
    primaryColor: '#DC2626',
    accentColor: '#FCA5A5',
  },
};

export const ACTION_TRIGGERS = {
  SUBSTAGE_COMPLETE: 'substage_complete',
  STAGE_COMPLETE: 'stage_complete',
  DAILY_BONUS: 'daily_bonus',
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
};

// NOTE: To enable video playback, add these video files:
// assets/avatars/captain/captain-calm.mp4
// assets/avatars/captain/captain-action.mp4
// assets/avatars/captain/captain-thumbnail.png
// (Same pattern for navigator, strategist, advocate)
