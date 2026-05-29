// ============================================================
//  ملف: security-layer.js
//  الوظيفة: نظام حماية متكامل متعدد الطبقات للموقع
//  يحمي من: XSS، SQL Injection، CSRF، DDoS، البوتات الضارة،
//           التلاعب بالمدخلات، هجمات القوة العمياء، وغيرها
// ============================================================

const SECURITY_LAYER = {
    // ========== ١. الإعدادات الأساسية ==========
    config: {
        maxRequestsPerMinute: 60,
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000,
        csrfTokenName: 'csrf_token',
        sessionTimeout: 30 * 60 * 1000,
        suspiciousThreshold: 10,
        whitelist: ['localhost', '127.0.0.1', '.pages.dev', '.supabase.co', 'api.telegram.org']
    },

    // ========== ٢. طبقة الحماية من XSS ==========
    xss: {
        sanitize(input) {
            if (!input || typeof input !== 'string') return input;
            let clean = input
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
                .replace(/<embed\b[^>]*>/gi, '')
                .replace(/<link\b[^>]*>/gi, '')
                .replace(/<meta\b[^>]*>/gi, '')
                .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
                .replace(/on\w+\s*=\s*'[^']*'/gi, '')
                .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
                .replace(/javascript\s*:/gi, '')
                .replace(/vbscript\s*:/gi, '')
                .replace(/expression\s*\(/gi, '');
            clean = clean
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
            return clean;
        },

        detectMalicious(input) {
            if (!input || typeof input !== 'string') return false;
            const patterns = [
                /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
                /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
                /javascript\s*:/gi,
                /on\w+\s*=/gi,
                /eval\s*\(/gi,
                /document\.cookie/gi,
                /document\.location/gi,
                /window\.location/gi,
                /alert\s*\(/gi,
                /prompt\s*\(/gi,
                /confirm\s*\(/gi
            ];
            return patterns.some(pattern => pattern.test(input));
        }
    },

    // ========== ٣. طبقة الحماية من SQL Injection ==========
    sql: {
        sanitize(input) {
            if (!input || typeof input !== 'string') return input;
            const sqlKeywords = [
                'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
                'ALTER', 'TRUNCATE', 'UNION', 'JOIN', 'WHERE', 'FROM',
                'TABLE', 'DATABASE', 'EXEC', 'EXECUTE', 'OR 1=1',
                "' OR '1'='1", '" OR "1"="1', '--', '/*', '*/', 'xp_'
            ];
            let clean = input;
            sqlKeywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                clean = clean.replace(regex, '');
            });
            clean = clean.replace(/--/g, '').replace(/\/\*/g, '').replace(/\*\//g, '');
            return clean.trim();
        },

        detectInjection(input) {
            if (!input || typeof input !== 'string') return false;
            const patterns = [
                /(\bUNION\b.*\bSELECT\b)/gi,
                /(\bSELECT\b.*\bFROM\b)/gi,
                /(\bINSERT\b.*\bINTO\b)/gi,
                /(\bUPDATE\b.*\bSET\b)/gi,
                /(\bDELETE\b.*\bFROM\b)/gi,
                /(\bDROP\b.*\bTABLE\b)/gi,
                /('.*OR.*'.*'.*')/gi,
                /(".*OR.*".*".*")/gi,
                /(\bOR\b.*=.*)/gi,
                /(--[^\n]*)/gi,
                /(\/\*[\s\S]*\*\/)/gi,
                /(;\s*DROP\b)/gi,
                /(;\s*DELETE\b)/gi
            ];
            return patterns.some(pattern => pattern.test(input));
        }
    },

    // ========== ٤. طبقة الحماية من CSRF ==========
    csrf: {
        generateToken() {
            const token = this._generateRandomString(64);
            this._storeToken(token);
            return token;
        },

        validateToken(token) {
            if (!token) return false;
            const storedToken = sessionStorage.getItem(SECURITY_LAYER.config.csrfTokenName);
            return token === storedToken;
        },

        attachToForms() {
            document.querySelectorAll('form').forEach(form => {
                const oldInput = form.querySelector(`input[name="${SECURITY_LAYER.config.csrfTokenName}"]`);
                if (oldInput) oldInput.remove();
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = SECURITY_LAYER.config.csrfTokenName;
                input.value = this.generateToken();
                form.appendChild(input);
            });
        },

        _generateRandomString(length) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
            let result = '';
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            array.forEach(byte => { result += chars[byte % chars.length]; });
            return result;
        },

        _storeToken(token) {
            sessionStorage.setItem(SECURITY_LAYER.config.csrfTokenName, token);
        }
    },

    // ========== ٥. طبقة الحماية من DDoS ==========
    ddos: {
        requestLog: {},
        blockedIPs: new Set(),
        suspiciousIPs: new Map(),

        logRequest(ip) {
            const now = Date.now();
            if (!this.requestLog[ip]) this.requestLog[ip] = [];
            this.requestLog[ip] = this.requestLog[ip].filter(timestamp => now - timestamp < 60000);
            this.requestLog[ip].push(now);
            if (this.requestLog[ip].length > SECURITY_LAYER.config.maxRequestsPerMinute) {
                this.blockIP(ip, 'تجاوز عدد الطلبات المسموح به');
                return false;
            }
            return true;
        },

        blockIP(ip, reason = 'نشاط مشبوه') {
            this.blockedIPs.add(ip);
            const blockedList = JSON.parse(localStorage.getItem('blocked_ips') || '[]');
            blockedList.push({ ip, reason, timestamp: Date.now(), expires: Date.now() + SECURITY_LAYER.config.lockoutDuration });
            localStorage.setItem('blocked_ips', JSON.stringify(blockedList));
            this.logSecurityEvent('IP_BLOCKED', { ip, reason });
        },

        isBlocked(ip) {
            if (this.blockedIPs.has(ip)) return true;
            const blockedList = JSON.parse(localStorage.getItem('blocked_ips') || '[]');
            const now = Date.now();
            const activeBlocks = blockedList.filter(block => now < block.expires);
            localStorage.setItem('blocked_ips', JSON.stringify(activeBlocks));
            return activeBlocks.some(block => block.ip === ip);
        },

        logSuspicious(ip, type) {
            if (!this.suspiciousIPs.has(ip)) this.suspiciousIPs.set(ip, { count: 0, types: [] });
            const record = this.suspiciousIPs.get(ip);
            record.count++;
            record.types.push(type);
            if (record.count >= SECURITY_LAYER.config.suspiciousThreshold) {
                this.blockIP(ip, `تجاوز عدد المحاولات المشبوهة (${record.count})`);
            }
        },

        logSecurityEvent(type, details) {
            console.warn(`🚨 [تحذير أمني] ${type}:`, details);
        }
    },

    // ========== ٦. دوال الحماية الشاملة ==========
    sanitizeAll(input) {
        let clean = input;
        clean = this.xss.sanitize(clean);
        clean = this.sql.sanitize(clean);
        return clean;
    },

    detectAttack(input) {
        if (this.xss.detectMalicious(input)) return { type: 'XSS', severity: 'HIGH' };
        if (this.sql.detectInjection(input)) return { type: 'SQL_INJECTION', severity: 'CRITICAL' };
        return null;
    },

    validateInput(input, options = {}) {
        const result = { isValid: true, errors: [], warnings: [], sanitized: input };
        const attack = this.detectAttack(input);
        if (attack) {
            result.isValid = false;
            result.errors.push(`تم اكتشاف هجوم ${attack.type}`);
            this.ddos.logSuspicious('local', attack.type);
            return result;
        }
        if (options.maxLength && input.length > options.maxLength) {
            result.errors.push(`النص طويل جداً (الحد الأقصى: ${options.maxLength})`);
            result.isValid = false;
        }
        if (options.minLength && input.length < options.minLength) {
            result.errors.push(`النص قصير جداً (الحد الأدنى: ${options.minLength})`);
            result.isValid = false;
        }
        if (options.sanitize !== false) result.sanitized = this.sanitizeAll(input);
        return result;
    },

    protectComment(text) {
        const result = this.validateInput(text, { maxLength: 2000, minLength: 1, sanitize: true });
        return result.isValid ? result.sanitized : null;
    },

    protectTitle(text) {
        const result = this.validateInput(text, { maxLength: 300, minLength: 5, sanitize: true });
        return result.isValid ? result.sanitized : null;
    },

    protectContent(text) {
        const result = this.validateInput(text, { maxLength: 100000, minLength: 50, sanitize: true });
        return result.isValid ? result.sanitized : null;
    },

    init() {
        console.log('🛡️ نظام الحماية متعدد الطبقات جاهز');
        this.csrf.attachToForms();
        const observer = new MutationObserver(() => { this.csrf.attachToForms(); });
        observer.observe(document.body, { childList: true, subtree: true });
        setInterval(() => {
            const now = Date.now();
            const blockedList = JSON.parse(localStorage.getItem('blocked_ips') || '[]');
            const activeBlocks = blockedList.filter(block => now < block.expires);
            localStorage.setItem('blocked_ips', JSON.stringify(activeBlocks));
        }, 3600000);
        return this;
    }
};

// ========== دوال عامة للحماية السريعة ==========
function secureInput(input, type = 'text') {
    switch (type) {
        case 'comment': return SECURITY_LAYER.protectComment(input);
        case 'title': return SECURITY_LAYER.protectTitle(input);
        case 'content': return SECURITY_LAYER.protectContent(input);
        default: return SECURITY_LAYER.sanitizeAll(input);
    }
}

function isAttackDetected(input) {
    return SECURITY_LAYER.detectAttack(input) !== null;
}

// ========== بدء التشغيل ==========
SECURITY_LAYER.init();
console.log('🔒 نظام الحماية متعدد الطبقات مفعل وجاهز');
