/**
 * 新闻源配置和数据适配器
 * NewsNow-inspired Real-time News Board
 */

// CORS 代理配置
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
];

// 新闻源分类
const NEWS_CATEGORIES = {
    tech: { name: '科技', icon: 'icon-desktop', color: '#3498db' },
    academic: { name: '学术', icon: 'icon-graduation-cap', color: '#9b59b6' },
    general: { name: '综合', icon: 'icon-fire', color: '#e74c3c' },
    dev: { name: '开发者', icon: 'icon-code', color: '#2ecc71' }
};

// 新闻源配置
const NEWS_SOURCES = {
    // GitHub Trending
    github: {
        id: 'github',
        name: 'GitHub Trending',
        category: 'dev',
        icon: 'https://github.githubassets.com/favicons/favicon.svg',
        color: '#24292e',
        api: 'https://rsshub.app/github/trending/daily/any',
        type: 'rss',
        enabled: true
    },
    // Hacker News
    hackernews: {
        id: 'hackernews',
        name: 'Hacker News',
        category: 'tech',
        icon: 'https://news.ycombinator.com/favicon.ico',
        color: '#ff6600',
        api: 'https://hacker-news.firebaseio.com/v0/topstories.json',
        itemApi: 'https://hacker-news.firebaseio.com/v0/item/{id}.json',
        type: 'hackernews',
        enabled: true
    },
    // V2EX
    v2ex: {
        id: 'v2ex',
        name: 'V2EX',
        category: 'tech',
        icon: 'https://www.v2ex.com/static/icon-192.png',
        color: '#1a1a1a',
        api: 'https://www.v2ex.com/api/topics/hot.json',
        type: 'v2ex',
        enabled: true
    },
    // 知乎热榜
    zhihu: {
        id: 'zhihu',
        name: '知乎热榜',
        category: 'general',
        icon: 'https://static.zhihu.com/heifetz/favicon.ico',
        color: '#0084ff',
        api: 'https://rsshub.app/zhihu/hotlist',
        type: 'rss',
        enabled: true
    },
    // 微博热搜
    weibo: {
        id: 'weibo',
        name: '微博热搜',
        category: 'general',
        icon: 'https://weibo.com/favicon.ico',
        color: '#ff8200',
        api: 'https://rsshub.app/weibo/search/hot',
        type: 'rss',
        enabled: true
    },
    // 36氪
    kr36: {
        id: 'kr36',
        name: '36氪',
        category: 'tech',
        icon: 'https://36kr.com/favicon.ico',
        color: '#0076f6',
        api: 'https://rsshub.app/36kr/newsflashes',
        type: 'rss',
        enabled: true
    },
    // arXiv (学术)
    arxiv: {
        id: 'arxiv',
        name: 'arXiv CS',
        category: 'academic',
        icon: 'https://arxiv.org/favicon.ico',
        color: '#b31b1b',
        api: 'https://rsshub.app/arxiv/cs.AI',
        type: 'rss',
        enabled: true
    },
    // Product Hunt
    producthunt: {
        id: 'producthunt',
        name: 'Product Hunt',
        category: 'tech',
        icon: 'https://ph-static.imgix.net/ph-favicon.ico',
        color: '#da552f',
        api: 'https://rsshub.app/producthunt/today',
        type: 'rss',
        enabled: true
    }
};

/**
 * 数据适配器 - 将不同API格式统一化
 */
const DataAdapters = {
    /**
     * RSS 数据适配 (通过 RSSHub)
     */
    rss: async function (source) {
        const proxyUrl = CORS_PROXIES[0] + encodeURIComponent(source.api);
        const response = await fetch(proxyUrl);
        const text = await response.text();

        // 解析 RSS XML
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        const items = doc.querySelectorAll('item');

        return Array.from(items).slice(0, 20).map((item, index) => ({
            id: `${source.id}-${index}-${Date.now()}`,
            title: item.querySelector('title')?.textContent || '',
            url: item.querySelector('link')?.textContent || '',
            description: item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '').substring(0, 100) || '',
            source: source.name,
            sourceId: source.id,
            sourceIcon: source.icon,
            sourceColor: source.color,
            timestamp: new Date(item.querySelector('pubDate')?.textContent || Date.now()).getTime(),
            hot: 20 - index
        }));
    },

    /**
     * Hacker News API 适配
     */
    hackernews: async function (source) {
        const response = await fetch(source.api);
        const ids = await response.json();

        // 获取前20条
        const items = await Promise.all(
            ids.slice(0, 20).map(async (id) => {
                const itemResponse = await fetch(source.itemApi.replace('{id}', id));
                return itemResponse.json();
            })
        );

        return items.filter(item => item && item.title).map((item, index) => ({
            id: `hn-${item.id}`,
            title: item.title,
            url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
            description: '',
            source: source.name,
            sourceId: source.id,
            sourceIcon: source.icon,
            sourceColor: source.color,
            timestamp: item.time * 1000,
            hot: item.score || 0
        }));
    },

    /**
     * V2EX API 适配
     */
    v2ex: async function (source) {
        const proxyUrl = CORS_PROXIES[0] + encodeURIComponent(source.api);
        const response = await fetch(proxyUrl);
        const data = await response.json();

        return data.slice(0, 20).map((item, index) => ({
            id: `v2ex-${item.id}`,
            title: item.title,
            url: item.url,
            description: item.content?.substring(0, 100) || '',
            source: source.name,
            sourceId: source.id,
            sourceIcon: source.icon,
            sourceColor: source.color,
            timestamp: item.created * 1000,
            hot: item.replies || 0
        }));
    }
};

/**
 * 获取单个新闻源数据
 */
async function fetchSourceNews(sourceId) {
    const source = NEWS_SOURCES[sourceId];
    if (!source || !source.enabled) {
        return [];
    }

    try {
        const adapter = DataAdapters[source.type];
        if (!adapter) {
            console.warn(`No adapter for source type: ${source.type}`);
            return [];
        }
        return await adapter(source);
    } catch (error) {
        console.error(`Failed to fetch ${source.name}:`, error);
        return [];
    }
}

/**
 * 获取所有启用的新闻源数据
 */
async function fetchAllNews(category = null) {
    const sources = Object.values(NEWS_SOURCES).filter(s => {
        if (!s.enabled) return false;
        if (category && s.category !== category) return false;
        return true;
    });

    const results = await Promise.allSettled(
        sources.map(source => fetchSourceNews(source.id))
    );

    const allNews = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);

    // 按时间排序
    return allNews.sort((a, b) => b.timestamp - a.timestamp);
}

// 导出
window.NewsBoard = {
    SOURCES: NEWS_SOURCES,
    CATEGORIES: NEWS_CATEGORIES,
    fetchSourceNews,
    fetchAllNews
};
