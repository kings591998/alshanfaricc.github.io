* ⚠️ تحذير: هذا الملف يحتوي على بيانات حساسة
 * لا تشاركه مع أحد ولا تنشره على الإنترنت
 */

const CONFIG = {
    // OpenAI Configuration
    OPENAI: {
        API_KEY: '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',
        MODEL: 'gpt-3.5-turbo',
        MAX_TOKENS: 2000
    },

    // Telegram Configuration
    TELEGRAM: {
        BOT_TOKEN: '8514269501:AAEOBb7QzOmO8ALKTCox9uYxX8onf8QUan0',
        CHAT_ID: '8514269501',
        API_URL: 'https://api.telegram.org/bot'
    },

    // Microsoft Azure Configuration (Alternative)
    AZURE: {
        API_KEY: 'sk-fjSMCsPEBpUmGNn4QUXNNxK4VA7PnGBUlFCWBOyFsj8PdWwL',
        ENDPOINT: 'https://api.openai.azure.com/',
        DEPLOYMENT_ID: 'gpt-35-turbo'
    },

    // Site Configuration
    SITE: {
        NAME: 'ALSHANFRICC',
        TAGLINE: 'محرك الفكر الذهبي',
        LANGUAGE: 'ar',
        DIRECTION: 'rtl',
        THEME: 'dark'
    },

    // Security Settings
    SECURITY: {
        ENABLE_DEV_TOOLS_PROTECTION: true,
        ENABLE_CONSOLE_PROTECTION: true,
        ENABLE_RIGHT_CLICK_PROTECTION: true,
        ENABLE_CODE_OBFUSCATION: true,
        SESSION_TIMEOUT: 30 // minutes
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
