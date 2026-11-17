/** The navigation contract for the standalone spatial prototype. */
export type StudioZoneId = 'koto' | 'train' | 'blog' | 'lab' | 'about';
export type Vec3 = readonly [number, number, number];

export interface StudioZone {
  id: StudioZoneId;
  name: string;
  kicker: string;
  description: string;
  href: string;
  linkLabel: string;
  pin: Vec3;
  focus: Vec3;
  distance: number;
  azimuth: number;
  elevation: number;
}

export const STUDIO_ZONES: readonly StudioZone[] = [
  {
    id: 'koto', name: 'KOTO', kicker: '主工作台 / 日语学习',
    description: '音视频转录与日语学习工具。通过主显示器探索项目的设计方向。',
    href: '/projects/koto/', linkLabel: '查看 KOTO',
    pin: [0.05, 1.78, -0.47], focus: [0, 1.42, -0.67],
    distance: 5.6, azimuth: 0.28, elevation: 0.24,
  },
  {
    id: 'train', name: 'Train Libre 中文版', kicker: '移动设备 / 训练与营养',
    description: '面向训练、饮食与营养记录的中文化移动应用。此处只提供站内项目介绍。',
    href: '/projects/train-libre/', linkLabel: '查看 Train Libre',
    pin: [2.1, 1.45, 0.57], focus: [2.0, 1.08, 0.52],
    distance: 4.7, azimuth: 0.46, elevation: 0.26,
  },
  {
    id: 'blog', name: 'Blog · 文章书架', kicker: '左侧书架 / 技术积累',
    description: '沿原有永久链接保存的技术笔记，包含 Java、Spring、Redis、Git 和数据结构等主题。',
    href: '/blog/', linkLabel: '浏览技术文章',
    pin: [-3.24, 2.02, -1.97], focus: [-3.23, 1.6, -1.95],
    distance: 5.3, azimuth: 0.08, elevation: 0.20,
  },
  {
    id: 'lab', name: 'Tech Lab', kicker: '实验工作台 / 跨领域探索',
    description: '为 AI、后端、云、数据与安全等实验预留的区域。实验内容按未来真实进展逐步加入。',
    href: '/lab/', linkLabel: '进入 Lab',
    pin: [3.01, 1.66, -1.79], focus: [2.91, 1.25, -1.86],
    distance: 5.1, azimuth: 0.68, elevation: 0.19,
  },
  {
    id: 'about', name: 'About / Now', kicker: '私人角落 / 个人介绍',
    description: '了解 Xleia 与这间工作室：项目、学习过程，以及接下来值得探索的新想法。',
    href: '/about/', linkLabel: '了解 Xleia',
    pin: [-2.7, 1.06, 1.54], focus: [-2.75, 0.95, 1.46],
    distance: 5.3, azimuth: 0.54, elevation: 0.32,
  },
] as const;
