export const SITE = {
  name: 'xleiaの个人博客',
  description: 'Xleia 的个人博客，记录开发笔记、学习过程和个人项目。',
  url: 'https://xleia.github.io',
  github: 'https://github.com/Xleia',
} as const;

// Restore the original Hexo / Fluid navigation labels and order.
export const NAV_ITEMS = [
  { label: '首页', href: '/' },
  { label: '归档', href: '/archives/' },
  { label: '分类', href: '/categories/' },
  { label: '标签', href: '/tags/' },
  { label: '作者', href: '/about/' },
] as const;
export const MORE_ITEMS = [
  { label: '项目', href: '/projects/' },
  { label: '实验室', href: '/lab/' },
  { label: '原版工作室', href: '/studio/legacy/' },
] as const;
