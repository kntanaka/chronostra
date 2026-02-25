import type { TreeNode, ChronoData, TimelineEntry, TimelineStatus } from '$lib/types';

const TIMELINE_START = 2025;
const TIMELINE_END = 2050;

const CATEGORIES = [
  {
    name: 'Health & Fitness',
    goals: [
      { name: 'Physical Strength', projects: ['Weight Training', 'Cardio Program', 'Flexibility'] },
      { name: 'Mental Wellness', projects: ['Meditation', 'Therapy', 'Stress Management'] },
      { name: 'Nutrition', projects: ['Meal Planning', 'Supplements', 'Cooking Skills'] },
      { name: 'Sleep Quality', projects: ['Sleep Hygiene', 'Environment Setup'] }
    ]
  },
  {
    name: 'Career & Finance',
    goals: [
      { name: 'Income Growth', projects: ['Salary Negotiation', 'Promotion Path', 'Certifications'] },
      { name: 'Investment Portfolio', projects: ['Index Funds', 'Real Estate', 'Crypto Research'] },
      { name: 'Skills Development', projects: ['Programming', 'Leadership', 'Public Speaking'] },
      { name: 'Side Business', projects: ['Product MVP', 'Marketing', 'Revenue Scaling'] }
    ]
  },
  {
    name: 'Relationships',
    goals: [
      { name: 'Family Bonds', projects: ['Weekly Calls', 'Family Trips', 'Shared Activities'] },
      { name: 'Friendships', projects: ['Monthly Meetups', 'New Connections', 'Deep Conversations'] },
      { name: 'Community', projects: ['Volunteering', 'Local Groups', 'Online Communities'] },
      { name: 'Mentorship', projects: ['Finding Mentors', 'Being a Mentor'] }
    ]
  },
  {
    name: 'Personal Growth',
    goals: [
      { name: 'Reading', projects: ['Non-fiction', 'Fiction', 'Research Papers'] },
      { name: 'Meditation Practice', projects: ['Daily Sits', 'Retreats', 'Teaching'] },
      { name: 'Creative Writing', projects: ['Blog Posts', 'Short Stories', 'Journal'] },
      { name: 'Languages', projects: ['Japanese', 'Spanish', 'Mandarin'] }
    ]
  },
  {
    name: 'Living Environment',
    goals: [
      { name: 'Home Ownership', projects: ['Down Payment Saving', 'Location Research', 'Mortgage Planning'] },
      { name: 'Workspace Setup', projects: ['Ergonomic Desk', 'Monitor Setup', 'Lighting'] },
      { name: 'Location Independence', projects: ['Remote Work Skills', 'Travel Setup', 'Visa Research'] }
    ]
  },
  {
    name: 'Recreation',
    goals: [
      { name: 'Travel', projects: ['Asia Trip', 'Europe Backpacking', 'Road Trips'] },
      { name: 'Hobbies', projects: ['Photography', 'Music Production', 'Woodworking'] },
      { name: 'Sports', projects: ['Rock Climbing', 'Surfing', 'Martial Arts'] },
      { name: 'Cultural Experiences', projects: ['Museums', 'Concerts', 'Film Festivals'] }
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
  'Document learnings'
];

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

function generateTimeline(level: number): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (let year = TIMELINE_START; year <= TIMELINE_END; year++) {
    const hasValue = Math.random() > (level === 3 ? 0.6 : 0.3);
    entries.push({
      year,
      value: hasValue ? randomInt(0, 100) : null,
      status: hasValue ? randomStatus() : undefined
    });
  }
  return entries;
}

function generateTasks(projectName: string): TreeNode[] {
  const count = randomInt(3, 6);
  const tasks: TreeNode[] = [];
  const shuffled = [...TASK_TEMPLATES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    const future = randomInt(50, 100);
    const now = randomInt(0, future);
    tasks.push({
      id: nextId(),
      label: `${shuffled[i % shuffled.length]}`,
      level: 'task',
      depth: 3,
      metrics: { future, now, gap: future - now },
      timeline: generateTimeline(3)
    });
  }
  return tasks;
}

function aggregateMetrics(children: TreeNode[]): { future: number; now: number; gap: number } {
  const future = Math.round(children.reduce((s, c) => s + c.metrics.future, 0) / children.length);
  const now = Math.round(children.reduce((s, c) => s + c.metrics.now, 0) / children.length);
  return { future, now, gap: future - now };
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
          metrics: aggregateMetrics(tasks),
          timeline: generateTimeline(2),
          children: tasks
        };
      });
      return {
        id: nextId(),
        label: goal.name,
        level: 'goal' as const,
        depth: 1,
        metrics: aggregateMetrics(projects),
        timeline: generateTimeline(1),
        children: projects
      };
    });
    return {
      id: nextId(),
      label: cat.name,
      level: 'category' as const,
      depth: 0,
      metrics: aggregateMetrics(goals),
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
