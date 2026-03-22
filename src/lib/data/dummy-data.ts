import type { TreeNode, ChronoData, TimelineEntry, TimelineStatus } from '$lib/types';

const TIMELINE_START = 2025;
const TIMELINE_END = 2050;

const CATEGORIES = [
  {
    name: 'Health & Fitness',
    goals: [
      { name: 'Physical Strength', projects: ['Weight Training', 'Cardio Program', 'Flexibility', 'Body Composition'] },
      { name: 'Mental Wellness', projects: ['Meditation', 'Therapy', 'Stress Management', 'Journaling'] },
      { name: 'Nutrition', projects: ['Meal Planning', 'Supplements', 'Cooking Skills', 'Hydration Tracking'] },
      { name: 'Sleep Quality', projects: ['Sleep Hygiene', 'Environment Setup', 'Sleep Tracking'] },
      { name: 'Medical Checkups', projects: ['Annual Physical', 'Dental Care', 'Eye Exams', 'Blood Work'] }
    ]
  },
  {
    name: 'Career & Finance',
    goals: [
      { name: 'Income Growth', projects: ['Salary Negotiation', 'Promotion Path', 'Certifications', 'Job Market Research'] },
      { name: 'Investment Portfolio', projects: ['Index Funds', 'Real Estate', 'Crypto Research', 'Bond Allocation'] },
      { name: 'Skills Development', projects: ['Programming', 'Leadership', 'Public Speaking', 'Data Analysis'] },
      { name: 'Side Business', projects: ['Product MVP', 'Marketing', 'Revenue Scaling', 'Customer Research'] },
      { name: 'Financial Planning', projects: ['Emergency Fund', 'Retirement Plan', 'Tax Optimization', 'Insurance Review'] }
    ]
  },
  {
    name: 'Relationships',
    goals: [
      { name: 'Family Bonds', projects: ['Weekly Calls', 'Family Trips', 'Shared Activities', 'Gift Planning'] },
      { name: 'Friendships', projects: ['Monthly Meetups', 'New Connections', 'Deep Conversations', 'Group Activities'] },
      { name: 'Community', projects: ['Volunteering', 'Local Groups', 'Online Communities', 'Neighborhood Events'] },
      { name: 'Mentorship', projects: ['Finding Mentors', 'Being a Mentor', 'Peer Learning Groups'] },
      { name: 'Romantic Partnership', projects: ['Date Nights', 'Communication Skills', 'Shared Goals', 'Conflict Resolution'] }
    ]
  },
  {
    name: 'Personal Growth',
    goals: [
      { name: 'Reading', projects: ['Non-fiction', 'Fiction', 'Research Papers', 'Book Club'] },
      { name: 'Meditation Practice', projects: ['Daily Sits', 'Retreats', 'Teaching', 'Body Scan'] },
      { name: 'Creative Writing', projects: ['Blog Posts', 'Short Stories', 'Journal', 'Poetry'] },
      { name: 'Languages', projects: ['Japanese', 'Spanish', 'Mandarin', 'French'] },
      { name: 'Philosophy & Ethics', projects: ['Stoicism Study', 'Ethics Reading', 'Philosophical Journal', 'Discussion Group'] }
    ]
  },
  {
    name: 'Living Environment',
    goals: [
      { name: 'Home Ownership', projects: ['Down Payment Saving', 'Location Research', 'Mortgage Planning', 'Home Inspection'] },
      { name: 'Workspace Setup', projects: ['Ergonomic Desk', 'Monitor Setup', 'Lighting', 'Cable Management'] },
      { name: 'Location Independence', projects: ['Remote Work Skills', 'Travel Setup', 'Visa Research', 'Co-living Research'] },
      { name: 'Minimalism', projects: ['Decluttering', 'Digital Cleanup', 'Capsule Wardrobe', 'Inventory System'] }
    ]
  },
  {
    name: 'Recreation',
    goals: [
      { name: 'Travel', projects: ['Asia Trip', 'Europe Backpacking', 'Road Trips', 'Solo Adventures'] },
      { name: 'Hobbies', projects: ['Photography', 'Music Production', 'Woodworking', 'Drawing'] },
      { name: 'Sports', projects: ['Rock Climbing', 'Surfing', 'Martial Arts', 'Running'] },
      { name: 'Cultural Experiences', projects: ['Museums', 'Concerts', 'Film Festivals', 'Theater'] }
    ]
  },
  {
    name: 'Education & Learning',
    goals: [
      { name: 'Formal Education', projects: ['Online Degree', 'MOOCs', 'Workshops', 'Conference Attendance'] },
      { name: 'Technical Skills', projects: ['AI/ML Basics', 'Cloud Computing', 'System Design', 'Security Fundamentals'] },
      { name: 'Creative Skills', projects: ['UI/UX Design', 'Video Editing', 'Animation', '3D Modeling'] },
      { name: 'Business Knowledge', projects: ['Accounting Basics', 'Marketing Strategy', 'Negotiation', 'Project Management'] },
      { name: 'Science Literacy', projects: ['Physics Fundamentals', 'Biology Updates', 'Climate Science', 'Space Exploration'] }
    ]
  },
  {
    name: 'Social Impact',
    goals: [
      { name: 'Environmental Action', projects: ['Carbon Footprint Reduction', 'Sustainable Shopping', 'Energy Efficiency', 'Composting'] },
      { name: 'Open Source', projects: ['Contributing to Projects', 'Maintaining Libraries', 'Documentation', 'Community Building'] },
      { name: 'Teaching & Sharing', projects: ['YouTube Channel', 'Blog Platform', 'Workshop Hosting', 'Podcast'] },
      { name: 'Philanthropy', projects: ['Monthly Donations', 'Cause Research', 'Fundraising Events', 'Skills-based Volunteering'] }
    ]
  },
  {
    name: 'Digital Life',
    goals: [
      { name: 'Privacy & Security', projects: ['Password Management', 'VPN Setup', 'Data Backup', 'Digital Footprint Audit'] },
      { name: 'Productivity Systems', projects: ['Task Management', 'Note-taking System', 'Automation Scripts', 'Calendar Optimization'] },
      { name: 'Content Curation', projects: ['RSS Feeds', 'Bookmark Organization', 'Newsletter Subscriptions', 'Knowledge Base'] },
      { name: 'Digital Detox', projects: ['Screen Time Limits', 'Social Media Diet', 'Notification Management', 'Offline Hobbies'] }
    ]
  },
  {
    name: 'Legacy & Long-term',
    goals: [
      { name: 'Estate Planning', projects: ['Will Creation', 'Trust Setup', 'Beneficiary Updates', 'Document Organization'] },
      { name: 'Life Documentation', projects: ['Photo Archive', 'Memory Journal', 'Family Tree', 'Video Messages'] },
      { name: 'Generational Wealth', projects: ['Education Fund', 'Property Investment', 'Business Succession', 'Financial Literacy Teaching'] },
      { name: 'Personal Brand', projects: ['Portfolio Website', 'Professional Network', 'Thought Leadership', 'Public Speaking'] }
    ]
  }
];

const TASK_TEMPLATES = [
  'Research best practices',
  'Set initial goals',
  'Create weekly schedule',
  'Track progress metrics',
  'Review and adjust plan',
  'Find resources & tools',
  'Build daily routine',
  'Milestone checkpoint',
  'Seek feedback',
  'Document learnings',
  'Define success criteria',
  'Set up tracking system',
  'Create accountability plan',
  'Benchmark current state',
  'Plan quarterly review'
];

const METRIC_TEXTS: Record<string, { future: string[]; now: string[]; gap: string[] }> = {
  category: {
    future: [
      '各分野で自律的に成長し続ける状態',
      '持続可能な生活基盤が完成している',
      '長期ビジョンが明確で実行中',
      '全ゴールが計画通り進行している',
      '理想のライフバランスを実現',
    ],
    now: [
      '方向性は定まったが実行が不十分',
      '一部のゴールのみ着手済み',
      '基盤づくりの初期段階',
      '計画は立てたが進捗にばらつき',
      '優先順位の整理が必要な段階',
    ],
    gap: [
      '実行力と習慣化が不足',
      '時間配分の最適化が必要',
      'リソースの集中投下が課題',
      '横断的な連携が取れていない',
      '定期的な振り返りの仕組みがない',
    ],
  },
  goal: {
    future: [
      '明確なKPIを達成し維持している',
      '習慣として定着し自動化されている',
      '専門的なスキルが身についている',
      '成果が目に見える形で現れている',
      '他者にも教えられるレベル',
    ],
    now: [
      '目標は設定済みだが未着手が多い',
      '断続的に取り組んでいる状態',
      '基礎的な知識は習得済み',
      '試行錯誤の段階にある',
      '週1回程度の取り組み頻度',
    ],
    gap: [
      '継続的な実践の仕組みが必要',
      'スキルの深掘りが不足している',
      '具体的な行動計画が曖昧',
      'モチベーション維持の工夫が必要',
      '進捗を測る指標が未定義',
    ],
  },
  project: {
    future: [
      '本格運用中で安定した成果',
      'プロジェクト完了し成果を活用中',
      'チームで運用できる体制が整備',
      '自動化され最小限の管理で運用',
      '期待以上の成果を達成',
    ],
    now: [
      'MVP開発中で基本機能を実装中',
      '調査フェーズが完了し計画策定中',
      '初期テストを実施している段階',
      'プロトタイプを作成中',
      'キックオフ直後で体制構築中',
    ],
    gap: [
      '品質向上とテスト強化が必要',
      'ドキュメント整備が遅れている',
      'スケジュール遅延のリスクあり',
      '技術的な課題が未解決',
      'フィードバックの反映が追いついていない',
    ],
  },
  task: {
    future: [
      '完了し次のタスクに移行済み',
      '期限内に高品質で完了',
      '成果物が承認され活用されている',
      'ベストプラクティスとして確立',
      '定期的に実行される仕組み化',
    ],
    now: [
      '着手したが進捗30%程度',
      'まだ情報収集の段階',
      '半分まで進んでいるが停滞中',
      'レビュー待ちの状態',
      '優先度を上げて取り組み中',
    ],
    gap: [
      '作業時間の確保が課題',
      '前提タスクの完了待ち',
      '技術的な調査が追加で必要',
      'レビューアーの確保が必要',
      '要件の明確化が不十分',
    ],
  },
};

function pickMetricText(level: string, field: 'future' | 'now' | 'gap'): string {
  const texts = METRIC_TEXTS[level]?.[field] ?? METRIC_TEXTS.task[field];
  return texts[randomInt(0, texts.length - 1)];
}

let idCounter = 0;
function nextId(): string {
  return `node-${++idCounter}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomStatus(): TimelineStatus {
  const statuses: TimelineStatus[] = ['planned', 'active', 'completed', 'at-risk'];
  return statuses[randomInt(0, 3)];
}

const TIMELINE_TEXTS: Record<string, string[]> = {
  category: [
    '全体戦略の見直しと方向性の再定義を実施',
    '重点分野への集中投資とリソース再配分',
    '長期的な基盤構築フェーズに移行する',
    '拡大期：新規領域への展開を加速させる',
    '安定運用体制の確立と効率化の推進',
    '組織再編成に伴う優先順位の調整',
    '新方針に基づくロードマップの策定',
    '各ゴールの統合と横断的な成果評価',
    '成熟期に入り持続可能な仕組みづくり',
    '次世代への移行計画と引き継ぎ準備'
  ],
  goal: [
    'KPIを明確にした年間目標の設定と合意',
    '具体的なアクションプランと期限の策定',
    '計画に基づいた実行フェーズを開始する',
    '中間地点での進捗評価と課題の洗い出し',
    'データに基づく軌道修正と計画の更新',
    'リソース追加による進捗の加速を図る',
    '年末達成に向けた最終調整と追い込み',
    '成果の振り返りと学びのドキュメント化',
    '次期サイクルの目標設定に向けた準備',
    '目標達成を確認し次のフェーズへ移行'
  ],
  project: [
    'プロジェクトキックオフミーティングを実施',
    '市場調査とベンチマーク分析レポート作成',
    'MVP（最小限の実用製品）の開発と完成',
    'ユーザーを限定したテスト運用を開始する',
    'フィードバックを反映した改善版をリリース',
    '本格運用に向けた体制整備とドキュメント化',
    'スケールアップに向けた自動化と最適化',
    'パフォーマンス改善と技術的負債の解消',
    'チームメンバーへの引き継ぎと知識共有',
    '最終成果報告書の作成とステークホルダー共有'
  ],
  task: [
    '初期リサーチと情報収集に着手する',
    '関連資料の調査と分析を進行中',
    'タスクを進行中。予定通りのペース',
    'レビュー担当者からの確認待ち状態',
    '成果物のレビューとフィードバック対応',
    '指摘事項に基づく修正作業を実施中',
    'すべての要件を満たし完了とする',
    '優先度変更により一時保留とする',
    'ブロッカー解消に伴いタスクを再開',
    '実装結果の検証とテストケース実行中'
  ]
};

function pickTimelineText(level: string): string {
  const texts = TIMELINE_TEXTS[level] ?? TIMELINE_TEXTS.task;
  return texts[randomInt(0, texts.length - 1)];
}

function generateTimeline(level: number): TimelineEntry[] {
  const levelKey = ['category', 'goal', 'project', 'task'][level] ?? 'task';
  const entries: TimelineEntry[] = [];
  for (let year = TIMELINE_START; year <= TIMELINE_END; year++) {
    const hasText = Math.random() > (level === 3 ? 0.6 : 0.3);
    entries.push({
      year,
      text: hasText ? pickTimelineText(levelKey) : '',
      status: hasText ? randomStatus() : undefined
    });
  }
  return entries;
}

function generateTasks(projectName: string): TreeNode[] {
  const count = randomInt(4, 8);
  const tasks: TreeNode[] = [];
  const shuffled = [...TASK_TEMPLATES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    tasks.push({
      id: nextId(),
      label: `${shuffled[i % shuffled.length]}`,
      level: 'task',
      depth: 3,
      metrics: {
        future: pickMetricText('task', 'future'),
        now: pickMetricText('task', 'now'),
        gap: pickMetricText('task', 'gap'),
      },
      timeline: generateTimeline(3)
    });
  }
  return tasks;
}

function generateMetricsForLevel(level: string): { future: string; now: string; gap: string } {
  return {
    future: pickMetricText(level, 'future'),
    now: pickMetricText(level, 'now'),
    gap: pickMetricText(level, 'gap'),
  };
}

export function generateDummyData(): ChronoData {
  idCounter = 0;
  const categories: TreeNode[] = CATEGORIES.map((cat) => {
    const goals: TreeNode[] = cat.goals.map((goal) => {
      const projects: TreeNode[] = goal.projects.map((proj) => {
        const tasks = generateTasks(proj);
        return {
          id: nextId(),
          label: proj,
          level: 'project' as const,
          depth: 2,
          metrics: generateMetricsForLevel('project'),
          timeline: generateTimeline(2),
          children: tasks
        };
      });
      return {
        id: nextId(),
        label: goal.name,
        level: 'goal' as const,
        depth: 1,
        metrics: generateMetricsForLevel('goal'),
        timeline: generateTimeline(1),
        children: projects
      };
    });
    return {
      id: nextId(),
      label: cat.name,
      level: 'category' as const,
      depth: 0,
      metrics: generateMetricsForLevel('category'),
      timeline: generateTimeline(0),
      children: goals
    };
  });

  return { categories };
}

export function countAllNodes(data: ChronoData): number {
  function count(nodes: TreeNode[]): number {
    return nodes.reduce((sum, n) => sum + 1 + (n.children ? count(n.children) : 0), 0);
  }
  return count(data.categories);
}
