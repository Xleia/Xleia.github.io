/** Historical Hexo category/tag membership; existing article bodies are unchanged. */
export interface LegacyGroup { slug: string; paths: readonly string[]; }
export const LEGACY_TAGS: readonly LegacyGroup[] = [
  {
    "slug": "String",
    "paths": [
      "/2023/06/19/indexOf-与lastIndexOf-区别/"
    ]
  },
  {
    "slug": "debug",
    "paths": [
      "/2023/06/20/本地Java连接虚拟机Redis报错/",
      "/2023/06/16/SSM整合配置PageHelper遇到的坑/"
    ]
  },
  {
    "slug": "git",
    "paths": [
      "/2023/06/30/git推送代码到远程仓库报错/",
      "/2023/06/30/git常用命令及具体上传流程/"
    ]
  },
  {
    "slug": "helloworld",
    "paths": [
      "/2023/06/15/hello-world/"
    ]
  },
  {
    "slug": "mysql",
    "paths": [
      "/2023/06/09/DriverManager.register()为什么会注册两次驱动/"
    ]
  },
  {
    "slug": "redis",
    "paths": [
      "/2023/06/20/SpringBoot整合Redis/",
      "/2023/06/11/redis学习笔记/"
    ]
  },
  {
    "slug": "springboot",
    "paths": [
      "/2023/07/13/SpringBoot3学习笔记 --SpringBoot3-场景整合/",
      "/2023/07/11/Springboot3学习笔记（五）--Spring3-核心特性--核心原理/",
      "/2023/07/09/Springboot3学习笔记（四）--Spring3-核心特性--基础特性/",
      "/2023/07/09/Springboot3学习笔记（三）--Spring3-核心特性--数据访问/",
      "/2023/06/26/Springboot3学习笔记（二）--Spring3-核心特性--Web开发/",
      "/2023/06/25/Springboot3学习笔记（一）--Spring3-核心特性--快速入门/"
    ]
  },
  {
    "slug": "springcloud",
    "paths": [
      "/2023/07/18/SpringCloud学习笔记/"
    ]
  },
  {
    "slug": "vue",
    "paths": [
      "/2023/06/25/git clone下来的vue项目报错解决/"
    ]
  },
  {
    "slug": "算法",
    "paths": [
      "/2023/07/02/数据结构与算法---树形结构/",
      "/2023/06/22/数据结构与算法--线性结构/"
    ]
  }
];
export const LEGACY_CATEGORIES: readonly LegacyGroup[] = [
  {
    "slug": "DEBUG",
    "paths": [
      "/2023/06/30/git推送代码到远程仓库报错/",
      "/2023/06/25/git clone下来的vue项目报错解决/",
      "/2023/06/20/本地Java连接虚拟机Redis报错/",
      "/2023/06/16/SSM整合配置PageHelper遇到的坑/"
    ]
  },
  {
    "slug": "学习",
    "paths": [
      "/2023/07/18/SpringCloud学习笔记/",
      "/2023/07/13/SpringBoot3学习笔记 --SpringBoot3-场景整合/",
      "/2023/07/11/Springboot3学习笔记（五）--Spring3-核心特性--核心原理/",
      "/2023/07/09/Springboot3学习笔记（四）--Spring3-核心特性--基础特性/",
      "/2023/07/09/Springboot3学习笔记（三）--Spring3-核心特性--数据访问/",
      "/2023/07/02/数据结构与算法---树形结构/",
      "/2023/06/26/Springboot3学习笔记（二）--Spring3-核心特性--Web开发/",
      "/2023/06/25/Springboot3学习笔记（一）--Spring3-核心特性--快速入门/",
      "/2023/06/22/数据结构与算法--线性结构/",
      "/2023/06/20/SpringBoot整合Redis/",
      "/2023/06/19/indexOf-与lastIndexOf-区别/",
      "/2023/06/15/hello-world/",
      "/2023/06/11/redis学习笔记/",
      "/2023/06/09/DriverManager.register()为什么会注册两次驱动/"
    ]
  },
  {
    "slug": "操作命令",
    "paths": [
      "/2023/06/30/git常用命令及具体上传流程/"
    ]
  }
];
