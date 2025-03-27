/**
 * orders.js
 * Sipariş yönetimi işlevleri
 */

// Sipariş listesini yükle
async function loadOrders() {
    try {
        // Loading göster
        const tableBody = document.querySelector('#orders-table tbody');
        if (!tableBody) {
            console.error("Sipariş tablosu elementi bulunamadı");
            return;
        }
        
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Yükleniyor...</td></tr>';
        
        // Siparişleri getir (Firebase'den)
        const ordersRef = firebase.firestore().collection('orders');
        const snapshot = await ordersRef.orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Sipariş bulunamadı</td></tr>';
            return;
        }

        // Siparişleri döngüyle doldur
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Tabloyu güncelle
        updateOrdersTable(orders);
    } catch (error) {
        console.error("Siparişleri yükleme hatası:", error);
        const tableBody = document.querySelector('#orders-table tbody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Hata: ${error.message}</td></tr>`;
        }
    }
}

// Sipariş tablosunu güncelle
function updateOrdersTable(orders) {
    const tableBody = document.querySelector('#orders-table tbody');
    
    if (!tableBody) {
        console.error("Sipariş tablosu elementi bulunamadı");
        return;
    }
    
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Sipariş bulunamadı</td></tr>';
        return;
    }
    
    let html = '';
    
    orders.forEach(order => {
        const orderDate = order.orderDate ? new Date(order.orderDate.toDate()).toLocaleDateString('tr-TR') : '-';
        const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate.toDate()).toLocaleDateString('tr-TR') : '-';
        
        let statusClass = '';
        switch (order.status) {
            case 'waiting': statusClass = 'badge-warning'; break;
            case 'production': statusClass = 'badge-info'; break;
            case 'ready': statusClass = 'badge-success'; break;
            case 'planning': statusClass = 'badge-secondary'; break;
            default: statusClass = 'badge-info';
        }
        
        let statusText = '';
        switch (order.status) {
            case 'waiting': statusText = 'Malzeme Bekleniyor'; break;
            case 'production': statusText = 'Üretimde'; break;
            case 'ready': statusText = 'Malzeme Hazır'; break;
            case 'planning': statusText = 'Planlama'; break;
            default: statusText = 'Bilinmiyor';
        }
        
        let rowClass = '';
        if (order.hasMaterialIssue) rowClass = 'danger';
        else if (order.hasWarning) rowClass = 'warning';
        
        html += `
            <tr onclick="showOrderDetail('${order.id}')" class="${rowClass}">
                <td>${order.orderNo || ''}</td>
                <td>${order.customer || ''}</td>
                <td>${order.cellType || ''}</td>
                <td>${orderDate}</td>
                <td>${deliveryDate}</td>
                <td>${order.cellCount || 0}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); showOrderDetail('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); editOrder('${order.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Yeni sipariş oluştur
async function createOrder(orderData) {
    try {
        // Firestore referansını al
        const ordersRef = firebase.firestore().collection('orders');
        
        // Tarih alanlarını uygun formata dönüştür
        if (orderData.orderDate) {
            orderData.orderDate = firebase.firestore.Timestamp.fromDate(new Date(orderData.orderDate));
        }
        
        if (orderData.deliveryDate) {
            orderData.deliveryDate = firebase.firestore.Timestamp.fromDate(new Date(orderData.deliveryDate));
        }
        
        // Timestamp alanlarını ekle
        orderData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        orderData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Kullanıcı bilgisini ekle
        const user = firebase.auth().currentUser;
        if (user) {
            orderData.createdBy = user.uid;
        }
        
        // Siparişi veritabanına ekle
        const docRef = await ordersRef.add(orderData);
        
        // Oluşturulan siparişin ID'si ile işlemler yap
        console.log("Sipariş başarıyla oluşturuldu. ID:", docRef.id);
        
        // Modalı kapat
        closeModal('create-order-modal');
        
        // Sipariş listesini yenile
        loadOrders();
        
        alert('Sipariş başarıyla oluşturuldu.');
        return docRef.id;
    } catch (error) {
        console.error("Sipariş oluşturma hatası:", error);
        alert('Sipariş oluşturma başarısız: ' + error.message);
        throw error;
    }
}

// Sipariş detaylarını göster
async function showOrderDetailData(orderId) {
    try {
        // Sipariş detayını veritabanından getir
        const orderRef = firebase.firestore().collection('orders').doc(orderId);
        const doc = await orderRef.get();
        
        if (!doc.exists) {
            alert('Sipariş bulunamadı');
            return;
        }
        
        const order = {
            id: doc.id,
            ...doc.data()
        };
        
        // Başlığı güncelle
        document.querySelector('#order-detail-modal .modal-title').textContent = `Sipariş Detayı: ${order.orderNo || order.id} (${order.customer || ''} - ${order.cellType || ''})`;
        
        // Formları doldur
        document.querySelector('#order-general input[name="orderNo"]').value = order.orderNo || '';
        document.querySelector('#order-general input[name="customer"]').value = order.customer || '';
        document.querySelector('#order-general input[name="cellType"]').value = order.cellType || '';
        document.querySelector('#order-general input[name="cellCount"]').value = order.cellCount || 0;
        
        const orderDate = order.orderDate ? new Date(order.orderDate.toDate()).toLocaleDateString('tr-TR') : '';
        const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate.toDate()).toLocaleDateString('tr-TR') : '';
        
        document.querySelector('#order-general input[name="orderDate"]').value = orderDate;
        document.querySelector('#order-general input[name="deliveryDate"]').value = deliveryDate;
        
        const statusSelect = document.querySelector('#order-general select[name="status"]');
        if (statusSelect) {
            statusSelect.value = order.status || 'planning';
        } else {
            document.querySelector('#order-general input[name="status"]').value = getStatusText(order.status);
        }
        
        // İş akışı durumunu güncelle
        updateWorkflowStatus(order.status);
        
        // Siparişe ait malzemeleri getir
        const materialsRef = firebase.firestore().collection('materials')
            .where('orderId', '==', orderId);
        
        const materialsSnapshot = await materialsRef.get();
        
        const materialsTableBody = document.querySelector('#materials-table tbody');
        if (materialsTableBody) {
            if (materialsSnapshot.empty) {
                materialsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Bu siparişe ait malzeme bulunamadı</td></tr>';
            } else {
                let materialsHtml = '';
                
                materialsSnapshot.forEach(doc => {
                    const material = doc.data();
                    
                    let statusClass = '';
                    let statusText = '';
                    
                    if (material.inStock) {
                        statusClass = 'badge-success';
                        statusText = 'Stokta';
                    } else if (material.status === 'ordered') {
                        statusClass = 'badge-warning';
                        statusText = 'Siparişte';
                    } else {
                        statusClass = 'badge-danger';
                        statusText = 'Eksik';
                    }
                    
                    const supplyDate = material.expectedSupplyDate ? 
                        new Date(material.expectedSupplyDate.toDate()).toLocaleDateString('tr-TR') : '-';
                    
                    materialsHtml += `
                        <tr>
                            <td>${material.code || ''}</td>
                            <td>${material.name || ''}</td>
                            <td>${material.quantity || 0}</td>
                            <td>${material.unit || 'Adet'}</td>
                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                            <td>${supplyDate}</td>
                        </tr>
                    `;
                });
                
                materialsTableBody.innerHTML = materialsHtml;
            }
        }
        
        // Siparişe ait notları getir
        const notesRef = firebase.firestore().collection('notes')
            .where('entityType', '==', 'order')
            .where('entityId', '==', orderId)
            .orderBy('createdAt', 'desc');
        
        const notesSnapshot = await notesRef.get();
        
        const notesContainer = document.querySelector('#notes-content .notes-container');
        if (notesContainer) {
            if (notesSnapshot.empty) {
                notesContainer.innerHTML = '<div class="text-center">Bu siparişe ait not bulunamadı</div>';
            } else {
                let notesHtml = '';
                
                notesSnapshot.forEach(doc => {
                    const note = doc.data();
                    
                    const noteDate = note.createdAt ? 
                        new Date(note.createdAt.toDate()).toLocaleString('tr-TR') : '';
                    
                    notesHtml += `
                        <div class="note-item">
                            <div class="note-header">
                                <div class="note-author">${note.createdBy?.name || 'Bilinmeyen'}</div>
                                <div class="note-date">${noteDate}</div>
                            </div>
                            <div class="note-content">
                                ${note.content || ''}
                            </div>
                        </div>
                    `;
                });
                
                notesContainer.innerHTML = notesHtml;
            }
        }
        
        // Modalı göster
        document.getElementById('order-detail-modal').style.display = 'block';
    } catch (error) {
        console.error("Sipariş detayı yükleme hatası:", error);
        alert('Sipariş detayı yüklenemedi: ' + error.message);
    }
}

// Durum metni al
function getStatusText(status) {
    switch (status) {
        case 'waiting': return 'Malzeme Bekleniyor';
        case 'production': return 'Üretimde';
        case 'ready': return 'Malzeme Hazır';
        case 'planning': return 'Planlama';
        default: return 'Bilinmiyor';
    }
}

// İş akışı durumunu güncelle
function updateWorkflowStatus(status) {
    const steps = document.querySelectorAll('.workflow-step');
    if (!steps || steps.length === 0) return;
    
    // Tüm adımları sıfırla
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Durum göre adımları işaretle
    switch (status) {
        case 'planning':
            steps[0].classList.add('completed');
            steps[1].classList.add('active');
            break;
        case 'waiting':
            steps[0].classList.add('completed');
            steps[1].classList.add('completed');
            steps[2].classList.add('active');
            break;
        case 'production':
            steps[0].classList.add('completed');
            steps[1].classList.add('completed');
            steps[2].classList.add('completed');
            steps[3].classList.add('active');
            break;
        case 'ready':
            steps[0].classList.add('completed');
            steps[1].classList.add('completed');
            steps[2].classList.add('completed');
            steps[3].classList.add('completed');
            steps[4].classList.add('active');
            break;
        default:
            steps[0].classList.add('active');
    }
}

// Sipariş durumunu güncelle
async function updateOrderStatus(orderId, status, comment = '') {
    try {
        // Veritabanı referansını al
        const orderRef = firebase.firestore().collection('orders').doc(orderId);
        
        // Güncelleme verisini hazırla
        const updateData = {
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Duruma özel tarih alanı ekle
        const statusDateField = `${status}Date`;
        updateData[statusDateField] = firebase.firestore.FieldValue.serverTimestamp();
        
        // Güncelleme yapan kullanıcıyı ekle
        const user = firebase.auth().currentUser;
        if (user) {
            updateData.updatedBy = user.uid;
        }
        
        // Siparişi güncelle
        await orderRef.update(updateData);
        
        // Eğer yorum eklenecekse not olarak kaydet
        if (comment.trim() !== '') {
            const notesRef = firebase.firestore().collection('notes');
            
            const noteData = {
                entityType: 'order',
                entityId: orderId,
                content: comment,
                type: 'status_change',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (user) {
                // Kullanıcı bilgisini ekle
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    noteData.createdBy = {
                        uid: user.uid,
                        name: userData.name || 'Bilinmeyen',
                        department: userData.department || 'Bilinmeyen'
                    };
                } else {
                    noteData.createdBy = {
                        uid: user.uid,
                        name: user.displayName || 'Bilinmeyen',
                        department: 'Bilinmeyen'
                    };
                }
            }
            
            await notesRef.add(noteData);
        }
        
        // Başarılı mesajı göster
        alert('Sipariş durumu güncellendi');
        
        // Detay modalde iş akışını güncelle (açıksa)
        if (document.getElementById('order-detail-modal').style.display === 'block') {
            updateWorkflowStatus(status);
        }
        
        // Sipariş listesini yenile
        loadOrders();
        
        return true;
    } catch (error) {
        console.error("Sipariş durumu güncelleme hatası:", error);
        alert('Sipariş durumu güncellenemedi: ' + error.message);
        throw error;
    }
}

// Sipariş detaylarını kaydet
async function saveOrderDetails(orderId) {
    try {
        const orderRef = firebase.firestore().collection('orders').doc(orderId);
        
        // Form verilerini al
        const orderData = {
            customer: document.querySelector('#order-general input[name="customer"]').value,
            cellType: document.querySelector('#order-general input[name="cellType"]').value,
            cellCount: parseInt(document.querySelector('#order-general input[name="cellCount"]').value) || 0
        };
        
        // Status seçimi varsa
        const statusSelect = document.querySelector('#order-general select[name="status"]');
        if (statusSelect) {
            orderData.status = statusSelect.value;
        }
        
        // Sipariş tarihini al
        const orderDateInput = document.querySelector('#order-general input[name="orderDate"]').value;
        if (orderDateInput) {
            const orderDateParts = orderDateInput.split('.');
            if (orderDateParts.length === 3) {
                const orderDate = new Date(
                    parseInt(orderDateParts[2]), 
                    parseInt(orderDateParts[1]) - 1, 
                    parseInt(orderDateParts[0])
                );
                orderData.orderDate = firebase.firestore.Timestamp.fromDate(orderDate);
            }
        }
        
        // Teslim tarihini al
        const deliveryDateInput = document.querySelector('#order-general input[name="deliveryDate"]').value;
        if (deliveryDateInput) {
            const deliveryDateParts = deliveryDateInput.split('.');
            if (deliveryDateParts.length === 3) {
                const deliveryDate = new Date(
                    parseInt(deliveryDateParts[2]), 
                    parseInt(deliveryDateParts[1]) - 1, 
                    parseInt(deliveryDateParts[0])
                );
                orderData.deliveryDate = firebase.firestore.Timestamp.fromDate(deliveryDate);
            }
        }
        
        // Güncelleme tarihi ekle
        orderData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Güncelleme yapan kullanıcıyı ekle
        const user = firebase.auth().currentUser;
        if (user) {
            orderData.updatedBy = user.uid;
        }
        
        // Siparişi güncelle
        await orderRef.update(orderData);
        
        alert('Değişiklikler kaydedildi');
        
        // Sipariş listesini yenile
        loadOrders();
        
        return true;
    } catch (error) {
        console.error("Sipariş güncelleme hatası:", error);
        alert('Sipariş güncellenemedi: ' + error.message);
        throw error;
    }
}

// Sipariş notu ekle
async function addOrderNote(orderId) {
    try {
        // Not içeriğini al
        const noteContent = document.querySelector('#notes-content textarea').value.trim();
        
        if (!noteContent) {
            alert('Lütfen not içeriğini giriniz.');
            return;
        }
        
        const notesRef = firebase.firestore().collection('notes');
        
        const noteData = {
            entityType: 'order',
            entityId: orderId,
            content: noteContent,
            type: 'general',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Kullanıcı bilgisini ekle
        const user = firebase.auth().currentUser;
        if (user) {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                noteData.createdBy = {
                    uid: user.uid,
                    name: userData.name || 'Bilinmeyen',
                    department: userData.department || 'Bilinmeyen'
                };
            } else {
                noteData.createdBy = {
                    uid: user.uid,
                    name: user.displayName || 'Bilinmeyen',
                    department: 'Bilinmeyen'
                };
            }
        }
        
        // Notu veritabanına ekle
        await notesRef.add(noteData);
        
        // Notları yeniden yükle
        const notesSnapshot = await notesRef
            .where('entityType', '==', 'order')
            .where('entityId', '==', orderId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const notesContainer = document.querySelector('#notes-content .notes-container');
        if (notesContainer) {
            let notesHtml = '';
            
            notesSnapshot.forEach(doc => {
                const note = doc.data();
                
                const noteDate = note.createdAt ? 
                    new Date(note.createdAt.toDate()).toLocaleString('tr-TR') : '';
                
                notesHtml += `
                    <div class="note-item">
                        <div class="note-header">
                            <div class="note-author">${note.createdBy?.name || 'Bilinmeyen'}</div>
                            <div class="note-date">${noteDate}</div>
                        </div>
                        <div class="note-content">
                            ${note.content || ''}
                        </div>
                    </div>
                `;
            });
            
            notesContainer.innerHTML = notesHtml;
        }
        
        // Textarea'yı temizle
        document.querySelector('#notes-content textarea').value = '';
        
        return true;
    } catch (error) {
        console.error("Not ekleme hatası:", error);
        alert('Not eklenemedi: ' + error.message);
        throw error;
    }
}

// Sipariş filtrele
function filterOrders() {
    const searchText = document.querySelector('.search-input')?.value.toLowerCase() || '';
    const statusFilter = document.querySelector('.filter-item select:nth-child(1)')?.value || '';
    const customerFilter = document.querySelector('.filter-item select:nth-child(2)')?.value || '';
    
    // Tüm satırları kontrol et
    const rows = document.querySelectorAll('#orders-table tbody tr');
    
    rows.forEach(row => {
        let showRow = true;
        
        // Metin araması
        if (searchText) {
            let found = false;
            row.querySelectorAll('td').forEach(cell => {
                if (cell.textContent.toLowerCase().includes(searchText)) {
                    found = true;
                }
            });
            if (!found) showRow = false;
        }
        
        // Status filtresi
        if (statusFilter && showRow) {
            const statusCell = row.querySelector('td:nth-child(7)');
            if (statusCell) {
                const status = statusCell.textContent.toLowerCase();
                if (!status.includes(statusFilter.toLowerCase())) {
                    showRow = false;
                }
            }
        }
        
        // Müşteri filtresi
        if (customerFilter && showRow) {
            const customerCell = row.querySelector('td:nth-child(2)');
            if (customerCell) {
                const customer = customerCell.textContent;
                if (customer !== customerFilter) {
                    showRow = false;
                }
            }
        }
        
        // Satırı göster/gizle
        row.style.display = showRow ? '' : 'none';
    });
}

// Sipariş oluşturma modalını göster
function showCreateOrderModal() {
    // Form alanlarını temizle
    const form = document.getElementById('create-order-form');
    if (form) {
        form.reset();
    }
    
    // Müşteri listesini doldur
    fillCustomerSelect();
    
    // Modalı göster
    document.getElementById('create-order-modal').style.display = 'block';
}

// Sipariş düzenleme modalını göster
async function editOrder(orderId) {
    event.stopPropagation(); // Tıklama event'inin üst elemanlara yayılmasını engelle
    
    try {
        // Sipariş verilerini getir
        const orderRef = firebase.firestore().collection('orders').doc(orderId);
        const doc = await orderRef.get();
        
        if (!doc.exists) {
            alert('Sipariş bulunamadı');
            return;
        }
        
        const order = doc.data();
        
        // Form alanlarını doldur
        const form = document.getElementById('edit-order-form');
        if (form) {
            form.elements['orderNo'].value = order.orderNo || '';
            form.elements['customer'].value = order.customer || '';
            form.elements['cellType'].value = order.cellType || '';
            form.elements['cellCount'].value = order.cellCount || 0;
            
            // Tarihleri uygun formata çevir
            if (order.orderDate) {
                const date = order.orderDate.toDate();
                form.elements['orderDate'].value = date.toISOString().split('T')[0];
            }
            
            if (order.deliveryDate) {
                const date = order.deliveryDate.toDate();
                form.elements['deliveryDate'].value = date.toISOString().split('T')[0];
            }
            
            form.elements['status'].value = order.status || 'planning';
        }
        
        // Modalı göster
        document.getElementById('edit-order-modal').style.display = 'block';
        
        // Sipariş ID'sini forma ekle
        document.getElementById('edit-order-id').value = orderId;
    } catch (error) {
        console.error('Sipariş düzenleme hatası:', error);
        alert('Sipariş bilgileri yüklenemedi: ' + error.message);
    }
}

// Müşteri seçim listesini doldur
async function fillCustomerSelect() {
    try {
        const customerSelect = document.querySelector('#create-order-form select[name="customer"]');
        if (!customerSelect) return;
        
        // Yükleniyor
        customerSelect.innerHTML = '<option value="">Yükleniyor...</option>';
        
        // Müşterileri getir
        const customersRef = firebase.firestore().collection('customers').orderBy('name', 'asc');
        const snapshot = await customersRef.get();
        
        if (snapshot.empty) {
            customerSelect.innerHTML = '<option value="">Müşteri bulunamadı</option>';
            return;
        }
        
        let options = '<option value="">Müşteri Seçin</option>';
        
        snapshot.forEach(doc => {
            const customer = doc.data();
            options += `<option value="${customer.name}">${customer.name}</option>`;
        });
        
        customerSelect.innerHTML = options;
    } catch (error) {
        console.error('Müşteri listesi yükleme hatası:', error);
        const customerSelect = document.querySelector('#create-order-form select[name="customer"]');
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">Hata: Müşteriler yüklenemedi</option>';
        }
    }
}

// Sayfa yüklendiğinde sipariş listesini yükle
document.addEventListener('DOMContentLoaded', function() {
    // Kullanıcı oturum açtıysa siparişleri yükle
    firebase.auth().onAuthStateChanged((user) => {
        if (user && document.getElementById('orders-page')) {
            loadOrders();
            
            // Filtre elementlerine olay dinleyicileri ekle
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.addEventListener('keyup', filterOrders);
            }
            
            const filterSelects = document.querySelectorAll('.filter-item select');
            filterSelects.forEach(select => {
                select.addEventListener('change', filterOrders);
            });
        }
    });
    
    // Sipariş oluşturma formuna olay dinleyicisi ekle
    const createOrderForm = document.getElementById('create-order-form');
    if (createOrderForm) {
        createOrderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const orderData = {
                customer: formData.get('customer'),
                cellType: formData.get('cellType'),
                cellCount: parseInt(formData.get('cellCount')) || 0,
                orderDate: formData.get('orderDate') ? new Date(formData.get('orderDate')) : new Date(),
                deliveryDate: formData.get('deliveryDate') ? new Date(formData.get('deliveryDate')) : null,
                status: formData.get('status') || 'planning'
            };
            
            createOrder(orderData);
        });
    }
    
    // Sipariş notları için gönder butonu
    const addNoteBtn = document.querySelector('#notes-content .btn-primary');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', function() {
            const orderId = document.getElementById('order-detail-id').textContent;
            addOrderNote(orderId);
        });
    }
    
    // Sipariş detayları güncelleme butonu
    const updateOrderBtn = document.querySelector('#order-detail-modal .modal-footer .btn-primary');
    if (updateOrderBtn) {
        updateOrderBtn.addEventListener('click', function() {
            const orderId = document.getElementById('order-detail-id').textContent;
            saveOrderDetails(orderId);
        });
    }
});

/**
 * Yeni sipariş ekleyen fonksiyon
 * @param {Object} orderData - Sipariş verileri
 */
async function addNewOrder(orderData) {
    try {
        // İlerleme bilgisini göster
        document.getElementById('add-order-status').innerHTML = `<div class="alert alert-info">Sipariş ekleniyor...</div>`;
        
        // Firebase Firestore'a sipariş verilerini ekle
        const orderRef = await firebase.firestore().collection('orders').add({
            ...orderData,
            status: 'planning', // Başlangıç durumu
            creationDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            progress: 0,
            currentStage: 'Planlama',
            notes: orderData.notes || ''
        });
        
        console.log('Sipariş başarıyla eklendi:', orderRef.id);
        
        // ERP sistemine sipariş verilerini gönder
        if (AppConfig.erpIntegration && AppConfig.erpIntegration.enabled) {
            try {
                const erpResult = await ERPService.createOrder({
                    ...orderData,
                    firebaseId: orderRef.id
                });
                
                // ERP ID'sini Firebase'e kaydet
                if (erpResult && erpResult.erpOrderId) {
                    await orderRef.update({
                        erpOrderId: erpResult.erpOrderId
                    });
                }
                
                console.log('Sipariş ERP sistemine kaydedildi');
            } catch (erpError) {
                console.error('ERP sistemi entegrasyonu hatası:', erpError);
                // ERP hatasını göster ama işleme devam et
                document.getElementById('add-order-status').innerHTML += `
                    <div class="alert alert-warning">
                        ERP sistemine kayıt sırasında bir hata oluştu. Sipariş oluşturuldu fakat ERP entegrasyonu başarısız oldu.
                    </div>
                `;
            }
        }
        
        // Malzeme listesi kontrolü ve otomatik oluşturma
        if (AppConfig.ai?.enabled && AppConfig.ai.materialPrediction) {
            try {
                document.getElementById('add-order-status').innerHTML += `
                    <div class="alert alert-info">Malzeme listesi oluşturuluyor...</div>
                `;
                
                // AI ile malzeme listesi oluştur
                let materials;
                if (window.AIIntegrationModule && typeof window.AIIntegrationModule.predictMaterials === 'function') {
                    materials = await window.AIIntegrationModule.predictMaterials(orderData);
                } else {
                    // Varsayılan malzeme listesi (hücre tipine göre)
                    materials = await fetchDefaultMaterialList(orderData.cellType);
                }
                
                // Malzemeleri veritabanına kaydet
                if (materials && materials.length > 0) {
                    const batch = firebase.firestore().batch();
                    materials.forEach(material => {
                        const materialRef = firebase.firestore().collection('materials').doc();
                        batch.set(materialRef, {
                            ...material,
                            orderId: orderRef.id,
                            orderNo: orderData.orderNo,
                            creationDate: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    
                    await batch.commit();
                    console.log(`${materials.length} malzeme başarıyla eklendi`);
                }
            } catch (aiError) {
                console.error('Malzeme tahmini hatası:', aiError);
                document.getElementById('add-order-status').innerHTML += `
                    <div class="alert alert-warning">
                        Malzeme listesi otomatik oluşturulamadı. Lütfen manuel olarak ekleyin.
                    </div>
                `;
            }
        }
        
        // Üretim planlama için öneri iste
        if (AppConfig.ai?.enabled && AppConfig.ai.prediction) {
            try {
                document.getElementById('add-order-status').innerHTML += `
                    <div class="alert alert-info">Üretim planı önerisi oluşturuluyor...</div>
                `;
                
                // AI ile üretim süresi tahmini
                let productionTimeEstimate;
                if (window.AIIntegrationModule && typeof window.AIIntegrationModule.predictProductionTime === 'function') {
                    productionTimeEstimate = await window.AIIntegrationModule.predictProductionTime(orderData);
                } else {
                    // Varsayılan üretim süresi tahmini (hücre tipine göre)
                    productionTimeEstimate = getDefaultProductionTime(orderData.cellType, orderData.quantity);
                }
                
                // Üretim tahmini bilgilerini güncelle
                if (productionTimeEstimate) {
                    await orderRef.update({
                        estimatedProductionDays: productionTimeEstimate.estimatedDays,
                        estimatedCompletionDate: calculateCompletionDate(productionTimeEstimate.estimatedDays)
                    });
                    
                    console.log('Üretim süresi tahmini:', productionTimeEstimate);
                }
            } catch (predictionError) {
                console.error('Üretim süresi tahmini hatası:', predictionError);
            }
        }
        
        // Başarı mesajı göster
        document.getElementById('add-order-status').innerHTML = `
            <div class="alert alert-success">
                <strong>Başarılı!</strong> Sipariş başarıyla eklendi. (ID: ${orderRef.id})
                <div class="mt-2">
                    <button class="btn btn-sm btn-primary" onclick="showOrderDetails('${orderRef.id}')">
                        <i class="fas fa-eye"></i> Sipariş Detayını Görüntüle
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="clearOrderForm()">
                        <i class="fas fa-plus"></i> Yeni Sipariş Ekle
                    </button>
                </div>
            </div>
        `;
        
        // Sipariş listesini güncelle
        loadActiveOrders();
        
        // Siparişin kullanıcı arayüzüne eklenmesi için Event yaratma
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('order-added', { 
                orderId: orderRef.id,
                orderData: {
                    ...orderData,
                    id: orderRef.id
                }
            });
        }
        
        return { success: true, orderId: orderRef.id };
    } catch (error) {
        console.error('Sipariş ekleme hatası:', error);
        document.getElementById('add-order-status').innerHTML = `
            <div class="alert alert-danger">
                <strong>Hata!</strong> Sipariş eklenirken bir sorun oluştu: ${error.message}
            </div>
        `;
        return { success: false, error: error.message };
    }
}

/**
 * Varsayılan üretim süresini hesaplar
 * @param {string} cellType - Hücre tipi
 * @param {number} quantity - Adet
 * @returns {Object} Üretim süresi tahmini
 */
function getDefaultProductionTime(cellType, quantity) {
    // Hücre tipine göre temel üretim süresi (gün)
    const baseTime = {
        'RM 36 CB': 18,
        'RM 36 LB': 15,
        'RM 36 FL': 20,
        'RM 36 RMU': 12
    }[cellType] || 15;
    
    // Adet sayısına göre çarpan (logaritmik ölçekte)
    const quantityFactor = Math.log2(quantity || 1) * 0.8;
    
    // Toplam süre
    const totalDays = Math.ceil(baseTime + (baseTime * quantityFactor));
    
    return {
        estimatedDays: totalDays,
        method: 'default'
    };
}

/**
 * Tamamlanma tarihini hesaplar
 * @param {number} days - Tahmini gün sayısı
 * @returns {Date} Tamamlanma tarihi
 */
function calculateCompletionDate(days) {
    const today = new Date();
    const completionDate = new Date(today);
    completionDate.setDate(today.getDate() + days);
    return completionDate;
}

/**
 * Hücre tipine göre varsayılan malzeme listesini getirir
 * @param {string} cellType - Hücre tipi
 * @returns {Promise<Array>} Malzeme listesi
 */
async function fetchDefaultMaterialList(cellType) {
    try {
        // Gerçek uygulamada API çağrısı yapılabilir
        const materialTypesRef = firebase.firestore().collection('materialTypes')
            .where('cellType', '==', cellType).limit(1);
        
        const snapshot = await materialTypesRef.get();
        
        if (!snapshot.empty) {
            // Veritabanında bu hücre tipi için önceden tanımlanmış malzeme listesi var
            return snapshot.docs[0].data().materials || [];
        }
        
        // Varsayılan malzeme listesi
        const defaultMaterials = {
            'RM 36 CB': [
                { code: "137998", name: "Siemens 7SR1003-1JA20-2DA0+ZY20 24VDC", quantity: 1, category: "Röle" },
                { code: "144866", name: "KAP-80/190-95 Akım Trafosu", quantity: 3, category: "Akım Trafosu" },
                { code: "120170", name: "M480TB/G-027-95.300UN5 Kablo Başlığı", quantity: 6, category: "Kablo" }
            ],
            'RM 36 LB': [
                { code: "125433", name: "Yük Ayırıcı KX-200A", quantity: 1, category: "Ayırıcı" },
                { code: "118764", name: "Gerilim Göstergesi VDS-36kV", quantity: 3, category: "Gösterge" },
                { code: "129012", name: "Topraklama Seti", quantity: 1, category: "Topraklama" }
            ],
            'RM 36 FL': [
                { code: "131578", name: "HRC Sigorta 40A", quantity: 3, category: "Sigorta" },
                { code: "143290", name: "Kontaktör LC1 D80A", quantity: 1, category: "Kontaktör" },
                { code: "112389", name: "Alçak Gerilim Rölesi", quantity: 1, category: "Röle" }
            ],
            'RM 36 RMU': [
                { code: "156789", name: "SF6 Gaz Sensörü", quantity: 1, category: "Sensör" },
                { code: "154320", name: "RMU Mekanizma", quantity: 1, category: "Mekanizma" },
                { code: "157238", name: "Anahtarlama Ünitesi", quantity: 2, category: "Anahtarlama" }
            ]
        };
        
        return defaultMaterials[cellType] || [];
    } catch (error) {
        console.error('Varsayılan malzeme listesi getirme hatası:', error);
        return [];
    }
}