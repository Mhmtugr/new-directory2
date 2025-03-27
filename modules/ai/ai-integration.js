/**
 * ai-integration.js
 * Yapay zeka modüllerini sistem ile entegre eden kod
 */

// Daha önce tanımlanmış mı kontrol et ve tekrar tanımlama
if (window.AIIntegrationModule) {
    console.log("AIIntegrationModule zaten yüklenmiş, tekrar yükleme atlanıyor.");
} else {
    // İçeri aktarma işlemleri
    let AppConfig, EventBus, Logger;
    
    // AppConfig modülünü yüklemeyi dene
    try {
        if (typeof require !== 'undefined') {
            AppConfig = require('../../config/app-config.js').default;
            EventBus = require('../../utils/event-bus.js').default;
            Logger = require('../../utils/logger.js').default;
            
            // AI modüllerini içe aktar
            const AIModules = require('./main.js').default;
        } else {
            // Modüller daha önce yüklenmemiş olabilir, global değişkenleri kontrol et
            AppConfig = window.AppConfig || {};
            EventBus = window.EventBus || {
                emit: function(event, data) {
                    console.log(`EventBus emit (placeholder): ${event}`, data);
                    // Olay yayını için basit bir yedek
                    const customEvent = new CustomEvent(event, { detail: data });
                    document.dispatchEvent(customEvent);
                }
            };
            Logger = window.Logger || console;
            
            // Dinamik olarak AI modüllerini yükle
            import('./main.js')
                .then(module => {
                    console.log("AI modülleri başarıyla yüklendi", module);
                })
                .catch(error => {
                    console.error("AI modüllerini yüklerken hata:", error);
                });
        }
    } catch (error) {
        console.warn("Modüller dinamik olarak yüklenemedi, alternatif yöntem deneniyor:", error);
        
        // Alternatif: Global değişkenleri kullan
        AppConfig = window.AppConfig || {};
        EventBus = window.EventBus || {
            emit: function(event, data) {
                console.log(`EventBus emit (placeholder): ${event}`, data);
                const customEvent = new CustomEvent(event, { detail: data });
                document.dispatchEvent(customEvent);
            }
        };
        Logger = window.Logger || console;
    }
    
    // Yapay Zeka Entegrasyon Modülü
    window.AIIntegrationModule = (function() {
        // Özel değişkenler
        let initialized = false;
        let aiModels = {};
        let predictionCache = {};
        
        // Yapay zeka modüllerini yükle
        async function loadAIModels() {
            console.log("Yapay Zeka modülleri yükleniyor...");
            
            try {
                // Gelişmiş AI asistanı yükle
                await loadScript('../modules/ai/advanced-ai.js');
                console.log("Gelişmiş AI asistanı yüklendi");
                
                // Tam entegrasyon için diğer gerekli modülleri yükle
                await Promise.all([
                    loadDependencies()
                ]);
                
                // DeepSeek-r1 entegrasyonu
                if (AppConfig.ai?.deepseek?.apiKey) {
                    await initializeDeepSeekModel();
                    console.log("DeepSeek-r1 modeli başarıyla yüklendi");
                }
                
                // OpenAI entegrasyonu
                if (AppConfig.ai?.openai?.apiKey) {
                    await initializeOpenAIModel();
                    console.log("OpenAI modeli başarıyla yüklendi");
                }
                
                // Makine öğrenmesi modeli yükle
                if (AppConfig.ai?.machineLearning?.enabled) {
                    await initializeMachineLearningModel();
                    console.log("Makine öğrenmesi modeli başarıyla yüklendi");
                }
                
                return true;
            } catch (error) {
                console.error("Yapay Zeka modülleri yüklenirken hata:", error);
                return false;
            }
        }
        
        // Yapay zeka bağımlılıklarını yükle
        async function loadDependencies() {
            // Burada gerekli bağımlılıklar yüklenebilir (örn. LLM modelleri için gerekli kütüphaneler)
            return true;
        }
        
        // DeepSeek-r1 modelini başlat
        async function initializeDeepSeekModel() {
            const config = AppConfig.ai.deepseek;
            
            Logger.info("DeepSeek AI modeli başlatılıyor", { model: config.model });
            
            // DeepSeek model konfigürasyonu
            aiModels.deepseek = {
                apiKey: config.apiKey,
                model: config.model,
                maxTokens: config.maxTokens,
                temperature: config.temperature,
                systemMessage: config.systemMessage,
                
                // Soru sorma fonksiyonu
                async askQuestion(question, context = "") {
                    try {
                        Logger.info("DeepSeek API'sine sorgu gönderiliyor", {
                            questionLength: question.length,
                            contextLength: context.length
                        });
                        
                        // Backend API'sine istek gönder
                        const response = await fetch('/api/ai/deepseek/ask', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${config.apiKey}`
                            },
                            body: JSON.stringify({
                                question,
                                context,
                                system_message: config.systemMessage || "Sen bir yapay zeka asistanısın",
                                model: config.model,
                                max_tokens: config.maxTokens,
                                temperature: config.temperature
                            })
                        });
                        
                        if (!response.ok) {
                            Logger.error("DeepSeek API hatası", { status: response.status, statusText: response.statusText });
                            throw new Error(`DeepSeek API hatası: ${response.status}`);
                        }
                        
                        const result = await response.json();
                        Logger.info("DeepSeek API yanıtı alındı", { responseLength: JSON.stringify(result).length });
                        return result.answer || result.text || result.response || "Üzgünüm, bir yanıt oluşturulamadı.";
                    } catch (error) {
                        Logger.error("DeepSeek ile soru cevaplama hatası:", { error: error.message, stack: error.stack });
                        console.error("DeepSeek ile soru cevaplama hatası:", error);
                        // Fallback yanıt
                        return "Üzgünüm, şu anda DeepSeek modeliyle iletişim kurarken bir sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.";
                    }
                },
                
                // Malzeme tahmini yapma
                async predictMaterials(orderDetails) {
                    try {
                        const response = await fetch('/api/ai/deepseek/materials', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${config.apiKey}`
                            },
                            body: JSON.stringify({
                                orderDetails,
                                model: config.model
                            })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`DeepSeek malzeme tahmini hatası: ${response.status}`);
                        }
                        
                        return await response.json();
                    } catch (error) {
                        console.error("Malzeme tahmini hatası:", error);
                        return null;
                    }
                },
                
                // Üretim süresi tahmini
                async predictProductionTime(orderDetails) {
                    try {
                        const response = await fetch('/api/ai/deepseek/production-time', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${config.apiKey}`
                            },
                            body: JSON.stringify({
                                orderDetails,
                                model: config.model
                            })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`DeepSeek üretim süresi tahmini hatası: ${response.status}`);
                        }
                        
                        return await response.json();
                    } catch (error) {
                        console.error("Üretim süresi tahmini hatası:", error);
                        return null;
                    }
                }
            };
        }

        // OpenAI modelini başlat
        async function initializeOpenAIModel() {
            const config = AppConfig.ai.openai;
            
            // OpenAI model konfigürasyonu
            aiModels.openai = {
                apiKey: config.apiKey,
                model: config.model,
                systemMessage: config.systemMessage,
                
                // Soru sorma fonksiyonu
                async askQuestion(question, context = "") {
                    try {
                        // Backend API'sine istek gönder
                        const response = await fetch('/api/ai/openai/ask', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${config.apiKey}`
                            },
                            body: JSON.stringify({
                                question,
                                context,
                                system_message: config.systemMessage || "Sen bir yapay zeka asistanısın",
                                model: config.model
                            })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`OpenAI API hatası: ${response.status}`);
                        }
                        
                        const result = await response.json();
                        return result.answer || result.text || result.response || "Üzgünüm, bir yanıt oluşturulamadı.";
                    } catch (error) {
                        console.error("OpenAI ile soru cevaplama hatası:", error);
                        // Fallback yanıt
                        return "Üzgünüm, şu anda OpenAI modeliyle iletişim kurarken bir sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.";
                    }
                }
            };
        }
        
        // Makine öğrenimi modelini başlat
        async function initializeMachineLearningModel() {
            const config = AppConfig.ai.machineLearning;
            
            // Tensorflow.js ile model oluşturma veya yükleme
            aiModels.machineLearning = {
                // Basit regresyon modeli
                regressionModel: null,
                
                // Modeli eğit
                async train(data) {
                    try {
                        // Verileri işle
                        const processedData = preprocessData(data);
                        
                        // Model oluştur
                        const model = tf.sequential();
                        model.add(tf.layers.dense({units: 10, activation: 'relu', inputShape: [config.features.length]}));
                        model.add(tf.layers.dense({units: 1}));
                        
                        model.compile({
                            optimizer: 'adam',
                            loss: 'meanSquaredError'
                        });
                        
                        // Eğitim verileri
                        const xs = tf.tensor2d(processedData.inputs);
                        const ys = tf.tensor2d(processedData.outputs);
                        
                        // Modeli eğit
                        await model.fit(xs, ys, {
                            epochs: 100,
                            batchSize: 32,
                            callbacks: {
                                onEpochEnd: (epoch, logs) => {
                                    console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
                                }
                            }
                        });
                        
                        this.regressionModel = model;
                        console.log("Regresyon modeli eğitildi");
                        
                        return true;
                    } catch (error) {
                        console.error("Model eğitimi hatası:", error);
                        return false;
                    }
                },
                
                // Tahmin yap
                async predict(inputData) {
                    if (!this.regressionModel) {
                        return null;
                    }
                    
                    try {
                        const processedInput = preprocessInput(inputData);
                        const inputTensor = tf.tensor2d([processedInput]);
                        
                        const prediction = this.regressionModel.predict(inputTensor);
                        const result = await prediction.array();
                        
                        return result[0][0]; // Tek bir sayı dönecek
                    } catch (error) {
                        console.error("Tahmin hatası:", error);
                        return null;
                    }
                }
            };
        }
        
        // Veri ön işleme
        function preprocessData(data) {
            // Örnek veri ön işleme (gerçek uygulamada daha karmaşık olabilir)
            const inputs = [];
            const outputs = [];
            
            data.forEach(item => {
                const input = [];
                // Özellikleri input'a ekle
                AppConfig.ai.machineLearning.features.forEach(feature => {
                    input.push(parseFloat(item[feature]) || 0);
                });
                
                inputs.push(input);
                outputs.push([parseFloat(item.target) || 0]);
            });
            
            return { inputs, outputs };
        }
        
        // Girdi ön işleme
        function preprocessInput(inputData) {
            const input = [];
            
            // Özellikleri input'a ekle
            AppConfig.ai.machineLearning.features.forEach(feature => {
                input.push(parseFloat(inputData[feature]) || 0);
            });
            
            return input;
        }
        
        // AI yeteneklerini entegre et
        function integrateAICapabilities() {
            // Dashboard'a AI öngörülerini entegre et
            if (document.getElementById('ai-insights-panel')) {
                updateDashboardWithAIInsights();
            }
            
            // Sipariş detaylarına AI önerilerini entegre et
            document.addEventListener('order-detail-loaded', function(e) {
                const orderId = e.detail.orderId;
                const container = e.detail.container;
                
                if (orderId && container) {
                    enhanceOrderDetailWithAI(orderId, container);
                }
            });
            
            // Üretim planlama sayfasına AI önerilerini entegre et
            document.addEventListener('production-plan-loaded', function() {
                enhanceProductionPlanWithAI();
            });
            
            // AI asistanını formlarla entegre et
            document.querySelectorAll('.ai-assist-btn').forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    const targetInput = document.getElementById(this.getAttribute('data-target'));
                    const context = this.getAttribute('data-context');
                    
                    if (targetInput) {
                        generateAISuggestion(targetInput, context);
                    }
                });
            });
            
            console.log("AI yetenekleri entegre edildi");
        }
        
        // Yapay zeka öngörülerini güncelle
        function updateDashboardWithAIInsights(insights) {
            const container = document.getElementById('ai-insights-panel');
            if (!container) return;
            
            // Yapay zeka modüllerinden veri topla ve görüntüle
            if (window.AIAnalytics && window.AIAnalytics.displayAIInsights) {
                window.AIAnalytics.displayAIInsights(container.id)
                    .then(() => {
                        Logger.info("Dashboard AI öngörüleri başarıyla güncellendi");
                        EventBus.emit('ai-insights-updated');
                    })
                    .catch(error => {
                        Logger.error("Dashboard AI öngörüler güncellenirken hata", { error: error.message });
                        container.innerHTML = `<div class="error-box">AI öngörüleri yüklenirken hata: ${error.message}</div>`;
                    });
            } else {
                Logger.warn("AIAnalytics modülü bulunamadı veya displayAIInsights fonksiyonu yok");
                container.innerHTML = '<div class="info-box warning">AI analiz modülü henüz yüklenmemiş.</div>';
                
                // Modülü dinamik olarak yüklemeyi dene
                import('./main.js')
                    .then(module => {
                        Logger.info("AI modülleri başarıyla yüklendi", { module: Object.keys(module.default) });
                        if (module.default.AIAnalytics && module.default.AIAnalytics.displayAIInsights) {
                            module.default.AIAnalytics.displayAIInsights(container.id);
                        }
                    })
                    .catch(error => {
                        Logger.error("AI modüllerini yüklerken hata", { error: error.message });
                    });
            }
        }
        
        // Sipariş detayını yapay zeka ile zenginleştir
        function enhanceOrderDetailWithAI(orderId, container) {
            if (!orderId || !container) return;
            
            // AI paneli ekle
            const aiPanel = document.createElement('div');
            aiPanel.className = 'order-detail-section ai-panel';
            aiPanel.innerHTML = `
                <h3><i class="fas fa-robot"></i> Yapay Zeka Analizi</h3>
                <div class="ai-analysis-content" id="ai-analysis-${orderId}">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Yapay zeka analizi yükleniyor...
                    </div>
                </div>
            `;
            
            container.appendChild(aiPanel);
            
            // AI analizini yükle
            loadOrderAIAnalysis(orderId, `ai-analysis-${orderId}`);
        }
        
        // Sipariş AI analizini yükle
        async function loadOrderAIAnalysis(orderId, containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            try {
                // Sipariş detaylarını getir
                const orderResponse = await fetch(`/api/orders/${orderId}`);
                if (!orderResponse.ok) {
                    throw new Error(`Sipariş bilgileri alınamadı: ${orderResponse.status}`);
                }
                const order = await orderResponse.json();
                
                // Malzeme durumunu getir
                const materialsResponse = await fetch(`/api/materials/status/${orderId}`);
                if (!materialsResponse.ok) {
                    throw new Error(`Malzeme durumu alınamadı: ${materialsResponse.status}`);
                }
                const materials = await materialsResponse.json();
                
                // AI tavsiyelerini al
                const aiResponse = await fetch(`/api/ai/analyze-order/${orderId}`);
                const aiData = aiResponse.ok ? await aiResponse.json() : { 
                    recommendations: [],
                    riskScore: calculateRiskScore(order, materials),
                    estimatedCompletionDate: estimateCompletionDate(order, materials)
                };
                
                // Analiz içeriğini oluştur
                let html = `
                    <div class="ai-analysis-summary">
                        <div class="risk-score ${getRiskLevelClass(aiData.riskScore)}">
                            <div class="score-value">${aiData.riskScore}%</div>
                            <div class="score-label">Gecikme Riski</div>
                        </div>
                        <div class="completion-estimate">
                            <div class="estimate-date">${formatDate(aiData.estimatedCompletionDate)}</div>
                            <div class="estimate-label">Tahmini Tamamlanma</div>
                        </div>
                        <div class="material-status">
                            <div class="status-value">${materials.availablePercentage || 0}%</div>
                            <div class="status-label">Malzeme Hazırlık</div>
                        </div>
                    </div>
                `;
                
                // Tavsiyeler
                if (aiData.recommendations && aiData.recommendations.length > 0) {
                    html += `<div class="ai-recommendations"><h4>Öneriler</h4><ul>`;
                    aiData.recommendations.forEach(rec => {
                        html += `<li class="${rec.priority}">${rec.text}</li>`;
                    });
                    html += `</ul></div>`;
                }
                
                // Yapay zeka panelini güncelle
                container.innerHTML = html;
                
            } catch (error) {
                console.error("Sipariş AI analizi yüklenirken hata:", error);
                container.innerHTML = `<div class="error">Yapay zeka analizi yüklenirken bir hata oluştu: ${error.message}</div>`;
            }
            
            function calculateRiskScore(order, materials) {
                // Basit bir risk skoru hesaplama
                let score = 0;
                
                // Malzeme hazırlık durumu
                if (materials.availablePercentage) {
                    score += (100 - materials.availablePercentage) * 0.5;
                } else {
                    score += 50; // Varsayılan risk
                }
                
                // Teslim tarihine kalan süre
                const deliveryDate = new Date(order.deliveryDate);
                const today = new Date();
                const daysLeft = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
                
                if (daysLeft < 0) {
                    score += 100; // Zaten gecikmiş
                } else if (daysLeft < 7) {
                    score += (7 - daysLeft) * 10;
                }
                
                return Math.min(Math.round(score), 100);
            }
            
            function estimateCompletionDate(order, materials) {
                // Tahmini tamamlanma tarihi hesapla
                const today = new Date();
                const deliveryDate = new Date(order.deliveryDate);
                
                // Malzeme hazırlık durumuna göre ek süre
                let additionalDays = 0;
                if (materials.availablePercentage < 50) {
                    additionalDays += 14; // Malzemeler hazır değilse 2 hafta ekle
                } else if (materials.availablePercentage < 80) {
                    additionalDays += 7; // Malzemeler kısmen hazırsa 1 hafta ekle
                }
                
                // Tahmini tarihi hesapla
                const estimatedDate = new Date(today);
                estimatedDate.setDate(today.getDate() + additionalDays + (order.estimatedProductionDays || 10));
                
                return estimatedDate;
            }
            
            function getRiskLevelClass(risk) {
                if (risk >= 70) return 'high-risk';
                if (risk >= 30) return 'medium-risk';
                return 'low-risk';
            }
            
            function formatDate(date) {
                if (!date) return 'Bilinmiyor';
                
                const d = new Date(date);
                return d.toLocaleDateString('tr-TR');
            }
        }
        
        // Üretim planını yapay zeka ile zenginleştir
        function enhanceProductionPlanWithAI() {
            // AI önerileri paneli ekle
            const container = document.querySelector('.production-plan-container');
            if (!container) return;
            
            const aiPanel = document.createElement('div');
            aiPanel.className = 'ai-recommendations-panel';
            aiPanel.innerHTML = `
                <h3>Yapay Zeka Üretim Önerileri</h3>
                <div class="ai-recommendations-content" id="production-ai-recommendations">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Yapay zeka önerileri yükleniyor...
                    </div>
                </div>
            `;
            
            // Paneli ekle (container'ın ilk çocuğu olarak)
            container.insertBefore(aiPanel, container.firstChild);
            
            // Önerileri yükle
            fetch('/api/ai/production-recommendations')
                .then(response => response.json())
                .then(data => {
                    const recommendationsContainer = document.getElementById('production-ai-recommendations');
                    
                    if (!data || !data.recommendations || data.recommendations.length === 0) {
                        recommendationsContainer.innerHTML = '<p>Şu anda herhangi bir yapay zeka önerisi bulunmuyor.</p>';
                        return;
                    }
                    
                    let html = '<div class="recommendations-list">';
                    
                    data.recommendations.forEach(rec => {
                        html += `
                            <div class="recommendation-item ${rec.priority}-priority">
                                <div class="rec-title">${rec.title}</div>
                                <div class="rec-description">${rec.description}</div>
                                ${rec.potentialSavings ? `<div class="rec-savings">Potansiyel Kazanç: ${rec.potentialSavings}</div>` : ''}
                                <div class="rec-actions">
                                    <button class="btn btn-sm btn-primary apply-recommendation" data-id="${rec.id}">Uygula</button>
                                    <button class="btn btn-sm btn-link dismiss-recommendation" data-id="${rec.id}">Kapat</button>
                                </div>
                            </div>
                        `;
                    });
                    
                    html += '</div>';
                    recommendationsContainer.innerHTML = html;
                    
                    // Buton olaylarını ekle
                    document.querySelectorAll('.apply-recommendation').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const recId = this.getAttribute('data-id');
                            applyAIRecommendation(recId);
                        });
                    });
                    
                    document.querySelectorAll('.dismiss-recommendation').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const recId = this.getAttribute('data-id');
                            dismissAIRecommendation(recId);
                            this.closest('.recommendation-item').remove();
                        });
                    });
                })
                .catch(error => {
                    console.error("Yapay zeka önerileri yüklenirken hata:", error);
                    document.getElementById('production-ai-recommendations').innerHTML = 
                        `<div class="error">Öneriler yüklenirken bir hata oluştu: ${error.message}</div>`;
                });
        }
        
        // Harici script yükleme
        function loadScript(url) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => resolve();
                script.onerror = (e) => reject(new Error(`Script yükleme hatası: ${url}`));
                document.head.appendChild(script);
            });
        }
        
        // Yedek yanıt oluştur (AI çalışmadığında)
        function generateFallbackResponse(question) {
            const fallbackResponses = {
                default: "Üzgünüm, şu anda bu soruya yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.",
                greeting: "Merhaba! Size nasıl yardımcı olabilirim?",
                thanks: "Rica ederim! Başka bir sorunuz var mı?",
                production: "Üretim planlaması ile ilgili bilgileri kontrol panelinden görüntüleyebilirsiniz."
            };
            
            if (question.toLowerCase().includes("merhaba") || question.toLowerCase().includes("selam")) {
                return fallbackResponses.greeting;
            } else if (question.toLowerCase().includes("teşekkür") || question.toLowerCase().includes("sağol")) {
                return fallbackResponses.thanks;
            } else if (question.toLowerCase().includes("üretim") || question.toLowerCase().includes("plan")) {
                return fallbackResponses.production;
            }
            
            return fallbackResponses.default;
        }
        
        // Modülü başlat
        async function initialize() {
            if (initialized) return true;
            
            try {
                await loadAIModels();
                integrateAICapabilities();
                
                initialized = true;
                console.log("AI Entegrasyon Modülü başarıyla başlatıldı");
                
                return true;
            } catch (error) {
                console.error("AI Entegrasyon Modülü başlatılırken hata:", error);
                return false;
            }
        }
        
        // DeepSeek modeli ile soru sor
        async function askDeepSeek(question, context = "") {
            if (!aiModels.deepseek) {
                Logger.warn("DeepSeek modeli yüklenmemiş, yükleme başlatılıyor");
                console.warn("DeepSeek modeli yüklenmemiş. İlk model yükleniyor...");
                await initializeDeepSeekModel();
            }
            
            if (aiModels.deepseek) {
                Logger.info("DeepSeek modeli ile soru yanıtlanıyor", { questionLength: question.length });
                return await aiModels.deepseek.askQuestion(question, context);
            } else {
                Logger.error("DeepSeek modeli kullanılamıyor");
                console.error("DeepSeek modeli kullanılamıyor");
                return generateFallbackResponse(question);
            }
        }
        
        // OpenAI modeli ile soru sor
        async function askOpenAI(question, context = "") {
            if (!aiModels.openai) {
                console.warn("OpenAI modeli yüklenmemiş. İlk model yükleniyor...");
                await initializeOpenAIModel();
            }
            
            if (aiModels.openai) {
                return await aiModels.openai.askQuestion(question, context);
            } else {
                console.error("OpenAI modeli kullanılamıyor");
                return generateFallbackResponse(question);
            }
        }
        
        // Modül başlatma ve olay dinleyiciler
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                initialize().then(status => {
                    if (status) {
                        EventBus.emit('ai-modules-loaded', { success: true });
                    }
                });
            }, 1000); // Diğer modüllerin yüklenmesi için biraz bekle
        });
        
        // Dışa aktarılan metodlar
        return {
            initialize,
            askDeepSeek,
            askOpenAI,
            loadAIModels,
            preprocessInput,
            generateFallbackResponse
        };
    })();
}