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

// 新闻源配置 - 使用可靠的直接 API
const NEWS_SOURCES = {
    // Hacker News - 科技 (直接API，最可靠)
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
    // Hacker News Best - 学术/技术深度文章
    hackernews_best: {
        id: 'hackernews_best',
        name: 'HN Best',
        category: 'academic',
        icon: 'https://news.ycombinator.com/favicon.ico',
        color: '#ff6600',
        api: 'https://hacker-news.firebaseio.com/v0/beststories.json',
        itemApi: 'https://hacker-news.firebaseio.com/v0/item/{id}.json',
        type: 'hackernews',
        enabled: true
    },
    // Hacker News New - 综合/最新
    hackernews_new: {
        id: 'hackernews_new',
        name: 'HN New',
        category: 'general',
        icon: 'https://news.ycombinator.com/favicon.ico',
        color: '#ff6600',
        api: 'https://hacker-news.firebaseio.com/v0/newstories.json',
        itemApi: 'https://hacker-news.firebaseio.com/v0/item/{id}.json',
        type: 'hackernews',
        enabled: true
    },
    // Hacker News Ask - 综合/讨论
    hackernews_ask: {
        id: 'hackernews_ask',
        name: 'HN Ask',
        category: 'general',
        icon: 'https://news.ycombinator.com/favicon.ico',
        color: '#ff6600',
        api: 'https://hacker-news.firebaseio.com/v0/askstories.json',
        itemApi: 'https://hacker-news.firebaseio.com/v0/item/{id}.json',
        type: 'hackernews',
        enabled: true
    },
    // Hacker News Show - 开发者
    hackernews_show: {
        id: 'hackernews_show',
        name: 'HN Show',
        category: 'dev',
        icon: 'https://news.ycombinator.com/favicon.ico',
        color: '#ff6600',
        api: 'https://hacker-news.firebaseio.com/v0/showstories.json',
        itemApi: 'https://hacker-news.firebaseio.com/v0/item/{id}.json',
        type: 'hackernews',
        enabled: true
    },
    // GitHub Trending - 开发者 (直接 API)
    github: {
        id: 'github',
        name: 'GitHub Trending',
        category: 'dev',
        icon: 'https://github.githubassets.com/favicons/favicon.svg',
        color: '#24292e',
        api: 'https://api.github.com/search/repositories?q=stars:>1000+pushed:>2024-12-01&sort=updated&order=desc&per_page=15',
        type: 'github_api',
        enabled: true
    },
    // GitHub ML/AI - 学术
    github_ml: {
        id: 'github_ml',
        name: 'GitHub AI/ML',
        category: 'academic',
        icon: 'https://github.githubassets.com/favicons/favicon.svg',
        color: '#24292e',
        api: 'https://api.github.com/search/repositories?q=topic:machine-learning+stars:>500+pushed:>2024-12-01&sort=updated&order=desc&per_page=15',
        type: 'github_api',
        enabled: true
    },
    // V2EX - 科技
    v2ex: {
        id: 'v2ex',
        name: 'V2EX',
        category: 'tech',
        icon: 'https://www.v2ex.com/static/icon-192.png',
        color: '#1a1a1a',
        api: 'https://www.v2ex.com/api/topics/hot.json',
        type: 'v2ex',
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

        // 获取前15条（减少请求数）
        const items = await Promise.all(
            ids.slice(0, 15).map(async (id) => {
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
    },

    /**
     * Reddit API 适配
     */
    reddit: async function (source) {
        const proxyUrl = CORS_PROXIES[0] + encodeURIComponent(source.api);
        const response = await fetch(proxyUrl);
        const data = await response.json();

        if (!data.data || !data.data.children) {
            return [];
        }

        return data.data.children
            .filter(item => item.data && !item.data.stickied)
            .slice(0, 20)
            .map((item, index) => ({
                id: `reddit-${item.data.id}`,
                title: item.data.title,
                url: item.data.url || `https://reddit.com${item.data.permalink}`,
                description: item.data.selftext?.substring(0, 100) || '',
                source: source.name,
                sourceId: source.id,
                sourceIcon: source.icon,
                sourceColor: source.color,
                timestamp: item.data.created_utc * 1000,
                hot: item.data.score || 0
            }));
    },

    /**
     * GitHub API 适配
     */
    github_api: async function (source) {
        const response = await fetch(source.api);
        const data = await response.json();

        if (!data.items) {
            return [];
        }

        return data.items.slice(0, 20).map((item, index) => ({
            id: `github-${item.id}`,
            title: `${item.full_name} - ${item.description || 'No description'}`,
            url: item.html_url,
            description: `⭐ ${item.stargazers_count} | ${item.language || 'Unknown'}`,
            source: source.name,
            sourceId: source.id,
            sourceIcon: source.icon,
            sourceColor: source.color,
            timestamp: new Date(item.pushed_at).getTime(),
            hot: item.stargazers_count || 0
        }));
    },

    /**
     * Lobsters API 适配
     */
    lobsters: async function (source) {
        const proxyUrl = CORS_PROXIES[0] + encodeURIComponent(source.api);
        const response = await fetch(proxyUrl);
        const data = await response.json();

        return data.slice(0, 20).map((item, index) => ({
            id: `lobsters-${item.short_id}`,
            title: item.title,
            url: item.url || item.comments_url,
            description: item.tags?.join(', ') || '',
            source: source.name,
            sourceId: source.id,
            sourceIcon: source.icon,
            sourceColor: source.color,
            timestamp: new Date(item.created_at).getTime(),
            hot: item.score || 0
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
