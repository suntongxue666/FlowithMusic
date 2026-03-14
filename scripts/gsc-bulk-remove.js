#!/usr/bin/env node

/**
 * Google Search Console & Indexing API - 批量处理重复 URL 工具
 * 
 * 功能：
 * 1. 导出已索引的 URL 列表（通过 Search Analytics API）
 * 2. 分析重复/低质量 URL
 * 3. 通过 Indexing API 批量发送 URL_DELETED 通知
 * 4. 生成需要移除的 URL 列表
 * 
 * 使用前提：
 * 1. gsc-service-account.json 放在项目根目录
 * 2. Google Cloud 项目已启用：
 *    - Google Search Console API
 *    - Web Search Indexing API (Indexing API)
 * 3. GSC 中已将服务账号添加为网站用户
 * 
 * 使用方法：
 *   node scripts/gsc-bulk-remove.js --help
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const SITE_URL = 'sc-domain:flowithmusic.com';
const WEBSITE_URL = 'https://www.flowithmusic.com';
const KEY_FILE = path.resolve(__dirname, '..', 'gsc-service-account.json');

// 合法的页面路径（不应被移除的）
const VALID_PATHS = [
    '/',
    '/send',
    '/explore',
    '/history',
    '/love',
    '/friendship',
    '/family',
    '/terms',
    '/privacy',
    '/sitemap',
    '/sitemap.xml',
    '/robots.txt',
];

// 合法的动态路径前缀
const VALID_PATH_PREFIXES = [
    '/letter/',
    '/letters/',
];

// 应该被移除的路径模式
const REMOVE_PATTERNS = [
    /^\/debug/,
    /^\/test/,
    /^\/fix-/,
    /^\/clean-/,
    /^\/reset-/,
    /^\/migrate-/,
    /^\/check-/,
    /^\/simple-/,
    /^\/oauth-/,
    /^\/auth\//,
    /^\/admin/,
    /^\/api\//,
    /^\/_next\//,
];

// 速率限制
const INDEXING_API_DELAY_MS = 500; // Indexing API 每秒约 2 个请求

// ============ 辅助函数 ============

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function logProgress(current, total) {
    const pct = ((current / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2));
    process.stdout.write(`\r  [${bar}] ${pct}% (${current}/${total})`);
}

function isValidUrl(urlStr) {
    try {
        const url = new URL(urlStr);
        const pathname = url.pathname;

        // 精确匹配
        if (VALID_PATHS.includes(pathname) || VALID_PATHS.includes(pathname.replace(/\/$/, ''))) {
            return true;
        }

        // 前缀匹配
        for (const prefix of VALID_PATH_PREFIXES) {
            if (pathname.startsWith(prefix)) {
                return true;
            }
        }

        return false;
    } catch {
        return false;
    }
}

function shouldRemoveUrl(urlStr) {
    try {
        const url = new URL(urlStr);
        const pathname = url.pathname;

        for (const pattern of REMOVE_PATTERNS) {
            if (pattern.test(pathname)) {
                return true;
            }
        }

        // 不在合法路径中且不匹配合法前缀的 URL 也标记为可移除
        if (!isValidUrl(urlStr)) {
            return true;
        }

        return false;
    } catch {
        return true;
    }
}

// ============ 认证 ============

async function getAuthClient() {
    if (!fs.existsSync(KEY_FILE)) {
        console.error(`\n❌ 未找到密钥文件: ${KEY_FILE}`);
        console.error('请将 gsc-service-account.json 放到项目根目录\n');
        process.exit(1);
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: [
            'https://www.googleapis.com/auth/webmasters',
            'https://www.googleapis.com/auth/webmasters.readonly',
            'https://www.googleapis.com/auth/indexing',
        ],
    });

    return auth.getClient();
}

async function verifyConnection(authClient) {
    log('验证 API 连接...');

    const webmasters = google.webmasters({ version: 'v3', auth: authClient });

    try {
        const sites = await webmasters.sites.list();
        const siteList = sites.data.siteEntry || [];

        if (siteList.length === 0) {
            console.error('❌ 服务账号没有访问任何网站的权限');
            process.exit(1);
        }

        const targetSite = siteList.find(s => s.siteUrl === SITE_URL);
        if (!targetSite) {
            console.error(`❌ 未找到 ${SITE_URL}，可用的属性：`);
            siteList.forEach(s => console.log(`  - ${s.siteUrl}`));
            process.exit(1);
        }

        log(`✅ 已连接: ${SITE_URL} (${targetSite.permissionLevel})`);
        return true;
    } catch (err) {
        console.error(`❌ 连接失败: ${err.message}`);
        process.exit(1);
    }
}

// ============ 功能模块 ============

/**
 * 导出所有有搜索展示的 URL
 */
async function exportUrls(authClient) {
    log('正在导出已索引的 URL...\n');

    const webmasters = google.webmasters({ version: 'v3', auth: authClient });

    const allUrls = new Set();
    let startRow = 0;
    const rowLimit = 25000;

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    log(`查询范围: ${startDate} ~ ${endDate}`);

    try {
        while (true) {
            const response = await webmasters.searchanalytics.query({
                siteUrl: SITE_URL,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions: ['page'],
                    rowLimit,
                    startRow,
                },
            });

            const rows = response.data.rows || [];
            if (rows.length === 0) break;

            rows.forEach(row => allUrls.add(row.keys[0]));
            log(`已获取 ${allUrls.size} 条 URL...`);

            if (rows.length < rowLimit) break;
            startRow += rowLimit;
            await sleep(1000);
        }
    } catch (err) {
        console.error(`❌ 导出失败: ${err.message}`);
        return;
    }

    const urls = Array.from(allUrls).sort();

    // 分类统计
    const validUrls = [];
    const invalidUrls = [];

    urls.forEach(url => {
        if (isValidUrl(url)) {
            validUrls.push(url);
        } else {
            invalidUrls.push(url);
        }
    });

    // 保存完整列表
    const allFile = path.resolve(__dirname, '..', 'indexed-urls-all.txt');
    fs.writeFileSync(allFile, urls.join('\n'));

    // 保存需要移除的列表
    const removeFile = path.resolve(__dirname, '..', 'urls-to-remove.txt');
    fs.writeFileSync(removeFile, invalidUrls.join('\n'));

    // 保存合法的列表
    const validFile = path.resolve(__dirname, '..', 'urls-valid.txt');
    fs.writeFileSync(validFile, validUrls.join('\n'));

    console.log('\n========================================');
    console.log(`  总计 URL:        ${urls.length}`);
    console.log(`  ✅ 合法 URL:     ${validUrls.length}`);
    console.log(`  ❌ 需移除 URL:   ${invalidUrls.length}`);
    console.log('========================================\n');

    // 模式分析
    log('URL 路径模式分析：');
    const patterns = {};
    urls.forEach(url => {
        try {
            const u = new URL(url);
            const parts = u.pathname.split('/').filter(Boolean);
            const pattern = parts.length > 0 ? `/${parts[0]}/` : '/';
            if (!patterns[pattern]) patterns[pattern] = { total: 0, valid: 0, invalid: 0, urls: [] };
            patterns[pattern].total++;
            if (isValidUrl(url)) {
                patterns[pattern].valid++;
            } else {
                patterns[pattern].invalid++;
                if (patterns[pattern].urls.length < 3) patterns[pattern].urls.push(url);
            }
        } catch { }
    });

    Object.entries(patterns)
        .sort((a, b) => b[1].total - a[1].total)
        .forEach(([pattern, info]) => {
            const status = info.invalid > 0 ? '❌' : '✅';
            console.log(`  ${status} ${pattern.padEnd(25)} 共 ${info.total} 条 (合法 ${info.valid}, 需移除 ${info.invalid})`);
            if (info.urls.length > 0) {
                info.urls.forEach(u => console.log(`      例: ${u}`));
            }
        });

    console.log(`\n文件已保存：`);
    console.log(`  全部: ${allFile}`);
    console.log(`  需移除: ${removeFile}`);
    console.log(`  合法: ${validFile}`);
    console.log(`\n下一步: node scripts/gsc-bulk-remove.js --remove-file urls-to-remove.txt`);
}

/**
 * 通过 Indexing API 批量发送 URL_DELETED
 */
async function batchIndexingDelete(authClient, urls) {
    log(`准备通过 Indexing API 发送 ${urls.length} 个 URL_DELETED 通知...\n`);

    const indexing = google.indexing({ version: 'v3', auth: authClient });

    let success = 0;
    let fail = 0;
    const failures = [];

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        try {
            await indexing.urlNotifications.publish({
                requestBody: {
                    url: url,
                    type: 'URL_DELETED',
                },
            });
            success++;
        } catch (err) {
            fail++;
            failures.push({ url, error: err.message, status: err.response?.status });

            if (err.response?.status === 429) {
                log('\n⏳ 速率限制，等待 60 秒...');
                await sleep(60000);
                // 重试
                try {
                    await indexing.urlNotifications.publish({
                        requestBody: { url, type: 'URL_DELETED' },
                    });
                    fail--;
                    success++;
                    failures.pop();
                } catch (retryErr) {
                    // 重试也失败了
                }
            }
        }

        logProgress(i + 1, urls.length);

        if (i < urls.length - 1) {
            await sleep(INDEXING_API_DELAY_MS);
        }
    }

    console.log('\n\n========================================');
    console.log(`  ✅ 成功: ${success}`);
    console.log(`  ❌ 失败: ${fail}`);
    console.log('========================================\n');

    if (failures.length > 0) {
        const failFile = path.resolve(__dirname, '..', `removal-failures-${Date.now()}.txt`);
        fs.writeFileSync(failFile, failures.map(f => `${f.url}\t# ${f.status}: ${f.error}`).join('\n'));
        log(`失败列表已保存: ${failFile}`);

        // 显示失败原因统计
        const reasons = {};
        failures.forEach(f => {
            const key = `${f.status}: ${f.error.slice(0, 80)}`;
            reasons[key] = (reasons[key] || 0) + 1;
        });
        log('失败原因统计：');
        Object.entries(reasons).forEach(([reason, count]) => {
            console.log(`  ${count}x ${reason}`);
        });
    }
}

/**
 * 通过 URL Inspection API 检查 URL 索引状态
 */
async function inspectUrls(authClient, urls) {
    log(`检查 ${urls.length} 个 URL 的索引状态...\n`);

    const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

    const results = [];

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        try {
            const response = await searchconsole.urlInspection.index.inspect({
                requestBody: {
                    inspectionUrl: url,
                    siteUrl: SITE_URL,
                },
            });

            const result = response.data.inspectionResult;
            const indexStatus = result?.indexStatusResult?.coverageState || 'UNKNOWN';
            const crawled = result?.indexStatusResult?.lastCrawlTime || 'never';

            results.push({ url, indexStatus, crawled });

            const icon = indexStatus === 'Submitted and indexed' ? '🟢' :
                indexStatus === 'Crawled - currently not indexed' ? '🟡' : '🔴';
            console.log(`  ${icon} ${url}`);
            console.log(`     状态: ${indexStatus} | 上次抓取: ${crawled}`);
        } catch (err) {
            results.push({ url, indexStatus: 'ERROR', error: err.message });
            console.log(`  ❌ ${url} - ${err.message}`);
        }

        if (i < urls.length - 1) await sleep(1000);
    }

    // 统计
    const stats = {};
    results.forEach(r => {
        stats[r.indexStatus] = (stats[r.indexStatus] || 0) + 1;
    });

    console.log('\n索引状态统计：');
    Object.entries(stats).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
    });
}

/**
 * 生成所有应该被移除的 URL（基于项目源码中的实际路路由）
 */
function generateRemoveList() {
    log('正在通过扫描 src/app 目录自动识别待移除的无效路由...\n');

    const appDir = path.resolve(__dirname, '..', 'src', 'app');
    const items = fs.readdirSync(appDir);
    
    const invalidPaths = new Set();
    
    // 基础固定无效路径
    const baseInvalid = [
        '/api',
        '/auth',
        '/admin',
        '/410',
        '/migrate-data',
        '/oauth-config',
        '/check-interactions',
        '/clean-cache',
        '/clean-test-data'
    ];
    baseInvalid.forEach(p => invalidPaths.add(p));

    // 动态识别 debug*, test*, fix*, reset*, check*, simple*
    items.forEach(item => {
        if (fs.statSync(path.join(appDir, item)).isDirectory()) {
            const lower = item.toLowerCase();
            if (
                lower.startsWith('debug') || 
                lower.startsWith('test') || 
                lower.startsWith('fix-') || 
                lower.startsWith('clean-') || 
                lower.startsWith('reset-') || 
                lower.startsWith('migrate-') || 
                lower.startsWith('check-') || 
                lower.startsWith('simple-') ||
                lower === 'sitemap' // 特指目录版本的 sitemap
            ) {
                invalidPaths.add(`/${item}`);
            }
        }
    });

    const urls = Array.from(invalidPaths)
        .sort()
        .map(p => `${WEBSITE_URL}${p}`);

    const outputFile = path.resolve(__dirname, '..', 'urls-to-remove.txt');
    fs.writeFileSync(outputFile, urls.join('\n'));

    log(`✅ 总共识别出 ${urls.length} 个本地 junk 路由：`);
    urls.forEach(u => console.log(`  ❌ ${u}`));
    
    console.log(`\n已保存到: ${outputFile}`);
    console.log('您现在可以运行导出分析，看看 GSC 中实际索引了哪些奇怪的 URL：');
    console.log(`  node scripts/gsc-bulk-remove.js --export`);
}

// ============ 主程序 ============

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.length === 0) {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║    FlowithMusic - Google 重复 URL 批量处理工具                    ║
╚══════════════════════════════════════════════════════════════════╝

📋 使用步骤:
  1. 先导出分析   →  --export
  2. 或直接生成   →  --generate (根据项目路由自动生成移除列表)
  3. 检查索引状态 →  --inspect urls-to-remove.txt (可选，验证)
  4. 执行移除     →  --remove-file urls-to-remove.txt

📌 选项:
  --help                        显示帮助
  --export                      导出 GSC 中有展示的 URL 并分析
  --generate                    根据项目路由自动生成待移除列表
  --inspect <file>              检查文件中 URL 的索引状态
  --remove-file <file>          从文件读取 URL，通过 Indexing API 批量通知删除
  --remove-url <url>            通知单个 URL 已删除
  --dry-run                     搭配 --remove-file 使用，仅预览不执行

📝 示例:
  node scripts/gsc-bulk-remove.js --export
  node scripts/gsc-bulk-remove.js --generate
  node scripts/gsc-bulk-remove.js --remove-file urls-to-remove.txt --dry-run
  node scripts/gsc-bulk-remove.js --remove-file urls-to-remove.txt
  node scripts/gsc-bulk-remove.js --remove-url "https://www.flowithmusic.com/debug-auth"
`);
        return;
    }

    const authClient = await getAuthClient();
    await verifyConnection(authClient);

    // --export
    if (args.includes('--export')) {
        await exportUrls(authClient);
        return;
    }

    // --generate
    if (args.includes('--generate')) {
        generateRemoveList();
        return;
    }

    // --inspect
    const inspectIdx = args.indexOf('--inspect');
    if (inspectIdx !== -1 && args[inspectIdx + 1]) {
        const filePath = path.resolve(args[inspectIdx + 1]);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ 文件不存在: ${filePath}`);
            process.exit(1);
        }
        const urls = fs.readFileSync(filePath, 'utf-8')
            .split('\n').map(l => l.trim()).filter(l => l && l.startsWith('http'));

        // 只检查前 20 个，API 有配额限制
        const checkUrls = urls.slice(0, 20);
        if (urls.length > 20) {
            log(`文件有 ${urls.length} 个 URL，仅检查前 20 个（API 配额限制）`);
        }
        await inspectUrls(authClient, checkUrls);
        return;
    }

    // --remove-file
    const removeFileIdx = args.indexOf('--remove-file');
    if (removeFileIdx !== -1 && args[removeFileIdx + 1]) {
        const filePath = path.resolve(args[removeFileIdx + 1]);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ 文件不存在: ${filePath}`);
            process.exit(1);
        }
        const urls = fs.readFileSync(filePath, 'utf-8')
            .split('\n').map(l => l.trim()).filter(l => l && l.startsWith('http'));

        if (urls.length === 0) {
            log('文件中没有 URL');
            return;
        }

        if (args.includes('--dry-run')) {
            log(`🧪 预览模式 - 以下 ${urls.length} 个 URL 将被通知删除：`);
            urls.forEach(u => console.log(`  ❌ ${u}`));
            console.log(`\n去掉 --dry-run 后执行实际操作`);
            return;
        }

        console.log(`\n⚠️  即将通过 Indexing API 发送 ${urls.length} 个 URL_DELETED 通知`);
        console.log('这会告诉 Google 这些 URL 已不存在');
        console.log(`预计耗时: ${Math.ceil(urls.length * INDEXING_API_DELAY_MS / 60000)} 分钟`);
        console.log('5 秒后开始... (Ctrl+C 取消)\n');
        await sleep(5000);

        await batchIndexingDelete(authClient, urls);
        return;
    }

    // --remove-url
    const removeUrlIdx = args.indexOf('--remove-url');
    if (removeUrlIdx !== -1 && args[removeUrlIdx + 1]) {
        const url = args[removeUrlIdx + 1];
        const indexing = google.indexing({ version: 'v3', auth: authClient });

        try {
            await indexing.urlNotifications.publish({
                requestBody: { url, type: 'URL_DELETED' },
            });
            log(`✅ 已通知 Google 该 URL 已删除: ${url}`);
        } catch (err) {
            console.error(`❌ 失败: ${err.message}`);
        }
        return;
    }

    console.error('未识别的命令，使用 --help 查看帮助');
}

main().catch(err => {
    console.error(`❌ ${err.message}`);
    process.exit(1);
});
