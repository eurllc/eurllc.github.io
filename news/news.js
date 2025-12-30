/**
 * 新闻看板核心逻辑
 * NewsNow-inspired Real-time News Board
 */

(function () {
    'use strict';

    // 配置
    const CONFIG = {
        CACHE_DURATION: 30 * 60 * 1000, // 30分钟缓存
        CACHE_KEY_PREFIX: 'eurllc_news_',
        AUTO_REFRESH_INTERVAL: 5 * 60 * 1000, // 5分钟自动刷新
        SKELETON_COUNT: 6
    };

    // 状态
    let currentCategory = null;
    let isLoading = false;
    let autoRefreshTimer = null;

    /**
     * 初始化新闻看板
     */
    function init() {
        renderFilters();
        loadNewsWithCache();
        setupAutoRefresh();
        setupEventListeners();
    }

    /**
     * 渲染分类筛选器
     */
    function renderFilters() {
        const filtersContainer = document.getElementById('news-filters');
        if (!filtersContainer) return;

        const categories = window.NewsBoard?.CATEGORIES || {};

        let html = `
            <button class="news-filter-btn active" data-category="">
                <i class="icon-th-large"></i>全部
            </button>
        `;

        for (const [id, cat] of Object.entries(categories)) {
            html += `
                <button class="news-filter-btn" data-category="${id}">
                    <i class="${cat.icon}"></i>${cat.name}
                </button>
            `;
        }

        filtersContainer.innerHTML = html;
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners() {
        // 分类筛选
        document.getElementById('news-filters')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.news-filter-btn');
            if (!btn) return;

            document.querySelectorAll('.news-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentCategory = btn.dataset.category || null;
            loadNewsWithCache();
        });

        // 刷新按钮
        document.getElementById('news-refresh-btn')?.addEventListener('click', () => {
            forceRefresh();
        });
    }

    /**
     * 设置自动刷新
     */
    function setupAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
        }
        autoRefreshTimer = setInterval(() => {
            if (!document.hidden) {
                loadNewsWithCache();
            }
        }, CONFIG.AUTO_REFRESH_INTERVAL);

        // 页面可见时刷新
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                checkAndRefresh();
            }
        });
    }

    /**
     * 检查并刷新（如果缓存过期）
     */
    function checkAndRefresh() {
        const cacheKey = getCacheKey();
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            const { timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp >= CONFIG.CACHE_DURATION) {
                loadNews();
            }
        }
    }

    /**
     * 获取缓存键
     */
    function getCacheKey() {
        return CONFIG.CACHE_KEY_PREFIX + (currentCategory || 'all');
    }

    /**
     * 从缓存加载新闻
     */
    function loadNewsWithCache() {
        const cacheKey = getCacheKey();
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;

                if (age < CONFIG.CACHE_DURATION) {
                    renderNews(data);
                    renderCacheInfo(timestamp);
                    return;
                }
            } catch (e) {
                console.warn('Cache parse error:', e);
            }
        }

        loadNews();
    }

    /**
     * 加载新闻数据
     */
    async function loadNews() {
        if (isLoading) return;
        isLoading = true;

        showLoading();
        updateRefreshButton(true);

        try {
            const news = await window.NewsBoard.fetchAllNews(currentCategory);

            // 缓存数据
            const cacheKey = getCacheKey();
            const cacheData = {
                data: news,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));

            renderNews(news);
            renderCacheInfo(Date.now());
        } catch (error) {
            console.error('Failed to load news:', error);
            showError(error.message);
        } finally {
            isLoading = false;
            updateRefreshButton(false);
        }
    }

    /**
     * 强制刷新（忽略缓存）
     */
    function forceRefresh() {
        const cacheKey = getCacheKey();
        localStorage.removeItem(cacheKey);
        loadNews();
    }

    /**
     * 显示加载状态
     */
    function showLoading() {
        const grid = document.getElementById('news-grid');
        if (!grid) return;

        let skeletons = '';
        for (let i = 0; i < CONFIG.SKELETON_COUNT; i++) {
            skeletons += `
                <div class="news-skeleton">
                    <div class="skeleton-line tiny"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            `;
        }
        grid.innerHTML = skeletons;
    }

    /**
     * 更新刷新按钮状态
     */
    function updateRefreshButton(loading) {
        const btn = document.getElementById('news-refresh-btn');
        if (!btn) return;

        btn.disabled = loading;
        btn.classList.toggle('loading', loading);
        btn.innerHTML = loading
            ? '<i class="icon-spinner"></i>刷新中...'
            : '<i class="icon-refresh"></i>刷新';
    }

    /**
     * 渲染新闻列表
     */
    function renderNews(news) {
        const grid = document.getElementById('news-grid');
        if (!grid) return;

        if (!news || news.length === 0) {
            grid.innerHTML = `
                <div class="news-empty">
                    <i class="icon-inbox"></i>
                    <p>暂无新闻数据</p>
                </div>
            `;
            return;
        }

        const html = news.map(item => renderNewsCard(item)).join('');
        grid.innerHTML = html;
    }

    /**
     * 渲染单个新闻卡片
     */
    function renderNewsCard(item) {
        const timeAgo = formatTimeAgo(item.timestamp);
        const hotBadge = item.hot > 10
            ? `<span class="news-hot-badge"><i class="icon-fire"></i>${item.hot}</span>`
            : '';

        return `
            <article class="news-card" onclick="window.open('${escapeHtml(item.url)}', '_blank')" 
                     style="border-left-color: ${item.sourceColor || '#3498db'}">
                <div class="news-card-inner">
                    <div class="news-card-header">
                        <img src="${escapeHtml(item.sourceIcon)}" alt="" class="news-source-icon" 
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23ddd%22/></svg>'">
                        <span class="news-source-name">${escapeHtml(item.source)}</span>
                        ${hotBadge}
                    </div>
                    <h3 class="news-card-title">${escapeHtml(item.title)}</h3>
                    ${item.description ? `<p class="news-card-desc">${escapeHtml(item.description)}</p>` : ''}
                    <div class="news-card-footer">
                        <span class="news-time"><i class="icon-clock"></i>${timeAgo}</span>
                        <i class="icon-external-link news-link-icon"></i>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * 渲染缓存信息
     */
    function renderCacheInfo(timestamp) {
        const container = document.getElementById('news-cache-info');
        if (!container) return;

        const timeAgo = formatTimeAgo(timestamp);
        container.innerHTML = `
            <i class="icon-clock"></i>
            <span>数据更新于 ${timeAgo}，缓存30分钟</span>
        `;
    }

    /**
     * 显示错误状态
     */
    function showError(message) {
        const grid = document.getElementById('news-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="news-error">
                <i class="icon-warning"></i>
                <p>加载失败：${escapeHtml(message)}</p>
                <button class="news-retry-btn" onclick="window.NewsBoardUI.forceRefresh()">
                    <i class="icon-refresh"></i> 重试
                </button>
            </div>
        `;
    }

    /**
     * 格式化时间为"多久前"
     */
    function formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;

        const date = new Date(timestamp);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    }

    /**
     * HTML 转义
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // 导出 API
    window.NewsBoardUI = {
        init,
        loadNews,
        forceRefresh
    };

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
