// ============================================================
//  ملف: utils.js (كامل - الدوال المساعدة الأساسية)
//  الوظيفة: دوال مساعدة مشتركة لجميع أجزاء الموقع
// ============================================================

// ---------- 1. الإعدادات الافتراضية ----------
const DEFAULT_SETTINGS = {
  siteName: 'ALSHANFRICC',
  subtitle: 'موسوعة التاريخ الشاملة',
  primaryColor: '#8b5e3c',
  titleFont: 'Cinzel',
  bodyFont: 'Amiri',
  darkMode: false,
  footerText: 'جميع الحقوق محفوظة',
  facebookUrl: '#',
  twitterUrl: '#',
  instagramUrl: '#',
  bodyBackground: '#fdf6ec',
  openai_api_key: '',
  headerBgImage: '',
  backgroundImages: [],
  backgroundInterval: 60
};

// ---------- 2. التخزين المؤقت للإعدادات ----------
const SETTINGS_CACHE_KEY = 'alshanfricc_settings_cache';
const SETTINGS_CACHE_TIME = 30 * 60 * 1000; // 30 دقيقة

function getCachedSettingsFromLocal() {
    try {
        const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.timestamp < SETTINGS_CACHE_TIME) return data.settings;
    } catch (e) {}
    return null;
}

function saveCachedSettingsToLocal(settings) {
    try {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ settings, timestamp: Date.now() }));
    } catch (e) {}
}

async function getAllSettingsCached() {
    const local = getCachedSettingsFromLocal();
    if (local) {
        setTimeout(() => refreshSettingsFromServer(), 100);
        return local;
    }
    try {
        const doc = await Promise.race([
            db.collection('settings').doc('site').get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        const settings = doc.exists ? { ...DEFAULT_SETTINGS, ...doc.data() } : { ...DEFAULT_SETTINGS };
        saveCachedSettingsToLocal(settings);
        return settings;
    } catch (error) {
        console.warn('تعذر جلب الإعدادات، استخدام الافتراضي');
        return { ...DEFAULT_SETTINGS };
    }
}

async function getSetting(key, defaultValue = '') {
    const settings = await getAllSettingsCached();
    return settings[key] !== undefined ? settings[key] : defaultValue;
}

async function updateSetting(key, value) {
    try {
        await db.collection('settings').doc('site').set({ [key]: value }, { merge: true });
        saveCachedSettingsToLocal(null);
        console.log(`✅ تم تحديث الإعداد: ${key}`);
    } catch (error) { console.error(`خطأ في تحديث الإعداد (${key}):`, error); }
}

let refreshPromise = null;
function refreshSettingsFromServer() {
    if (refreshPromise) return;
    refreshPromise = db.collection('settings').doc('site').get()
        .then(doc => {
            const settings = doc.exists ? { ...DEFAULT_SETTINGS, ...doc.data() } : { ...DEFAULT_SETTINGS };
            saveCachedSettingsToLocal(settings);
            refreshPromise = null;
        })
        .catch(() => { refreshPromise = null; });
}

// ---------- 3. دوال الوقت والتاريخ ----------
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 0) return 'الآن';
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `قبل ${days} يوم`;
    const months = Math.floor(days / 30);
    if (months < 12) return `قبل ${months} شهر`;
    return `قبل ${Math.floor(days / 365)} سنة`;
}

function formatDateArabic(date) {
    return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ---------- 4. دوال النصوص والمحتوى ----------
function truncateText(text, maxLength = 200) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
}

function getFirstImage(contentArray) {
    if (!Array.isArray(contentArray)) return null;
    for (let item of contentArray) {
        if (item.type === 'image' && item.value) return item.value;
        if (item.type === 'images' && item.images && item.images.length > 0) {
            const first = item.images[0];
            return first.dataUrl || first.url || first;
        }
    }
    return null;
}

function getTextOnly(contentArray) {
    if (!Array.isArray(contentArray)) return '';
    return contentArray
        .filter(el => ['text', 'subtitle', 'markdown', 'html', 'quote', 'summary'].includes(el.type))
        .map(el => el.value || '')
        .join(' ')
        .substring(0, 300);
}

function escapeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------- 5. دوال عامة ----------
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- 6. تحويل Markdown ----------
function parseMarkdown(text) {
    if (!text) return '';
    let html = text;
    html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>)+)/g, '<ul>$1</ul>');
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

// ---------- 7. تطبيق خط ديناميكي ----------
function applyFont(fontFamily, target = 'body') {
    if (target === 'body') {
        document.body.style.fontFamily = fontFamily + ', sans-serif';
    } else if (target === 'title') {
        const titles = document.querySelectorAll('.site-title, .post-title, .logo');
        titles.forEach(el => el.style.fontFamily = fontFamily + ', serif');
    }
    const link = document.getElementById('dynamic-font-link');
    if (link) {
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
    }
}

// ---------- 8. نظام Toast ----------
function showToast(message, type = 'success', duration = 3000) {
    const existing = document.querySelector('.toast-container');
    if (existing) existing.remove();

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const container = document.createElement('div');
    container.className = 'toast-container';
    container.innerHTML = `
        <div class="toast toast-${type}">
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.closest('.toast-container').remove()">✕</button>
        </div>`;
    document.body.appendChild(container);
    setTimeout(() => container.classList.add('show'), 10);
    const timer = setTimeout(() => {
        container.classList.remove('show');
        setTimeout(() => container.remove(), 400);
    }, duration);
    container.querySelector('.toast').addEventListener('click', () => {
        clearTimeout(timer);
        container.classList.remove('show');
        setTimeout(() => container.remove(), 400);
    });
}

// ---------- 9. تأكيد التحميل ----------
console.log("✅ ملف utils.js تم تحميله بنجاح"); 
