/**
 * ai-analytics.js
 * Yapay zeka analiz işlevleri
 */

import Logger from '../../utils/logger.js';

// Tedarik zinciri risk analizi
async function analyzeSupplyChainRisks() {
    try {
        Logger.info("Tedarik zinciri risk analizi başlatılıyor");
        
        // Firestore'dan malzeme ve sipariş verilerini al
        const materialsRef = firebase.firestore().collection('materials');
        const ordersRef = firebase.firestore().collection('orders');
        
        // Tedarik tarihi geçmiş veya gecikecek malzemeleri bul
        const today = new Date();
        const riskMaterials = [];
        
        const materialsSnapshot = await materialsRef
            .where('inStock', '==', false)
            .get();
            
        for (const doc of materialsSnapshot.docs) {
            const material = doc.data();
            
            if (material.expectedSupplyDate) {
                const supplyDate = new Date(material.expectedSupplyDate.toDate());
                const needDate = material.orderNeedDate ? new Date(material.orderNeedDate.toDate()) : null;
                
                // Risk durumunu belirle
                if (needDate && supplyDate > needDate) {
                    // Kritik risk: Tedarik tarihi ihtiyaç tarihinden sonra
                    riskMaterials.push({
                        id: doc.id,
                        ...material,
                        riskLevel: 'critical',
                        riskReason: 'Tedarik tarihi, ihtiyaç tarihinden sonra'
                    });
                } else if (supplyDate < today) {
                    // Yüksek risk: Tedarik tarihi geçmiş ama hala stokta değil
                    riskMaterials.push({
                        id: doc.id,
                        ...material,
                        riskLevel: 'high',
                        riskReason: 'Tedarik tarihi geçmiş'
                    });
                }
            }
        }
        
        return riskMaterials;
    } catch (error) {
        console.error("Risk analizi hatası:", error);
        throw error;
    }
}

// Üretim optimizasyon önerileri
async function suggestProductionOptimizations() {
    try {
        const ordersRef = firebase.firestore().collection('orders');
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);
        
        // Gelecek ay içinde teslim edilecek siparişleri getir
        const ordersSnapshot = await ordersRef
            .where('deliveryDate', '>', today)
            .where('deliveryDate', '<', nextMonth)
            .where('status', '!=', 'completed')
            .get();
            
        // Benzer ürün tiplerini grupla
        const productTypes = {};
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (!productTypes[order.cellType]) {
                productTypes[order.cellType] = [];
            }
            productTypes[order.cellType].push({
                id: doc.id,
                ...order
            });
        });
        
        // Optimizasyon önerileri oluştur
        const optimizationSuggestions = [];
        
        for (const [type, orders] of Object.entries(productTypes)) {
            if (orders.length > 1) {
                // Bu tipteki ürünler için paralel üretim önerisi
                optimizationSuggestions.push({
                    cellType: type,
                    orders: orders,
                    orderCount: orders.length,
                    suggestion: `${type} tipi ${orders.length} siparişin üretimini birleştirin`,
                    potentialSavings: Math.round(orders.length * 0.8) // Örnek tasarruf hesabı
                });
            }
        }
        
        return optimizationSuggestions;
    } catch (error) {
        console.error("Optimizasyon önerileri hatası:", error);
        throw error;
    }
}

// Gecikme riski olan siparişleri tespit et
async function detectDelayRisks() {
    try {
        const ordersRef = firebase.firestore().collection('orders');
        const materialsRef = firebase.firestore().collection('materials');
        
        // Aktif siparişleri getir (tamamlanmamış)
        const ordersSnapshot = await ordersRef
            .where('status', '!=', 'completed')
            .get();
            
        const delayRisks = [];
        
        for (const doc of ordersSnapshot.docs) {
            const order = doc.data();
            const orderId = doc.id;
            
            // Teslim tarihi
            const deliveryDate = new Date(order.deliveryDate.toDate());
            const today = new Date();
            
            // Kalan gün sayısı
            const daysLeft = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
            
            // Gecikme risk faktörleri
            let riskFactors = [];
            let riskScore = 0;
            
            // Malzeme eksikliği kontrolü
            const materialsSnapshot = await materialsRef
                .where('orderId', '==', orderId)
                .where('inStock', '==', false)
                .get();
                
            const missingMaterialsCount = materialsSnapshot.size;
            
            if (missingMaterialsCount > 0) {
                riskFactors.push(`${missingMaterialsCount} eksik malzeme`);
                riskScore += missingMaterialsCount * 10;
            }
            
            // Üretim aşaması kontrolü
            if (order.status === 'planning' && daysLeft < 20) {
                riskFactors.push('Hala planlama aşamasında');
                riskScore += 30;
            } else if (order.status === 'waiting' && daysLeft < 15) {
                riskFactors.push('Malzeme bekleniyor');
                riskScore += 20;
            }
            
            // Geçmiş sipariş performansı
            if (order.previousDelays && order.previousDelays > 0) {
                riskFactors.push(`Daha önce ${order.previousDelays} kez gecikmiş`);
                riskScore += order.previousDelays * 5;
            }
            
            // Risk seviyesi
            let riskLevel = 'low';
            if (riskScore >= 50) riskLevel = 'high';
            else if (riskScore >= 20) riskLevel = 'medium';
            
            // Eğer risk faktörü varsa ekle
            if (riskFactors.length > 0) {
                delayRisks.push({
                    orderId,
                    orderNo: order.orderNo,
                    customer: order.customer,
                    cellType: order.cellType,
                    deliveryDate,
                    daysLeft,
                    riskFactors,
                    riskScore,
                    riskLevel,
                    status: order.status
                });
            }
        }
        
        // Risk skoruna göre sırala (yüksekten düşüğe)
        delayRisks.sort((a, b) => b.riskScore - a.riskScore);
        
        return delayRisks;
    } catch (error) {
        console.error("Gecikme riski tespiti hatası:", error);
        throw error;
    }
}

// Malzeme tüketim analizi ve tahmin
async function analyzeMaterialConsumption() {
    try {
        // Son 6 ayın malzeme tüketimini getir
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        
        const ordersRef = firebase.firestore().collection('orders');
        const materialsRef = firebase.firestore().collection('materials');
        
        // Tamamlanan siparişleri getir
        const ordersSnapshot = await ordersRef
            .where('status', '==', 'completed')
            .where('completionDate', '>=', sixMonthsAgo)
            .get();
            
        // Malzeme tüketim analizi
        const materialConsumption = {};
        
        // Her sipariş için malzeme kullanımını hesapla
        for (const doc of ordersSnapshot.docs) {
            const order = doc.data();
            const orderId = doc.id;
            
            // Sipariş malzemelerini getir
            const materialsSnapshot = await materialsRef
                .where('orderId', '==', orderId)
                .get();
                
            materialsSnapshot.forEach(materialDoc => {
                const material = materialDoc.data();
                const materialCode = material.code;
                
                if (!materialConsumption[materialCode]) {
                    materialConsumption[materialCode] = {
                        code: materialCode,
                        name: material.name,
                        totalQuantity: 0,
                        usageByMonth: {},
                        usageByHucreType: {}
                    };
                }
                
                // Toplam kullanım
                materialConsumption[materialCode].totalQuantity += material.quantity;
                
                // Aylık kullanım
                const month = new Date(order.completionDate.toDate()).toISOString().slice(0, 7); // YYYY-MM formatı
                if (!materialConsumption[materialCode].usageByMonth[month]) {
                    materialConsumption[materialCode].usageByMonth[month] = 0;
                }
                materialConsumption[materialCode].usageByMonth[month] += material.quantity;
                
                // Hücre tipine göre kullanım
                const cellType = order.cellType;
                if (!materialConsumption[materialCode].usageByHucreType[cellType]) {
                    materialConsumption[materialCode].usageByHucreType[cellType] = 0;
                }
                materialConsumption[materialCode].usageByHucreType[cellType] += material.quantity;
            });
        }
        
        // Malzeme tüketim tahminini hesapla
        for (const code in materialConsumption) {
            const material = materialConsumption[code];
            
            // Aylık ortalama kullanım
            const monthlyUsage = Object.values(material.usageByMonth);
            const avgMonthlyUsage = monthlyUsage.reduce((sum, qty) => sum + qty, 0) / monthlyUsage.length;
            
            // Sonraki 3 aylık tahmini kullanım
            material.forecastNextThreeMonths = Math.ceil(avgMonthlyUsage * 3);
            
            // Trend analizi (son 3 ay artan mı azalan mı)
            const monthKeys = Object.keys(material.usageByMonth).sort();
            if (monthKeys.length >= 3) {
                const lastThreeMonths = monthKeys.slice(-3);
                const firstMonthUsage = material.usageByMonth[lastThreeMonths[0]];
                const lastMonthUsage = material.usageByMonth[lastThreeMonths[2]];
                
                if (lastMonthUsage > firstMonthUsage * 1.1) {
                    material.trend = 'increasing';
                } else if (lastMonthUsage < firstMonthUsage * 0.9) {
                    material.trend = 'decreasing';
                } else {
                    material.trend = 'stable';
                }
            } else {
                material.trend = 'insufficient_data';
            }
        }
        
        return Object.values(materialConsumption);
    } catch (error) {
        console.error("Malzeme tüketim analizi hatası:", error);
        throw error;
    }
}

// Teslim tarihi tahmini
function predictDeliveryDate(cellType, quantity) {
    // Hücre tipine göre ortalama üretim süresi (gün olarak)
    const productionTimes = {
        'RM 36 LB': 15,
        'RM 36 CB': 18,
        'RM 36 FL': 20,
        'default': 20
    };
    
    // Tedarik süresi (malzeme hazırlığı için)
    const supplyTime = 10;
    
    // Test ve kalite kontrol süresi
    const testTime = 5;
    
    // Toplam süre hesabı
    const baseTime = (productionTimes[cellType] || productionTimes['default']);
    const quantityFactor = Math.log2(quantity + 1) * 5; // Logaritmik ölçeklendirme
    
    // Toplam gün
    const totalDays = supplyTime + baseTime + quantityFactor + testTime;
    
    // Bugünden itibaren tahmini teslim tarihi
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + Math.ceil(totalDays));
    
    return {
        estimatedDays: Math.ceil(totalDays),
        supplyPeriod: supplyTime,
        productionPeriod: baseTime + quantityFactor,
        testPeriod: testTime,
        estimatedDeliveryDate: deliveryDate
    };
}

// Toplam üretim süresi makine öğrenmesi tahmini
async function predictProductionTimeML(orderDetails) {
    try {
        // Eğer makine öğrenmesi modeli yüklüyse onu kullan
        if (window.AIIntegrationModule?.machineLearning?.regressionModel) {
            const model = window.AIIntegrationModule.machineLearning.regressionModel;
            
            // Veriyi model formatına dönüştür
            const inputData = window.AIIntegrationModule.preprocessInput(orderDetails);
            
            // Tahmin yap
            const prediction = await model.predict(tf.tensor2d([inputData]));
            const predictedTime = prediction.dataSync()[0];
            
            return {
                estimatedDays: Math.ceil(predictedTime),
                confidence: 0.85, // Tahmine güven oranı
                method: 'machine_learning'
            };
        } else {
            // Model yoksa geleneksel hesaplama yap
            return predictDeliveryDate(orderDetails.cellType, orderDetails.cellCount);
        }
    } catch (error) {
        console.error("Makine öğrenmesi tahmini hatası:", error);
        // Hata durumunda geleneksel hesaplamaya geri dön
        return predictDeliveryDate(orderDetails.cellType, orderDetails.cellCount);
    }
}

// Üretim verimliliği analizi
async function analyzeProductionEfficiency() {
    try {
        const ordersRef = firebase.firestore().collection('orders');
        const productionRef = firebase.firestore().collection('production');
        
        // Son 3 aydaki tamamlanmış siparişleri getir
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const ordersSnapshot = await ordersRef
            .where('status', '==', 'completed')
            .where('completionDate', '>=', threeMonthsAgo)
            .get();
            
        // Verimlilik metrikleri
        const efficiencyData = {
            totalOrders: 0,
            totalCells: 0,
            avgProductionTime: 0,
            departmentEfficiency: {
                design: { plannedHours: 0, actualHours: 0, efficiency: 0 },
                assembly: { plannedHours: 0, actualHours: 0, efficiency: 0 },
                wiring: { plannedHours: 0, actualHours: 0, efficiency: 0 },
                testing: { plannedHours: 0, actualHours: 0, efficiency: 0 }
            },
            cellTypeEfficiency: {},
            bottlenecks: [],
            improvementSuggestions: []
        };
        
        let totalProductionDays = 0;
        
        // Her sipariş için üretim verilerini topla
        for (const doc of ordersSnapshot.docs) {
            const order = doc.data();
            const orderId = doc.id;
            
            efficiencyData.totalOrders++;
            efficiencyData.totalCells += order.cellCount || 1;
            
            // Hücre tipini kaydet
            const cellType = order.cellType;
            if (!efficiencyData.cellTypeEfficiency[cellType]) {
                efficiencyData.cellTypeEfficiency[cellType] = {
                    totalOrders: 0,
                    totalCells: 0,
                    avgProductionTime: 0
                };
            }
            
            efficiencyData.cellTypeEfficiency[cellType].totalOrders++;
            efficiencyData.cellTypeEfficiency[cellType].totalCells += order.cellCount || 1;
            
            // Üretim verilerini getir
            const productionSnapshot = await productionRef
                .where('orderId', '==', orderId)
                .get();
                
            if (!productionSnapshot.empty) {
                const productionData = productionSnapshot.docs[0].data();
                
                // Üretim süresi hesaplama
                const startDate = new Date(productionData.startDate.toDate());
                const endDate = new Date(productionData.endDate.toDate());
                const productionDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                
                totalProductionDays += productionDays;
                efficiencyData.cellTypeEfficiency[cellType].avgProductionTime += productionDays;
                
                // Departman verimlilik hesaplamaları
                for (const dept of Object.keys(efficiencyData.departmentEfficiency)) {
                    if (productionData.departments && productionData.departments[dept]) {
                        const deptData = productionData.departments[dept];
                        
                        efficiencyData.departmentEfficiency[dept].plannedHours += deptData.plannedHours || 0;
                        efficiencyData.departmentEfficiency[dept].actualHours += deptData.actualHours || 0;
                    }
                }
                
                // Darboğazları tespit et
                for (const dept of Object.keys(efficiencyData.departmentEfficiency)) {
                    if (productionData.departments && productionData.departments[dept]) {
                        const deptData = productionData.departments[dept];
                        
                        if (deptData.actualHours > deptData.plannedHours * 1.2) { // %20 üzerinde sapma
                            // Bu departmanda gecikme var
                            const existingBottleneck = efficiencyData.bottlenecks.find(b => b.department === dept);
                            
                            if (existingBottleneck) {
                                existingBottleneck.occurrences++;
                                existingBottleneck.totalDelay += (deptData.actualHours - deptData.plannedHours);
                            } else {
                                efficiencyData.bottlenecks.push({
                                    department: dept,
                                    occurrences: 1,
                                    totalDelay: (deptData.actualHours - deptData.plannedHours),
                                    avgDelayPercentage: ((deptData.actualHours / deptData.plannedHours) - 1) * 100
                                });
                            }
                        }
                    }
                }
            }
        }
        
        // Ortalama üretim süresi
        if (efficiencyData.totalOrders > 0) {
            efficiencyData.avgProductionTime = totalProductionDays / efficiencyData.totalOrders;
        }
        
        // Hücre tipi ortalama üretim süresi
        for (const type in efficiencyData.cellTypeEfficiency) {
            const typeData = efficiencyData.cellTypeEfficiency[type];
            if (typeData.totalOrders > 0) {
                typeData.avgProductionTime = typeData.avgProductionTime / typeData.totalOrders;
            }
        }
        
        // Departman verimliliği
        for (const dept in efficiencyData.departmentEfficiency) {
            const deptData = efficiencyData.departmentEfficiency[dept];
            if (deptData.plannedHours > 0) {
                deptData.efficiency = deptData.plannedHours / deptData.actualHours;
            }
        }
        
        // Darboğazları sırala
        efficiencyData.bottlenecks.sort((a, b) => b.occurrences - a.occurrences);
        
        // İyileştirme önerileri
        if (efficiencyData.bottlenecks.length > 0) {
            const worstBottleneck = efficiencyData.bottlenecks[0];
            
            efficiencyData.improvementSuggestions.push({
                area: worstBottleneck.department,
                suggestion: `${worstBottleneck.department} departmanında süreç optimizasyonu yapılmalı. Ortalama %${Math.round(worstBottleneck.avgDelayPercentage)} gecikme var.`,
                potentialSavings: Math.round(worstBottleneck.totalDelay / efficiencyData.totalOrders) // Sipariş başına tasarruf saati
            });
        }
        
        // Düşük verimli departmanlar
        const lowEffDepts = Object.entries(efficiencyData.departmentEfficiency)
            .filter(([dept, data]) => data.efficiency < 0.85 && data.actualHours > 0)
            .sort(([, a], [, b]) => a.efficiency - b.efficiency);
            
        if (lowEffDepts.length > 0) {
            const [deptName, deptData] = lowEffDepts[0];
            
            efficiencyData.improvementSuggestions.push({
                area: deptName,
                suggestion: `${deptName} departmanında verimlilik artırılmalı. Mevcut verimlilik: %${Math.round(deptData.efficiency * 100)}`,
                potentialImprovement: Math.round((1 - deptData.efficiency) * 100) // Potansiyel iyileştirme yüzdesi
            });
        }
        
        return efficiencyData;
    } catch (error) {
        console.error("Üretim verimlilik analizi hatası:", error);
        throw error;
    }
}

// Yapay zeka önerilerini göster
async function displayAIInsights(containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> Analizler yükleniyor...</div>';
        
        // Tedarik zinciri riskleri
        const supplyRisks = await analyzeSupplyChainRisks();
        
        // Üretim optimizasyonları
        const optimizations = await suggestProductionOptimizations();
        
        // Gecikme riskleri
        const delayRisks = await detectDelayRisks();
        
        // İçeriği hazırla
        let html = '';
        
        // Kritik tedarik riskleri
        const criticalRisks = supplyRisks.filter(risk => risk.riskLevel === 'critical');
        if (criticalRisks.length > 0) {
            html += `
                <div class="info-box danger">
                    <div class="info-box-title">Kritik Tedarik Uyarısı</div>
                    <div class="info-box-content">
                        <p>${criticalRisks[0].orderName || 'Sipariş'} için ${criticalRisks[0].name} malzemesinin tedarikinde gecikme riski yüksek.
                        Tedarikçiden gelen bilgilere göre, planlanan teslimat ${new Date(criticalRisks[0].expectedSupplyDate.toDate()).toLocaleDateString('tr-TR')} tarihinde, 
                        ancak üretim planında malzemelerin ${new Date(criticalRisks[0].orderNeedDate.toDate()).toLocaleDateString('tr-TR')} tarihinde fabrikada olması gerekiyor.</p>
                        
                        <p><strong>Öneri:</strong> Alternatif tedarikçilerle iletişime geçin veya üretim planını revize edin.</p>
                        
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button class="btn btn-warning btn-sm" onclick="contactSupplier('${criticalRisks[0].supplierId}')">
                                <i class="fas fa-phone-alt"></i>
                                <span>Tedarikçiyi Ara</span>
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="reviseProductionPlan('${criticalRisks[0].orderId}')">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Planı Düzenle</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Gecikme riskleri
        const highDelayRisks = delayRisks.filter(risk => risk.riskLevel === 'high');
        if (highDelayRisks.length > 0) {
            const risk = highDelayRisks[0];
            html += `
                <div class="info-box warning">
                    <div class="info-box-title">Gecikme Riski Tespit Edildi</div>
                    <div class="info-box-content">
                        <p>${risk.customer} için ${risk.orderNo} numaralı ${risk.cellType} tipi sipariş için yüksek gecikme riski tespit edildi.</p>
                        <p><strong>Risk Faktörleri:</strong> ${risk.riskFactors.join(', ')}</p>
                        <p><strong>Teslim Tarihi:</strong> ${risk.deliveryDate.toLocaleDateString('tr-TR')} (${risk.daysLeft} gün kaldı)</p>
                        
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button class="btn btn-primary btn-sm" onclick="showOrderDetail('${risk.orderId}')">
                                <i class="fas fa-eye"></i>
                                <span>Sipariş Detayı</span>
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="prioritizeOrder('${risk.orderId}')">
                                <i class="fas fa-arrow-up"></i>
                                <span>Öncelik Ver</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Optimizasyon önerileri
        if (optimizations.length > 0) {
            html += `
                <div class="info-box">
                    <div class="info-box-title">Üretim Optimizasyonu</div>
                    <div class="info-box-content">
                        <p>${optimizations[0].cellType} tipinde ${optimizations[0].orderCount} farklı sipariş için benzer üretim adımlarını birleştirerek
                        yaklaşık ${optimizations[0].potentialSavings} iş günü tasarruf sağlayabilirsiniz.</p>
                        
                        <button class="btn btn-primary btn-sm" onclick="applyOptimizationPlan()">
                            <i class="fas fa-check-circle"></i>
                            <span>Optimizasyon Planını Uygula</span>
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Verimlilik analizi özeti
        try {
            const efficiencyData = await analyzeProductionEfficiency();
            
            if (efficiencyData && efficiencyData.improvementSuggestions.length > 0) {
                const suggestion = efficiencyData.improvementSuggestions[0];
                
                html += `
                    <div class="info-box info">
                        <div class="info-box-title">Verimlilik İyileştirme Önerisi</div>
                        <div class="info-box-content">
                            <p>${suggestion.suggestion}</p>
                            <p><strong>Analiz:</strong> Son 3 ayda ${efficiencyData.totalOrders} sipariş analiz edildi. 
                            Ortalama üretim süresi: ${efficiencyData.avgProductionTime.toFixed(1)} gün.</p>
                            
                            <button class="btn btn-info btn-sm" onclick="showEfficiencyReport()">
                                <i class="fas fa-chart-line"></i>
                                <span>Detaylı Raporu Gör</span>
                            </button>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Verimlilik analizi gösterme hatası:", error);
        }
        
        // Analizleri göster
        container.innerHTML = html || '<div class="info-box info">Şu anda gösterilecek yapay zeka önerisi bulunmuyor.</div>';
    } catch (error) {
        console.error("AI analizleri gösterme hatası:", error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="error-box">Analizler yüklenirken hata oluştu: ${error.message}</div>`;
        }
    }
}

// Dışa aktarılacak fonksiyonlar
export default {
    analyzeSupplyChainRisks,
    suggestProductionOptimizations,
    detectDelayRisks,
    analyzeMaterialConsumption,
    predictDeliveryDate,
    predictProductionTimeML,
    analyzeProductionEfficiency,
    displayAIInsights
};