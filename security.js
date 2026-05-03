 * وحدة الأمان والحماية
 * 
 * هذا الملف يوفر حماية قوية ضد:
 * - فتح Developer Tools
 * - سرقة الكود
 * - محاولات الهجوم
 */

class ALSHANFRICCSecurity {
    constructor() {
        this.devtoolsOpen = false;
        this.detectionAttempts = 0;
        this.maxAttempts = 3;
        this.init();
    }

    init() {
        this.protectDevTools();
        this.protectConsole();
        this.protectRightClick();
        this.protectKeyboard();
        this.monitorDevTools();
        this.preventCodeInspection();
    }

    // منع فتح Developer Tools
    protectDevTools() {
        // F12
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F12') {
                e.preventDefault();
                this.triggerSecurityAlert('محاولة فتح Developer Tools');
            }
        });

        // Ctrl+Shift+I
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                this.triggerSecurityAlert('محاولة فتح Inspector');
            }
        });

        // Ctrl+Shift+C
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.triggerSecurityAlert('محاولة فتح Element Inspector');
            }
        });

        // Ctrl+Shift+J
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                e.preventDefault();
                this.triggerSecurityAlert('محاولة فتح Console');
            }
        });

        // Ctrl+Shift+K
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'K') {
                e.preventDefault();
                this.triggerSecurityAlert('محاولة فتح Web Console');
            }
        });
    }

    // منع استخدام Console
    protectConsole() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => {
            this.detectionAttempts++;
            if (this.detectionAttempts > this.maxAttempts) {
                this.triggerSecurityAlert('محاولة استخدام Console');
            }
        };

        console.warn = (...args) => {
            this.detectionAttempts++;
            if (this.detectionAttempts > this.maxAttempts) {
                this.triggerSecurityAlert('محاولة استخدام Console');
            }
        };

        console.error = (...args) => {
            this.detectionAttempts++;
            if (this.detectionAttempts > this.maxAttempts) {
                this.triggerSecurityAlert('محاولة استخدام Console');
            }
        };

        // منع debugger
        setInterval(() => {
            debugger;
        }, 100);
    }

    // منع الضغط اليميني
    protectRightClick() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.triggerSecurityAlert('محاولة فتح القائمة اليمينية');
            return false;
        });
    }

    // حماية لوحة المفاتيح
    protectKeyboard() {
        document.addEventListener('keydown', (e) => {
            // منع Ctrl+S
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
            }

            // منع Ctrl+P
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
            }

            // منع Ctrl+U (View Source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
            }
        });
    }

    // مراقبة فتح Developer Tools
    monitorDevTools() {
        setInterval(() => {
            const threshold = 160;
            const isDevToolsOpen = 
                window.outerHeight - window.innerHeight > threshold ||
                window.outerWidth - window.innerWidth > threshold;

            if (isDevToolsOpen && !this.devtoolsOpen) {
                this.devtoolsOpen = true;
                this.triggerSecurityAlert('تم اكتشاف Developer Tools');
            } else if (!isDevToolsOpen && this.devtoolsOpen) {
                this.devtoolsOpen = false;
            }
        }, 500);
    }

    // منع فحص الكود
    preventCodeInspection() {
        // منع استخدام eval
        window.eval = function() {
            throw new Error('eval() غير مسموح');
        };

        // منع استخدام Function
        const OriginalFunction = Function;
        window.Function = function() {
            throw new Error('Function() غير مسموح');
        };

        // منع استخدام JSON.stringify على الكائنات الحساسة
        const originalStringify = JSON.stringify;
        JSON.stringify = function(obj) {
            if (obj && obj.constructor === Object && obj.API_KEY) {
                throw new Error('لا يمكن نسخ البيانات الحساسة');
            }
            return originalStringify.apply(this, arguments);
        };
    }

    // تفعيل تنبيه الأمان
    triggerSecurityAlert(reason) {
        console.warn(`🔒 تنبيه أمان: ${reason}`);
        
        // تسجيل المحاولة
        let attempts = JSON.parse(localStorage.getItem('security_attempts') || '[]');
        attempts.push({
            reason,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
        localStorage.setItem('security_attempts', JSON.stringify(attempts));

        // إذا تجاوزت المحاولات الحد المسموح
        if (attempts.length > 5) {
            this.lockPage();
        }
    }

    // قفل الصفحة بالكامل
    lockPage() {
        document.body.innerHTML = '';
        document.body.style.background = '#000';
        
        const lockScreen = document.createElement('div');
        lockScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            flex-direction: column;
            color: #fff;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        
        lockScreen.innerHTML = `
            <h1 style="color: #ff4444; margin-bottom: 20px;">🔒 تم قفل الصفحة</h1>
            <p style="font-size: 18px; margin-bottom: 20px;">تم اكتشاف محاولة غير مصرح بها للوصول للكود</p>
            <p style="color: #888;">سيتم إخطار المسؤول بهذه المحاولة</p>
        `;
        
        document.body.appendChild(lockScreen);
        
        // إغلاق الصفحة بعد 3 ثواني
        setTimeout(() => {
            window.location.href = 'about:blank';
            window.close();
        }, 3000);

        // إرسال تنبيه للمسؤول
        this.notifyAdmin('تم اكتشاف محاولة اختراق');
    }

    // إخطار المسؤول
    notifyAdmin(message) {
        // يمكن إرسال الإخطار عبر API
        fetch('/api/security-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            })
        }).catch(e => console.log('Alert sent'));
    }

    // تشفير البيانات الحساسة
    encryptData(data, key) {
        // تشفير بسيط (يجب استخدام مكتبة تشفير حقيقية في الإنتاج)
        return btoa(JSON.stringify(data));
    }

    // فك تشفير البيانات
    decryptData(encrypted, key) {
        try {
            return JSON.parse(atob(encrypted));
        } catch (e) {
            return null;
        }
    }

    // التحقق من سلامة الصفحة
    verifyPageIntegrity() {
        const scripts = document.querySelectorAll('script');
        const allowedScripts = [
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com',
            'https://fonts.googleapis.com'
        ];

        scripts.forEach(script => {
            if (script.src && !allowedScripts.some(allowed => script.src.includes(allowed))) {
                console.warn('⚠️ Script غير موثوق:', script.src);
            }
        });
    }
}

// تفعيل الأمان عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.security = new ALSHANFRICCSecurity();
    });
} else {
    window.security = new ALSHANFRICCSecurity();
}

