/**
 * production.js
 * Üretim planlaması ve takip işlevleri
 */

// Üretim planlarını yükle
function loadProductionPlans() {
    // API'den üretim planı verilerini al ve tabloya doldur
    console.log('Üretim planları yükleniyor...');
    
    // Gerçek uygulamada burada API'den veriler alınıp tabloya doldurulur
}

// Yeni üretim planı oluştur
function createProductionPlan(planData) {
    // API'ye üretim planı verilerini gönder
    console.log('Yeni üretim planı oluşturuluyor:', planData);
    
    // Gerçek uygulamada API'ye plan kaydedilir
    // Başarılı olursa:
    alert('Üretim planı başarıyla oluşturuldu.');
    
    // Plan listesini yenile
    loadProductionPlans();
}

// Üretim planı durumunu güncelle
function updateProductionStatus(planId, status) {
    // API'ye plan durumu güncelleme isteği gönder
    console.log(`Üretim durumu güncelleniyor: ${planId}, Yeni durum: ${status}`);
    
    // Gerçek uygulamada API'ye güncelleme isteği gönderilir
}

// Üretim planı detaylarını kaydet
function savePlanDetails(planId) {
    // Modal içindeki form verilerini al
    console.log(`Üretim planı detayları kaydediliyor: ${planId}`);
    
    // Gerçek uygulamada API'ye güncelleme isteği gönderilir
    alert('Değişiklikler kaydedildi');
}

// Aktivite ekle
function addProductionActivity(planId, activityData) {
    // API'ye aktivite verilerini gönder
    console.log(`Üretim aktivitesi ekleniyor: ${planId}`, activityData);
    
    // Gerçek uygulamada API'ye aktivite kaydedilir
    
    // Aktivite listesini yenile
    loadProductionActivities(planId);
}

// Aktiviteleri yükle
function loadProductionActivities(planId) {
    // API'den aktivite verilerini al ve listeye doldur
    console.log(`Üretim aktiviteleri yükleniyor: ${planId}`);
    
    // Gerçek uygulamada burada API'den veriler alınıp listeye doldurulur
}

// Üretim optimizasyon önerisi uygula
function applyOptimizationSuggestion() {
    console.log('Optimizasyon önerisi uygulanıyor...');
    
    // Gerçek uygulamada üretim planları güncellenir
    alert('Optimizasyon planı başarıyla uygulandı. Üretim planları güncellendi.');
}

// Üretim takvimi görünümünü aç
function showProductionCalendar() {
    console.log('Üretim takvimi görünümü açılıyor...');
    
    // Gerçek uygulamada takvim görünümü oluşturulur
}

// Üretim verilerini yükler
async function loadProductionData() {
    try {
        document.getElementById('production-data-container').innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-pulse"></i> Üretim verileri yükleniyor...
            </div>
        `;
        
        // Üretimde olan siparişleri getir
        const activeOrders = await fetchActiveProductionOrders();
        
        if (!activeOrders || activeOrders.length === 0) {
            document.getElementById('production-data-container').innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Aktif üretim bulunmamaktadır.
                </div>
            `;
            return;
        }
        
        // Sipariş durumlarını kontrol et ve detayları göster
        let productionDataHTML = `
            <div class="production-orders-container">
                <h3>Aktif Üretim Siparişleri</h3>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Sipariş No</th>
                                <th>Müşteri</th>
                                <th>Hücre Tipi</th>
                                <th>Miktar</th>
                                <th>Teslim Tarihi</th>
                                <th>Üretim Durumu</th>
                                <th>İlerleme</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        activeOrders.forEach(order => {
            // Teslim tarihine kalan gün hesabı
            const deliveryDate = order.deliveryDate.toDate();
            const today = new Date();
            const daysLeft = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
            
            // Gecikme durumuna göre renk sınıfı
            let dateClass = "text-success";
            if (daysLeft < 0) {
                dateClass = "text-danger";
            } else if (daysLeft <= 7) {
                dateClass = "text-warning";
            }
            
            // İlerleme çubuğu rengi
            let progressBarColor = "bg-primary";
            if (order.progress < 25) {
                progressBarColor = "bg-danger";
            } else if (order.progress < 50) {
                progressBarColor = "bg-warning";
            } else if (order.progress >= 75) {
                progressBarColor = "bg-success";
            }
            
            // Durum etiketi
            let statusBadge = "";
            switch (order.currentStage) {
                case "Planlama":
                    statusBadge = '<span class="badge bg-info">Planlama</span>';
                    break;
                case "Malzeme Tedarik":
                    statusBadge = '<span class="badge bg-primary">Malzeme Tedarik</span>';
                    break;
                case "Mekanik Üretim":
                    statusBadge = '<span class="badge bg-secondary">Mekanik Üretim</span>';
                    break;
                case "Montaj":
                    statusBadge = '<span class="badge bg-warning">Montaj</span>';
                    break;
                case "Kablaj":
                    statusBadge = '<span class="badge bg-dark">Kablaj</span>';
                    break;
                case "Test":
                    statusBadge = '<span class="badge bg-success">Test</span>';
                    break;
                default:
                    statusBadge = `<span class="badge bg-secondary">${order.currentStage}</span>`;
            }
            
            productionDataHTML += `
                <tr id="production-order-${order.id}">
                    <td>${order.orderNo}</td>
                    <td>${order.customer}</td>
                    <td>${order.cellType}</td>
                    <td>${order.quantity}</td>
                    <td class="${dateClass}">
                        ${deliveryDate.toLocaleDateString('tr-TR')}
                        <br><small>${daysLeft > 0 ? daysLeft + ' gün kaldı' : Math.abs(daysLeft) + ' gün gecikti'}</small>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="progress">
                            <div class="progress-bar ${progressBarColor}" role="progressbar" 
                                style="width: ${order.progress}%" 
                                aria-valuenow="${order.progress}" aria-valuemin="0" aria-valuemax="100">
                                ${order.progress}%
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-primary" onclick="showProductionDetails('${order.id}')">
                                <i class="fas fa-eye"></i> Detay
                            </button>
                            <button class="btn btn-warning" onclick="updateProductionStatus('${order.id}')">
                                <i class="fas fa-edit"></i> Güncelle
                            </button>
                        </div>
                    </td>
                </tr>
                
                <!-- Detay satırı (gizli) -->
                <tr id="production-details-${order.id}" class="production-details-row" style="display: none;">
                    <td colspan="8">
                        <div class="production-order-details">
                            <div class="row">
                                <div class="col-md-4">
                                    <h5>Sipariş Detayları</h5>
                                    <p><strong>Sipariş No:</strong> ${order.orderNo}</p>
                                    <p><strong>Müşteri:</strong> ${order.customer}</p>
                                    <p><strong>Hücre Tipi:</strong> ${order.cellType}</p>
                                    <p><strong>Miktar:</strong> ${order.quantity}</p>
                                    <p><strong>Teslim Tarihi:</strong> ${deliveryDate.toLocaleDateString('tr-TR')}</p>
                                    ${order.contactPerson ? `<p><strong>İlgili Kişi:</strong> ${order.contactPerson}</p>` : ''}
                                </div>
                                <div class="col-md-4">
                                    <h5>Üretim Süreci</h5>
                                    <div class="production-stages">
                                        ${generateProductionStagesHTML(order)}
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <h5>Malzeme Durumu</h5>
                                    <div id="materials-status-${order.id}">
                                        <p><i class="fas fa-spinner fa-spin"></i> Malzeme bilgileri yükleniyor...</p>
                                    </div>
                                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadOrderMaterials('${order.id}')">
                                        <i class="fas fa-boxes"></i> Malzemeleri Göster
                                    </button>
                                </div>
                            </div>
                            ${order.notes ? `
                            <div class="row mt-3">
                                <div class="col-12">
                                    <h5>Notlar</h5>
                                    <p>${order.notes}</p>
                                </div>
                            </div>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        productionDataHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.getElementById('production-data-container').innerHTML = productionDataHTML;
    } catch (error) {
        console.error('Üretim verileri yüklenirken hata:', error);
        document.getElementById('production-data-container').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> Üretim verileri yüklenemedi: ${error.message}
            </div>
        `;
    }
}

/**
 * Üretimdeki siparişleri getirir
 * @returns {Promise<Array>} Sipariş dizisi
 */
async function fetchActiveProductionOrders() {
    try {
        // Firestore'dan aktif üretimdeki siparişleri getir
        const ordersRef = firebase.firestore().collection('orders');
        const snapshot = await ordersRef
            .where('status', 'in', ['planning', 'production', 'waiting'])
            .orderBy('deliveryDate', 'asc')
            .get();
        
        if (snapshot.empty) {
            return [];
        }
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Aktif siparişler getirilirken hata:', error);
        throw error;
    }
}

/**
 * Üretim aşamalarını HTML olarak oluşturur
 * @param {Object} order - Sipariş verisi
 * @returns {string} HTML içeriği
 */
function generateProductionStagesHTML(order) {
    // Üretim aşamaları ve durumları
    const stages = [
        { name: "Planlama", id: "planning" },
        { name: "Malzeme Tedarik", id: "material" },
        { name: "Mekanik Üretim", id: "mechanical" },
        { name: "Montaj", id: "assembly" },
        { name: "Kablaj", id: "wiring" },
        { name: "Test", id: "testing" }
    ];
    
    // Mevcut aşama indeksi
    const currentStageIndex = stages.findIndex(stage => stage.name === order.currentStage);
    
    let stagesHTML = '<ul class="production-stages-list">';
    
    stages.forEach((stage, index) => {
        let stageClass = '';
        let stageIcon = '';
        
        if (index < currentStageIndex) {
            // Tamamlanmış aşama
            stageClass = 'completed-stage';
            stageIcon = '<i class="fas fa-check-circle text-success"></i>';
        } else if (index === currentStageIndex) {
            // Mevcut aşama
            stageClass = 'current-stage';
            stageIcon = '<i class="fas fa-spinner fa-spin text-primary"></i>';
        } else {
            // Henüz başlanmamış aşama
            stageClass = 'pending-stage';
            stageIcon = '<i class="far fa-circle text-muted"></i>';
        }
        
        stagesHTML += `
            <li class="${stageClass}">
                ${stageIcon} ${stage.name}
            </li>
        `;
    });
    
    stagesHTML += '</ul>';
    return stagesHTML;
}

/**
 * Sipariş detaylarını gösterir/gizler
 * @param {string} orderId - Sipariş ID
 */
function showProductionDetails(orderId) {
    const detailsRow = document.getElementById(`production-details-${orderId}`);
    
    if (detailsRow.style.display === 'none' || detailsRow.style.display === '') {
        // Tüm açık detay satırlarını kapat
        document.querySelectorAll('.production-details-row').forEach(row => {
            row.style.display = 'none';
        });
        
        // Bu satırı aç
        detailsRow.style.display = 'table-row';
        
        // Malzeme durumunu yükle
        loadOrderMaterials(orderId);
    } else {
        // Bu satırı kapat
        detailsRow.style.display = 'none';
    }
}

/**
 * Sipariş malzemelerini yükler
 * @param {string} orderId - Sipariş ID
 */
async function loadOrderMaterials(orderId) {
    try {
        const materialsContainer = document.getElementById(`materials-status-${orderId}`);
        materialsContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Malzeme bilgileri yükleniyor...</p>';
        
        // Firestore'dan sipariş malzemelerini getir
        const materialsRef = firebase.firestore().collection('materials');
        const snapshot = await materialsRef
            .where('orderId', '==', orderId)
            .get();
        
        if (snapshot.empty) {
            materialsContainer.innerHTML = '<p>Bu siparişe ait kayıtlı malzeme bulunamadı.</p>';
            return;
        }
        
        // Malzeme listesini oluştur
        let materialsHTML = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Kod</th>
                            <th>Ad</th>
                            <th>Miktar</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        snapshot.docs.forEach(doc => {
            const material = doc.data();
            const statusBadge = material.inStock 
                ? '<span class="badge bg-success">Stokta</span>' 
                : '<span class="badge bg-danger">Eksik</span>';
            
            materialsHTML += `
                <tr>
                    <td>${material.code}</td>
                    <td>${material.name}</td>
                    <td>${material.quantity}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });
        
        materialsHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        materialsContainer.innerHTML = materialsHTML;
    } catch (error) {
        console.error('Malzeme bilgileri yüklenirken hata:', error);
        document.getElementById(`materials-status-${orderId}`).innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> Malzeme bilgileri yüklenemedi: ${error.message}
            </div>
        `;
    }
}

/**
 * Üretim durumunu güncelleme formunu gösterir
 * @param {string} orderId - Sipariş ID
 */
function updateProductionStatus(orderId) {
    // Modal içeriği
    const modalContent = `
        <div class="modal fade" id="update-production-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Üretim Durumunu Güncelle</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Kapat"></button>
                    </div>
                    <div class="modal-body">
                        <form id="update-production-form">
                            <div class="mb-3">
                                <label for="current-stage" class="form-label">Mevcut Aşama</label>
                                <select class="form-select" id="current-stage" required>
                                    <option value="Planlama">Planlama</option>
                                    <option value="Malzeme Tedarik">Malzeme Tedarik</option>
                                    <option value="Mekanik Üretim">Mekanik Üretim</option>
                                    <option value="Montaj">Montaj</option>
                                    <option value="Kablaj">Kablaj</option>
                                    <option value="Test">Test</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="progress" class="form-label">İlerleme (%)</label>
                                <input type="range" class="form-range" id="progress" min="0" max="100" step="5" value="0" 
                                    oninput="document.getElementById('progress-value').textContent = this.value + '%'">
                                <div class="text-center" id="progress-value">0%</div>
                            </div>
                            <div class="mb-3">
                                <label for="status-notes" class="form-label">Notlar</label>
                                <textarea class="form-control" id="status-notes" rows="3"></textarea>
                            </div>
                            <div id="update-status"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="saveProductionStatus('${orderId}')">
                            <i class="fas fa-save"></i> Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Modal elementini ekle ve göster
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalContent;
    document.body.appendChild(modalContainer);
    
    // Mevcut sipariş bilgilerini getir ve formu doldur
    getOrderDetails(orderId).then(order => {
        if (order) {
            document.getElementById('current-stage').value = order.currentStage || 'Planlama';
            document.getElementById('progress').value = order.progress || 0;
            document.getElementById('progress-value').textContent = (order.progress || 0) + '%';
            document.getElementById('status-notes').value = order.notes || '';
        }
    });
    
    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('update-production-modal'));
    modal.show();
    
    // Modal kapandığında içeriği temizle
    document.getElementById('update-production-modal').addEventListener('hidden.bs.modal', function () {
        document.body.removeChild(modalContainer);
    });
}

/**
 * Sipariş detaylarını getirir
 * @param {string} orderId - Sipariş ID
 * @returns {Promise<Object>} Sipariş detayları
 */
async function getOrderDetails(orderId) {
    try {
        const doc = await firebase.firestore().collection('orders').doc(orderId).get();
        
        if (!doc.exists) {
            console.error(`${orderId} ID'li sipariş bulunamadı`);
            return null;
        }
        
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error(`Sipariş detayları getirilirken hata: ${error.message}`);
        return null;
    }
}

/**
 * Üretim durumunu kaydeder
 * @param {string} orderId - Sipariş ID
 */
async function saveProductionStatus(orderId) {
    try {
        const updateStatus = document.getElementById('update-status');
        updateStatus.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin"></i> Güncelleniyor...
            </div>
        `;
        
        // Form verilerini topla
        const currentStage = document.getElementById('current-stage').value;
        const progress = parseInt(document.getElementById('progress').value);
        const notes = document.getElementById('status-notes').value;
        
        // Geçerlilik kontrolü
        if (!currentStage) {
            updateStatus.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> Lütfen mevcut aşamayı seçin.
                </div>
            `;
            return;
        }
        
        // Sipariş verisini güncelle
        const orderRef = firebase.firestore().collection('orders').doc(orderId);
        
        // Güncellenecek veriler
        const updateData = {
            currentStage: currentStage,
            progress: progress,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Eğer not girildiyse ekle
        if (notes && notes.trim() !== '') {
            updateData.notes = notes;
        }
        
        // İlerleme %100 ise ve Test aşamasındaysa, durumu completed olarak güncelle
        if (progress === 100 && currentStage === 'Test') {
            updateData.status = 'completed';
            updateData.completionDate = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        // Firestore'da güncelle
        await orderRef.update(updateData);
        
        // Üretim aktivitesi olarak kaydet
        await logProductionActivity(orderId, {
            type: 'status_update',
            stage: currentStage,
            progress: progress,
            notes: notes,
            timestamp: new Date()
        });
        
        // Başarılı mesajını göster
        updateStatus.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> Üretim durumu başarıyla güncellendi.
            </div>
        `;
        
        // 1 saniye sonra modalı kapat
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('update-production-modal'));
            if (modal) {
                modal.hide();
                
                // Üretim verilerini yeniden yükle
                loadProductionData();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Üretim durumu güncellenirken hata:', error);
        document.getElementById('update-status').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> Üretim durumu güncellenemedi: ${error.message}
            </div>
        `;
    }
}

/**
 * Üretim aktivitesini kaydeder
 * @param {string} orderId - Sipariş ID
 * @param {Object} activity - Aktivite verisi
 */
async function logProductionActivity(orderId, activity) {
    try {
        await firebase.firestore().collection('productionActivities').add({
            orderId: orderId,
            ...activity,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Aktivite kaydedilirken hata:', error);
    }
}

// Sayfa yüklendiğinde üretim planlarını yükle
document.addEventListener('DOMContentLoaded', function() {
    // Üretim sayfası açıksa
    if (document.getElementById('production-page') && 
        document.getElementById('production-page').classList.contains('active')) {
        loadProductionPlans();
    }
    
    // Optimizasyon butonuna tıklandığında
    const optimizeButton = document.querySelector('.btn:has(.fa-check-circle)');
    if (optimizeButton) {
        optimizeButton.addEventListener('click', applyOptimizationSuggestion);
    }
    
    // Takvim görünümü butonuna tıklandığında
    const calendarButton = document.querySelector('.btn:has(.fa-calendar-alt)');
    if (calendarButton) {
        calendarButton.addEventListener('click', showProductionCalendar);
    }
});