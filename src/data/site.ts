export const SITE = {
  name: 'Xleia',
  description: 'Xleia 的个人开发者网站、项目与跨领域技术实验室。',
  url: 'https://xleia.github.io',
  github: 'https://github.com/Xleia',
} as const;

export const NAV_ITEMS = [
  { label: '首页', href: '/' },
  { label: '项目', href: '/projects/' },
  { label: '博客', href: '/blog/' },
  { label: 'Lab', href: '/lab/' },
  { label: 'Studio', href: '/studio/' },
  { label: '关于', href: '/about/' },
] as const;
