// ============================================================
//  core/database-manager.js
//  الوظيفة: مدير قواعد البيانات Supabase المتعددة - لا تعدله
//  يعتمد على: config/databases.js
// ============================================================

const DATABASE_MANAGER = {
  databases: [],

  init() {
    this.databases = DATABASES_CONFIG.map(db => ({
      ...db,
      currentPosts: parseInt(localStorage.getItem(`db_${db.id}_posts`) || '0')
    }));
    console.log(`✅ مدير قواعد البيانات جاهز: ${this.databases.length} قواعد`);
  },

  getForCategory(categoryName) {
    return this.databases.find(db =>
      db.categories.some(cat =>
        categoryName.includes(cat) || cat.includes(categoryName)
      )
    ) || this.databases[this.databases.length - 1];
  },

  getStats() {
    return this.databases.map(db => ({
      id: db.id,
      name: db.name,
      categories: db.categories,
      currentPosts: db.currentPosts,
      maxPosts: 125000,
      usagePercent: ((db.currentPosts / 125000) * 100).toFixed(1)
    }));
  },

  incrementCount(dbId) {
    const db = this.databases.find(d => d.id === dbId);
    if (db) {
      db.currentPosts++;
      localStorage.setItem(`db_${dbId}_posts`, db.currentPosts);
    }
  },

  async fetchFromAll(table, query = '') {
    const results = [];
    for (const db of this.databases) {
      try {
        const res = await fetch(`${db.url}/rest/v1/${table}${query}`, {
          headers: { 'apikey': db.key, 'Authorization': `Bearer ${db.key}` }
        });
        if (res.ok) {
          const data = await res.json();
          results.push(...data);
        }
      } catch (e) {
        console.warn(`فشل الاتصال بـ ${db.name}`);
      }
    }
    return results;
  },

  async insertInto(dbId, table, data) {
    const db = this.databases.find(d => d.id === dbId);
    if (!db) return null;
    try {
      const res = await fetch(`${db.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': db.key,
          'Authorization': `Bearer ${db.key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        this.incrementCount(dbId);
        return await res.json();
      }
    } catch (e) {
      console.error(`فشل الإدخال في ${db.name}`);
    }
    return null;
  },

  async updateRecord(dbId, table, id, data) {
    const db = this.databases.find(d => d.id === dbId);
    if (!db) return false;
    try {
      const res = await fetch(`${db.url}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': db.key,
          'Authorization': `Bearer ${db.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (e) {
      console.error(`فشل التحديث في ${db.name}`);
      return false;
    }
  },

  async deleteRecord(dbId, table, id) {
    const db = this.databases.find(d => d.id === dbId);
    if (!db) return false;
    try {
      const res = await fetch(`${db.url}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': db.key,
          'Authorization': `Bearer ${db.key}`
        }
      });
      return res.ok;
    } catch (e) {
      console.error(`فشل الحذف في ${db.name}`);
      return false;
    }
  }
};

DATABASE_MANAGER.init();
