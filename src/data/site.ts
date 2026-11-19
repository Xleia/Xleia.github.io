export const SITE = {
  name: 'Xleia',
  description: 'Xleia 的个人博客，记录开发笔记、学习过程和个人项目。',
  url: 'https://xleia.github.io',
  github: 'https://github.com/Xleia',
} as const;

export const NAV_ITEMS = [
  { label: '回到工作室', href: '/' },
  { label: '文章归档', href: '/blog/' },
  { label: '项目', href: '/projects/' },
  { label: 'Lab', href: '/lab/' },
  { label: '关于', href: '/about/' },
] as const;
