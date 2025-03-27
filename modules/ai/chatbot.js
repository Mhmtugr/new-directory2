/**
 * chatbot.js
 * Yapay zeka asistanı işlevleri
 */

import AppConfig from '../../config/app-config.js';
import AdvancedAI from './advanced-ai.js';
import AIIntegrationModule from './ai-integration.js';
import Logger from '../../utils/logger.js';

// Chatbot penceresini göster/gizle
function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbot-window');
    if (chatbotWindow.style.display === 'flex') {
        chatbotWindow.style.display = 'none';
    } else {
        chatbotWindow.style.display = 'flex';
        document.getElementById('chatbot-input').focus();
        
        // Eğer ilk açılışsa hoşgeldin mesajı göster
        if (!chatbotWindow.dataset.initialized) {
            showWelcomeMessage();
            chatbotWindow.dataset.initialized = "true";
        }
    }
}

// Hoşgeldin mesajı göster
function showWelcomeMessage() {
    const chatBody = document.getElementById('chatbot-body');
    if (!chatBody) return;
    
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'chat-message bot';
    welcomeMessage.innerHTML = `
        <p>Merhaba! Ben Mehmet Endüstriyel Takip yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?</p>
        <p>Örnek sorular:</p>
        <ul class="quick-questions">
            <li><a href="#" class="quick-question" data-question="Üretimdeki siparişlerin durumu nedir?">Üretimdeki siparişlerin durumu nedir?</a></li>
            <li><a href="#" class="quick-question" data-question="Hangi malzemelerde kritik eksiklik var?">Hangi malzemelerde kritik eksiklik var?</a></li>
            <li><a href="#" class="quick-question" data-question="CB hücre tipi için üretim süresi tahmini nedir?">CB hücre tipi için üretim süresi tahmini nedir?</a></li>
            <li><a href="#" class="quick-question" data-question="Üretimde gecikme riski olan siparişleri göster">Üretimde gecikme riski olan siparişleri göster</a></li>
        </ul>
    `;
    chatBody.appendChild(welcomeMessage);
    
    // Hızlı soru bağlantılarına tıklama olayları ekle
    welcomeMessage.querySelectorAll('.quick-question').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const question = this.getAttribute('data-question');
            document.getElementById('chatbot-input').value = question;
            sendChatMessage();
        });
    });
}

// Mesaj gönderme
async function sendChatMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (message === '') return;
    
    // Kullanıcı mesajını ekle
    const chatBody = document.getElementById('chatbot-body');
    const userMessageElement = document.createElement('div');
    userMessageElement.className = 'chat-message user';
    userMessageElement.textContent = message;
    chatBody.appendChild(userMessageElement);
    
    // Input'u temizle
    input.value = '';
    
    // Yanıt oluşturma (yapay zeka ile entegrasyon)
    await generateBotResponse(message, chatBody);
    
    // Scroll to bottom
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Yapay zeka yanıtı oluşturma
async function generateBotResponse(message, chatBody) {
    // Yükleniyor göster
    const loadingElement = document.createElement('div');
    loadingElement.className = 'chat-message bot';
    loadingElement.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Yanıt hazırlanıyor...';
    chatBody.appendChild(loadingElement);
    
    try {
        // AI modunu belirle ve yanıt al
        let botResponse = '';
        
        // Gerçek AI modeli ile veri topla
        const context = await collectContextData(message);
        Logger.info("Chatbot bağlam verileri toplandı", { messageLength: message.length, contextLength: context.length });
        
        // Öncelik sırası: DeepSeek -> OpenAI -> AdvancedAI -> Demo
        if (AppConfig.ai?.deepseek?.apiKey && AIIntegrationModule) {
            // DeepSeek Entegrasyonu
            Logger.info("DeepSeek AI modeli kullanılıyor", { message: message.substring(0, 50) + "..." });
            botResponse = await AIIntegrationModule.askDeepSeek(message, context);
        } else if (AppConfig.ai?.openai?.apiKey && AIIntegrationModule) {
            // OpenAI Entegrasyonu
            Logger.info("OpenAI modeli kullanılıyor", { message: message.substring(0, 50) + "..." });
            botResponse = await AIIntegrationModule.askOpenAI(message, context);
        } else if (AdvancedAI) {
            // Yerleşik AdvancedAI modülü
            Logger.info("Yerleşik AdvancedAI modülü kullanılıyor", { message: message.substring(0, 50) + "..." });
            botResponse = await AdvancedAI.askQuestion(message, context);
        } else {
            // Demo yanıt mantığı (fallback)
            Logger.warn("AI modelleri bulunamadı, demo yanıt kullanılıyor");
            botResponse = generateDemoResponse(message);
        }
        
        // Yükleniyor mesajını kaldır
        chatBody.removeChild(loadingElement);
        
        // Gerçek yanıtı ekle
        const botMessageElement = document.createElement('div');
        botMessageElement.className = 'chat-message bot';
        
        // Markdown ve HTML desteği ekle
        botResponse = formatResponse(botResponse);
        botMessageElement.innerHTML = botResponse;
        
        chatBody.appendChild(botMessageElement);
        
        // Grafik ve veri görselleştirme işlemleri
        processVisualizationRequests(message, botResponse, botMessageElement);
        
        // Yanıtın içeriğine göre eylem öner
        suggestActionsBasedOnResponse(message, botResponse, chatBody);
        
        Logger.info("Chatbot yanıtı başarıyla oluşturuldu");
        
    } catch (error) {
        console.error("Chatbot yanıt hatası:", error);
        Logger.error("Chatbot yanıt hatası", { error: error.message, stack: error.stack });
        
        // Hata durumunda
        chatBody.removeChild(loadingElement);
        const errorElement = document.createElement('div');
        errorElement.className = 'chat-message bot';
        errorElement.textContent = 'Üzgünüm, yanıt oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.';
        chatBody.appendChild(errorElement);
    }
}

// Yanıt formatı (markdown vs html dönüşümü)
function formatResponse(response) {
    // HTML etiketleri kontrolü
    if (/<\/?[a-z][\s\S]*>/i.test(response)) {
        return response; // Zaten HTML varsa dokunma
    }
    
    // Basit markdown dönüşümleri
    // Kalın metin
    response = response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // İtalik metin
    response = response.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Başlıklar
    response = response.replace(/#{3}(.*)/g, '<h3>$1</h3>');
    response = response.replace(/#{2}(.*)/g, '<h2>$1</h2>');
    response = response.replace(/#{1}(.*)/g, '<h1>$1</h1>');
    // Listeler
    response = response.replace(/- (.*)/g, '<li>$1</li>');
    response = response.replace(/<li>(.*)<\/li>/g, '<ul><li>$1</li></ul>');
    // Yeni satırlar
    response = response.replace(/\n/g, '<br>');
    
    return response;
}

// Veri görselleştirme işlemleri
function processVisualizationRequests(message, response, container) {
    // Üretim verileri gösterme isteği kontrolü
    if (message.toLowerCase().includes('üretim grafik') || 
        message.toLowerCase().includes('üretim verilerini göster') ||
        message.toLowerCase().includes('istatistik') ||
        message.toLowerCase().includes('grafik')) {
        
        // Grafik elementi oluştur
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chat-chart-container';
        chartContainer.innerHTML = '<canvas id="chat-chart"></canvas>';
        container.appendChild(chartContainer);
        
        // Örnek üretim verileri (gerçek uygulamada API'den alınır)
        const productionData = {
            labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'],
            datasets: [
                {
                    label: 'Tamamlanan Siparişler',
                    data: [12, 19, 15, 20, 18, 22],
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Gecikmeli Siparişler',
                    data: [2, 3, 1, 2, 1, 0],
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
        
        // Chart.js ile grafik oluştur
        setTimeout(() => {
            const ctx = document.getElementById('chat-chart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: productionData,
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }, 100);
    }
}

// İlgili bağlam verilerini topla
async function collectContextData(message) {
    let context = "";
    
    try {
        // Soru içeriğine göre bağlam verilerini topla
        if (message.toLowerCase().includes('sipariş') || message.toLowerCase().includes('order')) {
            // Aktif siparişleri al
            const orders = await fetchActiveOrders();
            if (orders && orders.length > 0) {
                context += "Aktif Siparişler:\n";
                orders.forEach((order, index) => {
                    context += `${index + 1}. ${order.orderNumber} - ${order.customer} - ${order.cellType} - ${order.status}\n`;
                });
            }
        }
        
        if (message.toLowerCase().includes('malzeme') || message.toLowerCase().includes('material') || message.toLowerCase().includes('stok')) {
            // Kritik malzemeleri al
            const materials = await fetchCriticalMaterials();
            if (materials && materials.length > 0) {
                context += "\nKritik Malzemeler:\n";
                materials.forEach((material, index) => {
                    context += `${index + 1}. ${material.code} - ${material.name} - Stok: ${material.stock}, Gerekli: ${material.required}\n`;
                });
            }
        }
        
        if (message.toLowerCase().includes('üretim') || message.toLowerCase().includes('production')) {
            // Üretim durumunu al
            const production = await fetchProductionStatus();
            if (production) {
                context += "\nÜretim Durumu:\n";
                context += `Devam Eden: ${production.inProgress}\n`;
                context += `Geciken: ${production.delayed}\n`;
                context += `Tamamlanan (bu ay): ${production.completed}\n`;
            }
        }
        
        if (message.toLowerCase().includes('teknik') || message.toLowerCase().includes('technical') || 
            message.toLowerCase().includes('hücre') || message.toLowerCase().includes('cell')) {
            // Teknik veri bilgilerini getir
            const technicalData = await fetchTechnicalData();
            if (technicalData) {
                context += "\nTeknik Veriler:\n";
                Object.entries(technicalData).forEach(([key, value]) => {
                    context += `${key}: ${value}\n`;
                });
            }
        }
        
        return context;
        
    } catch (error) {
        console.error("Bağlam verisi toplanırken hata:", error);
        return "";
    }
}

// Teknik veri bilgilerini getir
async function fetchTechnicalData() {
    try {
        // Gerçek uygulamada API çağrısı yapılır
        // Demo amaçlı sabit veri
        return {
            "CB_Hücre_Veri": "Orta gerilim kesicili hücre, 36kV, 31.5kA, 1250A nominal akım kapasitesi",
            "LB_Hücre_Veri": "Orta gerilim yük ayırıcılı hücre, 36kV, 25kA, 630A nominal akım kapasitesi",
            "FL_Hücre_Veri": "Orta gerilim sigortalı hücre, 36kV, 200A limit akım",
            "RMU_Hücre_Veri": "Ring Main Unit, kompakt metal muhafazalı gaz izoleli şalt cihazı, 36kV"
        };
    } catch (error) {
        console.error("Teknik veri bilgileri alınırken hata:", error);
        return null;
    }
}

// Aktif siparişleri getir
async function fetchActiveOrders() {
    try {
        // Gerçek uygulamada API çağrısı yapılır
        // Demo amaçlı sabit veri
        return [
            { orderNumber: "0424-1251", customer: "AYEDAŞ", cellType: "RM 36 CB", status: "Üretimde" },
            { orderNumber: "0424-1245", customer: "BEDAŞ", cellType: "RM 36 CB", status: "Malzeme Bekliyor" },
            { orderNumber: "0424-1239", customer: "TEİAŞ", cellType: "RM 36 LB", status: "Üretimde" }
        ];
    } catch (error) {
        console.error("Sipariş verileri alınırken hata:", error);
        return [];
    }
}

// Kritik malzemeleri getir
async function fetchCriticalMaterials() {
    try {
        // Gerçek uygulamada API çağrısı yapılır
        // Demo amaçlı sabit veri
        return [
            { code: "137998%", name: "Siemens 7SR1003-1JA20-2DA0+ZY20 24VDC", stock: 2, required: 8 },
            { code: "144866%", name: "KAP-80/190-95 Akım Trafosu", stock: 3, required: 5 },
            { code: "120170%", name: "M480TB/G-027-95.300UN5 Kablo Başlığı", stock: 12, required: 15 }
        ];
    } catch (error) {
        console.error("Malzeme verileri alınırken hata:", error);
        return [];
    }
}

// Üretim durumunu getir
async function fetchProductionStatus() {
    try {
        // Gerçek uygulamada API çağrısı yapılır
        // Demo amaçlı sabit veri
        return {
            inProgress: 18,
            delayed: 3,
            completed: 42
        };
    } catch (error) {
        console.error("Üretim durumu alınırken hata:", error);
        return null;
    }
}

// Demo yanıt oluştur (Yapay Zeka mevcut değilse)
function generateDemoResponse(message) {
    message = message.toLowerCase();
    
    if (message.includes('merhaba') || message.includes('selam')) {
        return 'Merhaba! Size nasıl yardımcı olabilirim?';
    } else if (message.includes('sipariş') && message.includes('durum')) {
        return 'Aktif siparişlerinizi kontrol ediyorum... AYEDAŞ siparişi (24-03-A001) üretim aşamasında, BAŞKENT EDAŞ siparişi (24-03-B002) için malzeme tedarik sorunu bulunuyor.';
    } else if (message.includes('malzeme') || message.includes('stok')) {
        return 'Stok durumunu kontrol ediyorum... Kablo başlıkları ve gerilim gösterge malzemelerinde eksiklik var. Satın alma departmanı tedarik işlemlerini yürütüyor.';
    } else if (message.includes('üretim') && message.includes('süre')) {
        return 'Orta gerilim hücrelerinin üretim süreleri: CB tipi ~18 gün, LB tipi ~15 gün, FL tipi ~20 gün. Bu süreler; malzeme tedariki, mekanik üretim, montaj ve test süreçlerini içermektedir.';
    } else if (message.includes('kritik') || message.includes('acil')) {
        return 'Kritik durum listesi: Siemens 7SR1003-1JA20-2DA0+ZY20 24VDC rölesinde kritik stok seviyesi (2 adet kaldı, 8 adet gerekli). AYEDAŞ siparişi için tedarik bekliyor.';
    } else if (message.includes('teknik') || message.includes('hücre')) {
        return 'RM 36 serisi hücre tipleri: CB (Kesicili), LB (Yük Ayırıcılı), FL (Kontaktör+Sigortalı), RMU (Ring Main Unit). Nominal gerilim 36kV, kısa devre akımı 31.5kA, nominal akım 630-1250A arasında değişmektedir.';
    } else if (message.includes('analiz') || message.includes('rapor')) {
        return 'Son 6 ayın üretim analizi: 218 adet hücre tamamlandı (42 CB, 96 LB, 68 FL, 12 RMU). Ortalama tamamlanma süresi 17 gün. Gecikme oranı %8. Öncelikli iyileştirme alanı: Kablaj süreçleri.';
    } else if (message.includes('tedarikçi') || message.includes('satın alma')) {
        return 'En aktif tedarikçiler: 1) Elektrik Malzemeleri A.Ş. (Koruma röleleri) 2) Mekanik Parçalar Ltd. (Metal kasalar) 3) Kablo Sistemleri (Güç kabloları). En uzun tedarik süresi: İthal röle bileşenleri (ortalama 45 gün).';
    } else {
        return 'Bu konu hakkında şu anda detaylı bilgi sunamıyorum. Sorgunuzu daha spesifik hale getirmeyi veya başka bir konuda yardım istemeyi deneyebilirsiniz.';
    }
}

// Yanıta göre eylem öner
function suggestActionsBasedOnResponse(message, response, chatBody) {
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    
    // Sipariş durumu ile ilgili ise
    if (message.toLowerCase().includes('sipariş') || message.toLowerCase().includes('order')) {
        actionButtons.innerHTML = `
            <button class="action-btn" onclick="window.location.href='#orders-page'">
                <i class="fas fa-clipboard-list"></i> Sipariş Listesi
            </button>
            <button class="action-btn" onclick="window.showCreateOrderModal()">
                <i class="fas fa-plus"></i> Yeni Sipariş
            </button>
        `;
    }
    
    // Malzeme ve stok ile ilgili ise
    else if (message.toLowerCase().includes('malzeme') || message.toLowerCase().includes('stok') || message.toLowerCase().includes('material')) {
        actionButtons.innerHTML = `
            <button class="action-btn" onclick="window.location.href='#inventory-page'">
                <i class="fas fa-boxes"></i> Stok Yönetimi
            </button>
            <button class="action-btn" onclick="window.location.href='#purchasing-page'">
                <i class="fas fa-shopping-cart"></i> Satın Alma
            </button>
        `;
    }
    
    // Üretim ile ilgili ise
    else if (message.toLowerCase().includes('üretim') || message.toLowerCase().includes('production')) {
        actionButtons.innerHTML = `
            <button class="action-btn" onclick="window.location.href='#production-page'">
                <i class="fas fa-industry"></i> Üretim Takibi
            </button>
            <button class="action-btn" onclick="window.showProductionPlan()">
                <i class="fas fa-calendar-alt"></i> Üretim Planı
            </button>
        `;
    }
    
    // Teknik bilgiler ile ilgili ise
    else if (message.toLowerCase().includes('teknik') || message.toLowerCase().includes('hücre') || message.toLowerCase().includes('cell')) {
        actionButtons.innerHTML = `
            <button class="action-btn" onclick="window.location.href='#technical-page'">
                <i class="fas fa-cogs"></i> Teknik Dökümanlar
            </button>
            <button class="action-btn" onclick="window.showTechnicalSpecs()">
                <i class="fas fa-file-alt"></i> Teknik Şartnameler
            </button>
        `;
    }
    
    // Analiz ve rapor ile ilgili ise
    else if (message.toLowerCase().includes('analiz') || message.toLowerCase().includes('rapor')) {
        actionButtons.innerHTML = `
            <button class="action-btn" onclick="window.location.href='#dashboard-page'">
                <i class="fas fa-chart-bar"></i> Dashboard
            </button>
            <button class="action-btn" onclick="window.showReports()">
                <i class="fas fa-file-excel"></i> Raporlar
            </button>
        `;
    }
    
    // Eylem butonları varsa ekle
    if (actionButtons.innerHTML.trim() !== '') {
        chatBody.appendChild(actionButtons);
    }
}

// Chatbot UI bileşenini oluştur
function createChatbotUIIfNeeded() {
    if (document.getElementById('chatbot-window')) return;
    
    const chatbotUI = document.createElement('div');
    chatbotUI.innerHTML = `
        <div id="chatbot-btn" class="ai-chatbot-btn" onclick="toggleChatbot()">
            <i class="fas fa-robot"></i>
            <span class="notification-badge">1</span>
        </div>
        <div id="chatbot-window" class="chatbot-window" style="display: none;">
            <div class="chatbot-header">
                <div class="chatbot-title">Mehmet Endüstriyel Takip AI Asistanı</div>
                <div class="chatbot-controls">
                    <button class="chatbot-btn minimize" onclick="toggleChatbot()">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
            </div>
            <div id="chatbot-body" class="chatbot-body"></div>
            <div class="chatbot-footer">
                <input type="text" id="chatbot-input" class="chatbot-input" placeholder="Bir soru sorun..." />
                <button class="chatbot-btn send" onclick="sendChatMessage()">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(chatbotUI);
    
    // Enter tuşuna basıldığında mesaj gönderme
    document.getElementById('chatbot-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

// Sayfa yüklendiğinde Chatbot UI'yi oluştur
document.addEventListener('DOMContentLoaded', function() {
    createChatbotUIIfNeeded();
});

// Dışa aktarılacak fonksiyonlar
export default {
    toggleChatbot,
    sendChatMessage,
    createChatbotUIIfNeeded
};