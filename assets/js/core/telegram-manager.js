// ============================================================
//  core/telegram-manager.js
//  الوظيفة: إدارة بوتات تيليجرام لتخزين الملفات (قنوات خاصة)
//  يعتمد على: config/bots.js
// ============================================================

const TELEGRAM_MANAGER = {
  bots: [],
  currentIndex: 0,

  init() {
    this.bots = BOTS_CONFIG;
    console.log(`✅ مدير تيليجرام جاهز: ${this.bots.length} بوتات`);
  },

  async uploadPhoto(dataUrl) {
    const bot = this.bots[this.currentIndex % this.bots.length];
    this.currentIndex++;

    const res = await fetch(dataUrl);
    const blob = await res.blob();

    const formData = new FormData();
    formData.append('chat_id', bot.channelId);
    formData.append('photo', blob, 'image.jpg');

    try {
      const response = await fetch(`https://api.telegram.org/bot${bot.token}/sendPhoto`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.description);

      const fileId = result.result.photo[result.result.photo.length - 1].file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${bot.token}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      if (!fileData.ok) throw new Error(fileData.description);

      const filePath = fileData.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${bot.token}/${filePath}`;
      console.log(`✅ تم رفع الصورة عبر ${bot.name}: ${downloadUrl}`);
      return downloadUrl;
    } catch (error) {
      console.error(`❌ فشل الرفع عبر ${bot.name}:`, error);
      throw error;
    }
  },

  async uploadFile(dataUrl, fileName = 'file.pdf') {
    const bot = this.bots[this.currentIndex % this.bots.length];
    this.currentIndex++;

    const res = await fetch(dataUrl);
    const blob = await res.blob();

    const formData = new FormData();
    formData.append('chat_id', bot.channelId);
    formData.append('document', blob, fileName);

    try {
      const response = await fetch(`https://api.telegram.org/bot${bot.token}/sendDocument`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.description);

      const fileId = result.result.document.file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${bot.token}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      if (!fileData.ok) throw new Error(fileData.description);

      const filePath = fileData.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${bot.token}/${filePath}`;
      console.log(`✅ تم رفع الملف عبر ${bot.name}: ${downloadUrl}`);
      return downloadUrl;
    } catch (error) {
      console.error(`❌ فشل رفع الملف عبر ${bot.name}:`, error);
      throw error;
    }
  }
};

TELEGRAM_MANAGER.init();
