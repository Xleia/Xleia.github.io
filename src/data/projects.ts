export interface Project {
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  technologies: readonly string[];
  highlights: readonly string[];
  symbol: string;
  availability: string;
}

export const PROJECTS: readonly Project[] = [
  {
    slug: 'koto',
    name: 'KOTO',
    category: '日语学习 · Web App',
    summary: '让音视频素材成为可跟读、可对照的日语学习内容。',
    description:
      'KOTO 是面向日语学习的音视频转录工具，围绕日语字幕、时间轴同步与学习过程进行设计。',
    technologies: ['React', 'TypeScript', 'Python', 'AI / Speech'],
    highlights: [
      '从音视频素材生成带时间信息的日语字幕',
      '播放时同步显示字幕，便于跟读与定位',
      '探索读音与短语分析在日语学习中的应用',
    ],
    symbol: '言',
    availability: '私人应用，公开体验入口尚未提供',
  },
  {
    slug: 'train-libre',
    name: 'Train Libre 中文版',
    category: '健身与营养 · Mobile App',
    summary: '围绕训练、饮食与身体数据的离线优先记录体验。',
    description:
      '基于 Flutter 的 Train Libre 中文化项目，聚焦训练日志、营养信息和中文用户体验。',
    technologies: ['Flutter', 'Dart', 'SQLite', 'Localization'],
    highlights: [
      '记录训练计划、训练过程与历史数据',
      '管理饮食与营养信息',
      '改善食品、动作及应用界面的中文显示',
    ],
    symbol: 'T',
    availability: '中文版下载入口尚待核实',
  },
] as const;

export function projectPath(project: Project): string {
  return `/projects/${project.slug}/`;
}
