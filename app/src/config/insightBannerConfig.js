import {
  BAR_HEIGHTS,
  HORIZONTAL_BAR_DATA,
  LINE_CHART_POINTS,
  WEAK_COUNT_PLACEHOLDER,
  PASSWORDS_ADDED_PLACEHOLDER,
  MOST_ACTIVE_SPACE_FALLBACK,
} from '../common/constants/DashboardScreen';

export function buildInsightSlides(data) {
  const {
    weakCount = WEAK_COUNT_PLACEHOLDER,
    mostActiveSpace = MOST_ACTIVE_SPACE_FALLBACK,
    passwordsAddedThisMonth = PASSWORDS_ADDED_PLACEHOLDER,
    totalBillsCount = 0,
    billsPaid = 0,
    billsOverdue = 0,
    totpCount = 0,
    totpAddedRecently = 0,
  } = data;

  return [
    {
      key: 'passwords',
      screen: 'Passwords',
      title: 'Weak passwords',
      subtitle: `${weakCount} need strengthening`,
      icon: 'shield-alert',
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      linkText: 'Fix',
      linkColor: '#9333ea',
      graphType: 'bar',
      graphConfig: { data: BAR_HEIGHTS },
    },
    {
      key: 'spaces',
      screen: 'Spaces',
      title: 'Spaces (Most active)',
      subtitle: `${mostActiveSpace} · ${passwordsAddedThisMonth} passwords added`,
      icon: 'account-group',
      iconBg: '#e0e7ff',
      iconColor: '#6366f1',
      graphType: 'horizontalBar',
      graphConfig: { data: HORIZONTAL_BAR_DATA },
    },
    {
      key: 'bills',
      screen: 'Bills',
      title: 'Bills',
      subtitle: 'Total · Paid · Overdue',
      icon: 'receipt',
      iconBg: '#d1fae5',
      iconColor: '#059669',
      graphType: 'statsStack',
      graphConfig: {
        stats: [
          { value: totalBillsCount, label: 'Total' },
          { value: billsPaid, label: 'Paid', valueColor: '#059669' },
          { value: billsOverdue, label: 'Overdue', valueColor: billsOverdue > 0 ? '#dc2626' : '#6b7280' },
        ],
        stack: [
          { flex: billsPaid || 1, color: '#10b981' },
          { flex: billsOverdue || 0.5, color: '#ef4444' },
          { flex: Math.max(totalBillsCount - billsPaid - billsOverdue, 0) || 0.5, color: '#e5e7eb' },
        ],
      },
    },
    {
      key: 'authenticator',
      screen: 'Authenticator',
      title: 'Authenticator',
      subtitle: `${totpCount} accounts · ${totpAddedRecently} added recently`,
      icon: 'cellphone',
      iconBg: '#ffedd5',
      iconColor: '#ea580c',
      graphType: 'lineChart',
      graphConfig: { data: LINE_CHART_POINTS },
    },
  ];
}
