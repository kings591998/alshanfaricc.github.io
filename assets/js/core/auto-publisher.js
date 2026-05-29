// ============================================================
//  core/auto-publisher.js
//  الوظيفة: نظام النشر التلقائي بمراحل الجودة الخمس
//  يعتمد على: firebase-config.js, utils.js, ai-models.js
// ============================================================

const AUTO_PUBLISHER = {
    timers: [],
    stats: {
        totalPublished: 0,
        errors: 0,
        startTime: null,
        lastActivity: null
    },

    // ---------- بدء النشر ----------
    start() {
        if (this.timers.length > 0) {
            console.warn('النشر التلقائي يعمل بالفعل');
            return;
        }

        this.stats.startTime = new Date();
        this.stats.lastActivity = new Date();
        this.loadStats();

        const enabledModels = AI_MODELS_CONFIG.filter(m => m.enabled);

        enabledModels.forEach((model, index) => {
            // تشغيل أول مقال بعد 5 ثوانٍ، ثم كل intervalMinutes
            setTimeout(() => this._publishForModel(model), 5000 + index * 2000);

            const timer = setInterval(() => {
                this._publishForModel(model);
            }, model.intervalMinutes * 60 * 1000);

            this.timers.push({ model: model.name, timer, interval: model.intervalMinutes });
        });

        console.log(`🚀 بدء النشر التلقائي: ${enabledModels.length} نماذج`);
        this._updateBadge();
    },

    // ---------- إيقاف النشر ----------
    stop() {
        this.timers.forEach(t => {
            clearInterval(t.timer);
        });
        this.timers = [];
        console.log('⏸️ تم إيقاف النشر التلقائي');
        this._updateBadge();
    },

    // ---------- حالة التشغيل ----------
    isRunning() {
        return this.timers.length > 0;
    },

    // ---------- إحصائيات ----------
    getStats() {
        return {
            ...this.stats,
            running: this.isRunning(),
            activeModels: this.timers.map(t => t.model),
            uptime: this.stats.startTime ? Math.floor((Date.now() - this.stats.startTime) / 1000 / 60) + ' دقيقة' : '0'
        };
    },

    // ---------- دورة النشر الكاملة لنموذج ----------
    async _publishForModel(model) {
        const MAX_RETRIES = 2;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`📝 [${model.name}] بدء دورة الجودة (محاولة ${attempt})...`);

                // ----- المرحلة 1: اقتراح العناوين والمصادر -----
                const researchResult = await this._callAI(model, model.instructions.stage1_research, 800);
                const suggestions = this._parseStage1Result(researchResult);
                if (!suggestions.length) throw new Error('فشل اقتراح عناوين');

                const chosen = suggestions[Math.floor(Math.random() * suggestions.length)];
                const title = chosen.title;
                const sources = chosen.sources || [];

                // ----- المرحلة 2: بناء الهيكل -----
                const outlinePrompt = model.instructions.stage2_outline
                    .replace('{{TITLE}}', title)
                    .replace('{{SOURCES}}', sources.join('\n'));
                const outline = await this._callAI(model, outlinePrompt, 600);
                if (!outline) throw new Error('فشل بناء الهيكل');

                // ----- المرحلة 3: كتابة المسودة -----
                const writePrompt = model.instructions.stage3_write
                    .replace('{{TITLE}}', title)
                    .replace('{{OUTLINE}}', outline)
                    .replace('{{SOURCES}}', sources.join('\n'));
                let article = await this._callAI(model, writePrompt, 2500);
                if (!article) throw new Error('فشل كتابة المقال');

                // ----- المرحلة 4: المراجعة والتدقيق -----
                const reviewPrompt = model.instructions.stage4_review.replace('{{ARTICLE}}', article);
                const reviewResult = await this._callAI(model, reviewPrompt, 1500);
                const review = this._parseReviewResult(reviewResult);

                if (review.status === 'rejected' && attempt < MAX_RETRIES) {
                    console.warn(`⚠️ [${model.name}] المراجعة رفضت: ${review.issues?.join(', ')}`);
                    continue;
                }

                article = review.correctedArticle || article;

                // ----- المرحلة 5: التلميع النهائي -----
                const polishPrompt = model.instructions.stage5_polish.replace('{{ARTICLE}}', article);
                article = await this._callAI(model, polishPrompt, 2000) || article;

                // ----- توليد الصورة -----
                const imageDesc = await this._callAI(model, `Write a short English prompt for DALL-E to generate a historically accurate image for: "${title}". One sentence only.`, 100);
                const imageUrl = imageDesc
                    ? `https://image.pollinations.ai/prompt/${encodeURIComponent(imageDesc)}?width=800&height=400`
                    : '';

                // ----- اختيار التبويبة والفرع -----
                const subcategory = await this._selectSubcategoryForModel(model);
                const categoryId = subcategory ? subcategory.categoryId : null;
                const subcategoryId = subcategory ? subcategory.id : null;
                const categoryName = subcategory ? subcategory.categoryName : '';
                const subcategoryName = subcategory ? subcategory.name : '';

                // ----- نشر المقال -----
                await this._publishPost({
                    title: title.trim(),
                    content: article,
                    imageUrl,
                    categoryId,
                    subcategoryId,
                    categoryName,
                    subcategoryName,
                    modelName: model.name
                });

                this.stats.totalPublished++;
                this.stats.lastActivity = new Date();
                this.saveStats();
                this._updateBadge();

                console.log(`✅ [${model.name}] مقال عالي الجودة نُشر: "${title.substring(0, 50)}..."`);
                break; // نجاح - خروج من حلقة المحاولات

            } catch (error) {
                console.error(`❌ [${model.name}] فشل الدورة (محاولة ${attempt}):`, error.message);
                if (attempt === MAX_RETRIES) {
                    this.stats.errors++;
                    this.saveStats();
                }
            }
        }
    },

    // ---------- استدعاء API النموذج ----------
    async _callAI(model, prompt, maxTokens = 800) {
        const headers = { 'Content-Type': 'application/json' };

        // Gemini له تنسيق مختلف
        if (model.name === 'Gemini') {
            const res = await fetch(`${model.url}?key=${model.key}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: maxTokens }
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data.candidates[0].content.parts[0].text;
        }

        // Cerebras و OpenAI-compatible
        headers['Authorization'] = `Bearer ${model.key}`;
        const res = await fetch(model.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: model.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.8
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    },

    // ---------- تحليل نتيجة المرحلة 1 ----------
    _parseStage1Result(result) {
        try {
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            // إذا فشل JSON، نتعامل معه كعنوان واحد
            const title = result.split('\n')[0].replace(/^[0-9]+\.\s*/, '').trim();
            if (title) return [{ title, sources: [] }];
        }
        return [];
    },

    // ---------- تحليل نتيجة المراجعة ----------
    _parseReviewResult(result) {
        try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    status: parsed.status || 'approved',
                    issues: parsed.issues || [],
                    correctedArticle: parsed.correctedArticle || null
                };
            }
        } catch (e) {}
        return { status: 'approved', issues: [], correctedArticle: null };
    },

    // ---------- اختيار فرع حسب تخصص النموذج ----------
    async _selectSubcategoryForModel(model) {
        // 80% من الفروع المتخصصة، 20% عشوائي
        if (Math.random() < 0.8 && model.assignedBranches && model.assignedBranches.length > 0) {
            const branchName = model.assignedBranches[Math.floor(Math.random() * model.assignedBranches.length)];
            const subcategory = await this._findSubcategoryByName(branchName);
            if (subcategory) return subcategory;
        }

        // اختيار عشوائي من أي فرع
        return await this._getRandomSubcategory();
    },

    // ---------- البحث عن فرع بالاسم ----------
    async _findSubcategoryByName(name) {
        try {
            const cats = await db.collection('categories').get();
            for (const catDoc of cats.docs) {
                const cat = catDoc.data();
                if (cat.subcategories) {
                    const found = cat.subcategories.find(s => s.name === name);
                    if (found) return {
                        id: found.id,
                        name: found.name,
                        categoryId: catDoc.id,
                        categoryName: cat.name
                    };
                }
            }
        } catch (e) {}
        return null;
    },

    // ---------- اختيار فرع عشوائي ----------
    async _getRandomSubcategory() {
        try {
            const cats = await db.collection('categories').get();
            const allSubs = [];
            cats.forEach(catDoc => {
                const cat = catDoc.data();
                if (cat.subcategories) {
                    cat.subcategories.forEach(sub => {
                        allSubs.push({
                            id: sub.id,
                            name: sub.name,
                            categoryId: catDoc.id,
                            categoryName: cat.name
                        });
                    });
                }
            });
            if (allSubs.length === 0) return null;
            return allSubs[Math.floor(Math.random() * allSubs.length)];
        } catch (e) {
            return null;
        }
    },

    // ---------- نشر المقال في Firestore ----------
    async _publishPost({ title, content, imageUrl, categoryId, subcategoryId, categoryName, subcategoryName, modelName }) {
        const postData = {
            title,
            content: [
                imageUrl ? { type: 'images', images: [{ dataUrl: imageUrl }] } : null,
                { type: 'markdown', value: content }
            ].filter(Boolean),
            author: `🤖 ${modelName}`,
            authorId: null,
            category: categoryId || null,
            subcategory: subcategoryId || null,
            categoryName: categoryName || '',
            subcategoryName: subcategoryName || '',
            date: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: [],
            views: 0,
            autoGenerated: true
        };

        await db.collection('posts').add(postData);

        // إضافة إشعار
        try {
            await db.collection('notifications').add({
                message: `📝 مقال جديد: "${title.substring(0, 50)}..." (${modelName})`,
                date: new Date().toISOString(),
                read: false
            });
        } catch (e) {}
    },

    // ---------- تحديث شارة الحالة ----------
    _updateBadge() {
        const badge = document.getElementById('auto-publish-badge');
        if (badge) {
            badge.textContent = this.isRunning() ? '🟢 نشط' : '⚫ متوقف';
            badge.style.color = this.isRunning() ? '#28a745' : '#666';
        }
    },

    // ---------- حفظ/تحميل الإحصائيات ----------
    saveStats() {
        localStorage.setItem('auto_publish_stats', JSON.stringify(this.stats));
    },
    loadStats() {
        const saved = localStorage.getItem('auto_publish_stats');
        if (saved) {
            this.stats = { ...this.stats, ...JSON.parse(saved) };
        }
    }
};
