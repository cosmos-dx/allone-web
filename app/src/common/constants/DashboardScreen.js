export const STAT_CONFIGS = [
  { iconName: 'key', label: 'Passwords', color: '#3b82f6', screen: 'Passwords' },
  { iconName: 'cellphone', label: 'Authenticator', color: '#ea580c', screen: 'Authenticator' },
  { iconName: 'account-group', label: 'Spaces', color: '#6366f1', screen: 'Spaces' },
  { iconName: 'receipt', label: 'Bills', color: '#10b981', screen: 'Bills' },
];

export const QUICK_ACTIONS = [
  { iconName: 'key', label: 'Add Passwords', screen: 'Passwords', color: '#3b82f6', colorEnd: '#2563eb' },
  { iconName: 'cellphone', label: 'Add Authenticator', screen: 'Authenticator', color: '#ea580c', colorEnd: '#c2410c' },
  { iconName: 'receipt', label: 'Add Bills', screen: 'Bills', color: '#10b981', colorEnd: '#059669' },
  { iconName: 'account-group', label: 'Add Spaces', screen: 'Spaces', color: '#6366f1', colorEnd: '#4f46e5' },
];

export const ACTIVE_SPACES_TITLE = 'Active spaces';
export const RECENT_ACTIVITY_TITLE = 'Recent activity';
export const ACTIVE_SPACES_EMPTY_TEXT = 'No spaces yet';
export const ACTIVE_SPACES_ADD_CTA = 'Add space';
export const RECENT_ACTIVITY_EMPTY_TEXT = 'No recent activity';
export const RECENT_ACTIVITY_LIMIT = 4;
export const ACTIVE_SPACES_MEMBER_LABEL = (count) => `${count} member${count !== 1 ? 's' : ''}`;
export const QUICK_ACTIONS_GRID_GAP = 12;

export const HEADER_ICON_SETTINGS = 'cog';
export const HEADER_ICON_NOTIFICATIONS = 'bell-outline';
export const NOTIFICATION_BAR_TITLE = 'Notifications';
export const NOTIFICATION_BAR_CLOSE = 'Close';
export const NOTIFICATION_BAR_CLEAR_ALL = 'Clear all';
export const NOTIFICATION_BAR_EMPTY = 'No notifications';

export const NOTIFICATION_TYPE_ICONS = {
  LOGIN: 'lock',
  SPACE_MEMBER_LOGIN: 'lock',
  SPACE_ADDED: 'account-plus',
  SPACE_REMOVED: 'account-remove',
  OWNERSHIP_TRANSFERRED: 'crown',
};
export const NOTIFICATION_DEFAULT_ICON = 'bell';

export const RELATIVE_TIME_MS_MINUTE = 60000;
export const RELATIVE_TIME_MS_HOUR = 3600000;
export const RELATIVE_TIME_MS_DAY = 86400000;

export const QUICK_ACTIONS_TITLE = 'Quick Actions';
export const HEADER_TITLE = 'Welcome back!';
export const INSIGHTS_BANNER_TITLE = 'Insights';

export const INSIGHT_SLIDES = [
  { key: 'passwords', title: 'Weak Passwords', screen: 'Passwords' },
  { key: 'spaces', title: 'Spaces (Most active)', screen: 'Spaces' },
  { key: 'bills', title: 'Bills', screen: 'Bills' },
  { key: 'authenticator', title: 'Authenticator', screen: 'Authenticator' },
];

export const STAT_CARD_WIDTH = 130;
export const HORIZONTAL_PADDING = 20;
export const CARD_GAP = 12;
export const BANNER_SLIDE_HEIGHT = 220;

export const BAR_HEIGHTS = [72, 45, 88, 55, 65, 40];
export const HORIZONTAL_BAR_DATA = [80, 60, 45, 90, 70];
export const LINE_CHART_POINTS = [20, 45, 35, 70, 55, 85];

export const WEAK_COUNT_PLACEHOLDER = 2;
export const PASSWORDS_ADDED_PLACEHOLDER = 3;
export const MOST_ACTIVE_SPACE_FALLBACK = 'Personal';

export const FADE_ANIM_DURATION = 400;