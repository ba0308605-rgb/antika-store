// ====================================================
    // STATE
    // ====================================================
    let currentUser = {};
    let selectedLat = null;
    let selectedLng = null;
    let selectedAddressText = '';
    let editingIndex = null;
    let map = null;
    let marker = null;
    let geocoder = null;
    let mapInitialized = false;
    let autocomplete = null;

    const CITIES = {
        makkah: ['مكة المكرمة','جدة','الطائف','رابغ','القنفذة','الليث','الجموم'],
        riyadh: ['الرياض','الخرج','الدوادمي','المجمعة','القويعية','الدرعية','عفيف','الزلفي'],
        eastern: ['الدمام','الخبر','الظهران','الأحساء','القطيف','الجبيل','حفر الباطن','الخفجي'],
        madinah: ['المدينة المنورة','ينبع','العلا','بدر','مهد الذهب'],
        asir: ['أبها','خميس مشيط','بيشة','النماص','محايل عسير','رجال ألمع'],
        tabuk: ['تبوك','الوجه','ضبا','تيماء','أملج'],
        hail: ['حائل','بقعاء','الشنان'],
        northern: ['عرعر','رفحاء','طريف','العويقيلة'],
        jazan: ['جازان','صبيا','أبو عريش','صامطة','الدرب'],
        najran: ['نجران','شرورة','حبونا'],
        baha: ['الباحة','بلجرشي','المخواة','العقيق'],
        jouf: ['سكاكا','دومة الجندل','القريات'],
        qassim: ['بريدة','عنيزة','الرس','البكيرية','المذنب']
    };

    // ====================================================
    // INIT
    // ====================================================
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            currentUser = JSON.parse(localStorage.getItem('antika_user') || '{}');
            if (currentUser.email) {
                const serverUser = await API.getUser(currentUser.email);
                if (serverUser && Object.keys(serverUser).length > 0) {
                    currentUser = serverUser;
                    localStorage.setItem('antika_user', JSON.stringify(currentUser));
                }
            }
        } catch(e) {}
        renderAddresses();
    });

    // ====================================================
    // RENDER ADDRESSES
    // ====================================================
    function renderAddresses() {
        const container = document.getElementById('addresses-container');
        const empty = document.getElementById('empty-state');
        const addresses = currentUser.addresses || [];

        container.innerHTML = '';

        if (addresses.length === 0) {
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        addresses.forEach((addr, idx) => {
            const card = document.createElement('div');
            card.className = 'address-card fade-in' + (addr.isDefault ? ' is-default' : '');

            const fullAddr = addr.address && (!addr.district && !addr.street && !addr.city)
                ? addr.address
                : ([addr.district, addr.street, addr.city, addr.region].filter(Boolean).join('، ') || addr.address || 'لا توجد تفاصيل');

            card.innerHTML = `
                <div class="flex items-start gap-4">
                    <div class="location-icon-wrap" style="background:${addr.isDefault ? 'linear-gradient(135deg,var(--gold-light),var(--gold))' : 'var(--bg)'}">
                        <i class="fas fa-map-marker-alt" style="color:${addr.isDefault ? 'white' : 'var(--gold-dark)'}; font-size:18px"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold" style="color:var(--text)">${addr.label || 'عنوان ' + (idx+1)}</span>
                            ${addr.isDefault ? '<span class="badge-default"><i class="fas fa-check text-xs"></i> افتراضي</span>' : ''}
                        </div>
                        <p class="text-sm truncate" style="color:var(--muted)">${fullAddr}</p>
                        ${addr.lat && addr.lng ? `<p class="text-xs mt-1" style="color:var(--gold-dark)"><i class="fas fa-location-dot ml-1"></i>تم تحديد الموقع على الخريطة</p>` : ''}
                    </div>
                    <div class="relative flex-shrink-0">
                        <button class="dropdown-trigger w-8 h-8 rounded-full flex items-center justify-center transition hover:bg-gray-100" style="border:none;background:none;cursor:pointer" data-idx="${idx}">
                            <i class="fas fa-ellipsis-v" style="color:var(--muted)"></i>
                        </button>
                        <div class="dropdown-menu hidden" id="menu-${idx}">
                            ${!addr.isDefault ? `<button class="dropdown-item" onclick="setDefault(${idx})"><i class="fas fa-star" style="color:var(--gold)"></i> تعيين افتراضي</button>` : ''}
                            <button class="dropdown-item" onclick="editAddress(${idx})"><i class="fas fa-pen" style="color:#60a5fa"></i> تعديل</button>
                            <button class="dropdown-item danger" onclick="deleteAddress(${idx})"><i class="fas fa-trash"></i> حذف العنوان</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Dropdown toggle
        document.querySelectorAll('.dropdown-trigger').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const idx = btn.dataset.idx;
                document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
                document.getElementById('menu-' + idx).classList.toggle('hidden');
            });
        });
        document.addEventListener('click', (e) => {
            if (e.target.closest('.dropdown-trigger') || e.target.closest('.dropdown-menu')) return;
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
        });
    }

    // ====================================================
    // MODAL
    // ====================================================
    function openAddressModal(editIdx = null) {
        editingIndex = editIdx;
        const modal = document.getElementById('address-modal');
        const title = document.getElementById('modal-title');
        modal.classList.remove('hidden');

        if (editIdx !== null) {
            title.innerHTML = '<i class="fas fa-pen ml-2" style="color:var(--pink)"></i> تعديل العنوان';
            const addr = (currentUser.addresses || [])[editIdx] || {};
            document.getElementById('addr-region').value = addr.regionKey || '';
            if (addr.regionKey) { loadCities(addr.regionKey); setTimeout(() => { document.getElementById('addr-city').value = addr.city || ''; }, 100); }
            document.getElementById('addr-district').value = addr.district || '';
            document.getElementById('addr-street').value = addr.street || '';
            document.getElementById('addr-building').value = addr.building || '';
            document.getElementById('addr-postal').value = addr.postal || '';
            document.getElementById('addr-landmark').value = addr.landmark || '';
            document.getElementById('addr-alt-phone').value = addr.altPhone || '';
            document.getElementById('addr-label').value = addr.label || '';
            document.getElementById('addr-default').checked = addr.isDefault || false;
            if (addr.lat && addr.lng) {
                selectedLat = addr.lat;
                selectedLng = addr.lng;
                selectedAddressText = addr.address || '';
                enableNextBtn();
            }
            goToStep2();
        } else {
            title.innerHTML = '<i class="fas fa-map-marker-alt ml-2" style="color:var(--pink)"></i> إضافة عنوان جديد';
            resetForm();
            goToStep1();
        }

        setTimeout(() => initMap(), 300);
    }

    function closeAddressModal() {
        document.getElementById('address-modal').classList.add('hidden');
        editingIndex = null;
        mapInitialized = false;
        map = null;
    }
    window.closeAddressModal = closeAddressModal;
    window.openAddressModal = openAddressModal;
    window.editAddress = editAddress;
    window.deleteAddress = deleteAddress;

    // ربط زر X مباشرة
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeAddressModal);

    function resetForm() {
        selectedLat = null; selectedLng = null; selectedAddressText = '';
        ['addr-region','addr-city','addr-district','addr-street','addr-building','addr-postal','addr-landmark','addr-alt-phone','addr-label'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('addr-default').checked = false;
        document.getElementById('selected-address-box').classList.add('hidden');
        disableNextBtn();
    }

    function goToStep1() {
        document.getElementById('step-map').classList.remove('hidden');
        document.getElementById('step-details').classList.add('hidden');
        setTimeout(() => initMap(), 200);
    }

    function goToStep2() {
        if (!selectedLat || !selectedLng) { showToast('الرجاء تحديد موقعك على الخريطة أولاً', '⚠️'); return; }
        document.getElementById('step-map').classList.add('hidden');
        document.getElementById('step-details').classList.remove('hidden');
    }

    function enableNextBtn() {
        const btn = document.getElementById('save-map-btn');
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }

    function disableNextBtn() {
        const btn = document.getElementById('save-map-btn');
        if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
    }

    function setLabel(val) { document.getElementById('addr-label').value = val; }

    // ====================================================
    // GOOGLE MAPS
    // ====================================================
    function initMap() {
        if (mapInitialized) return;
        const mapEl = document.getElementById('map');
        if (!mapEl || !window.google) return;

        mapInitialized = true;

        const center = { lat: 21.3891, lng: 39.8579 }; // Jeddah default
        map = new google.maps.Map(mapEl, {
            center, zoom: 13,
            disableDefaultUI: true,
            zoomControl: true,
            styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
        });

        marker = new google.maps.Marker({
            map, position: center, draggable: true,
            icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24S32 28 32 16C32 7.163 24.837 0 16 0z" fill="#D6C1A6"/><circle cx="16" cy="16" r="8" fill="white"/><circle cx="16" cy="16" r="5" fill="#C4AC8E"/></svg>'), scaledSize: new google.maps.Size(32, 40) }
        });

        if (selectedLat && selectedLng) {
            map.setCenter({ lat: selectedLat, lng: selectedLng });
            marker.setPosition({ lat: selectedLat, lng: selectedLng });
        }

        marker.addListener('dragend', e => reverseGeocode(e.latLng.lat(), e.latLng.lng()));
        map.addListener('click', e => {
            marker.setPosition(e.latLng);
            reverseGeocode(e.latLng.lat(), e.latLng.lng());
        });

        // Search box
        const searchInput = document.getElementById('map-search-input');
        if (window.google.maps.places) {
            autocomplete = new google.maps.places.Autocomplete(searchInput, {
                componentRestrictions: { country: 'sa' }
            });
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place.geometry) return;
                map.setCenter(place.geometry.location);
                map.setZoom(16);
                marker.setPosition(place.geometry.location);
                reverseGeocode(place.geometry.location.lat(), place.geometry.location.lng());
            });
        }
    }

    async function reverseGeocode(lat, lng) {
        selectedLat = lat;
        selectedLng = lng;
        try {
            // نستخدم OpenStreetMap (Nominatim) بدل Google Geocoding — مجانية بالكامل وبدون حساب فوترة
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar&zoom=18&addressdetails=1`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const data = await res.json();

            if (data && data.address) {
                selectedAddressText = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                document.getElementById('selected-address-text').textContent = selectedAddressText;
                document.getElementById('selected-address-box').classList.remove('hidden');

                const a = data.address;
                const detectedStreet = a.road || a.pedestrian || '';
                const detectedDistrict = a.suburb || a.neighbourhood || a.quarter || a.city_district || '';
                const detectedPostal = a.postcode || '';
                const detectedCity = a.city || a.town || a.village || a.municipality || '';
                const detectedRegion = a.state || a.region || '';

                if (detectedStreet) {
                    const el = document.getElementById('addr-street');
                    if (el) el.value = detectedStreet;
                }
                if (detectedDistrict) {
                    const el = document.getElementById('addr-district');
                    if (el) el.value = detectedDistrict;
                }
                if (detectedPostal) {
                    const el = document.getElementById('addr-postal');
                    if (el) el.value = detectedPostal;
                }

                if (detectedCity || detectedRegion) {
                    let matchedRegionKey = '';

                    // الطريقة الأولى (الأدق): نبحث عن المدينة المكتشفة بالضبط داخل قائمة المدن
                    if (detectedCity) {
                        for (const [key, cities] of Object.entries(CITIES)) {
                            if (cities.some(c => c === detectedCity || detectedCity.includes(c) || c.includes(detectedCity))) {
                                matchedRegionKey = key;
                                break;
                            }
                        }
                    }

                    // الطريقة الثانية (احتياطية): مطابقة نص المنطقة مع خيارات القائمة
                    if (!matchedRegionKey && detectedRegion) {
                        const regionSelect = document.getElementById('addr-region');
                        if (regionSelect) {
                            const norm = s => (s || '').replace(/منطقة/g, '').trim();
                            const options = Array.from(regionSelect.options);
                            const match = options.find(o =>
                                norm(detectedRegion).includes(norm(o.text)) ||
                                norm(o.text).includes(norm(detectedRegion))
                            );
                            if (match) matchedRegionKey = match.value;
                        }
                    }

                    if (matchedRegionKey) {
                        const regionSelect = document.getElementById('addr-region');
                        if (regionSelect) {
                            regionSelect.value = matchedRegionKey;
                            loadCities(matchedRegionKey); // متزامنة، ما تحتاج انتظار
                            if (detectedCity) {
                                const citySelect = document.getElementById('addr-city');
                                if (citySelect) {
                                    const cityOptions = Array.from(citySelect.options);
                                    const cityMatch = cityOptions.find(o => o.value === detectedCity || detectedCity.includes(o.text) || o.text.includes(detectedCity));
                                    if (cityMatch) citySelect.value = cityMatch.value;
                                }
                            }
                        }
                    } else {
                        console.warn('تعذّر مطابقة المنطقة/المدينة تلقائياً من نتيجة الخريطة:', { detectedCity, detectedRegion });
                    }
                }
            } else {
                console.warn('لم يُرجع الاستعلام عن العنوان أي بيانات لهذه النقطة');
                selectedAddressText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                document.getElementById('selected-address-text').textContent = selectedAddressText;
                document.getElementById('selected-address-box').classList.remove('hidden');
            }
            enableNextBtn();
        } catch (err) {
            console.error('Geocoding error:', err);
            selectedAddressText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            document.getElementById('selected-address-text').textContent = selectedAddressText;
            document.getElementById('selected-address-box').classList.remove('hidden');
            enableNextBtn();
        }
    }

    function useCurrentLocation() {
        if (!navigator.geolocation) { showToast('المتصفح لا يدعم تحديد الموقع', '❌'); return; }
        showToast('جاري تحديد موقعك...', '📍');
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            if (map && marker) {
                map.setCenter({ lat, lng });
                map.setZoom(16);
                marker.setPosition({ lat, lng });
            }
            reverseGeocode(lat, lng);
        }, () => showToast('تعذر تحديد الموقع', '❌'));
    }

    // ====================================================
    // CITIES
    // ====================================================
    function loadCities(region) {
        const select = document.getElementById('addr-city');
        select.innerHTML = '<option value="">اختر المدينة</option>';
        (CITIES[region] || []).forEach(city => {
            const opt = document.createElement('option');
            opt.value = city;
            opt.textContent = city;
            select.appendChild(opt);
        });
    }

    // ====================================================
    // VALIDATION HELPERS (تمييز الحقول الفارغة بصرياً)
    // ====================================================
    function clearFieldError(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('field-error');
        const err = document.getElementById(id + '-error');
        if (err) err.classList.add('hidden');
    }

    function markFieldError(id, message) {
        const el = document.getElementById(id);
        if (!el) return null;
        el.classList.add('field-error');
        const err = document.getElementById(id + '-error');
        if (err) { err.textContent = message; err.classList.remove('hidden'); }
        return el;
    }

    // إزالة التمييز الأحمر فور ما المستخدم يبدأ يعبّي الحقل
    document.addEventListener('input', (e) => {
        if (e.target && e.target.id) clearFieldError(e.target.id);
    });
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id) clearFieldError(e.target.id);
    });

    // ====================================================
    // SAVE
    // ====================================================
    async function saveAddress() {
        const region = document.getElementById('addr-region').value;
        const city = document.getElementById('addr-city').value;
        const district = document.getElementById('addr-district').value.trim();
        const street = document.getElementById('addr-street').value.trim();
        const building = document.getElementById('addr-building').value.trim();
        const postal = document.getElementById('addr-postal').value.trim();
        const landmark = document.getElementById('addr-landmark').value.trim();
        const altPhone = document.getElementById('addr-alt-phone').value.trim();
        const label = document.getElementById('addr-label').value.trim();
        const isDefault = document.getElementById('addr-default').checked;

        if (!selectedLat || !selectedLng) {
            showToast('الرجاء تحديد موقعك على الخريطة', '⚠️'); goToStep1(); return;
        }

        // تمييز كل حقل مطلوب وفارغ بحدود حمراء + رسالة، والتمرير لأول حقل ناقص
        ['addr-region','addr-city','addr-district','addr-street','addr-label'].forEach(clearFieldError);
        const requiredFields = [
            { id: 'addr-region', value: region, message: 'الرجاء اختيار المنطقة' },
            { id: 'addr-city', value: city, message: 'الرجاء اختيار المدينة' },
            { id: 'addr-district', value: district, message: 'الرجاء إدخال اسم الحي' },
            { id: 'addr-street', value: street, message: 'الرجاء إدخال اسم الشارع' },
            { id: 'addr-label', value: label, message: 'الرجاء إدخال اسم للعنوان' }
        ];
        let firstInvalidEl = null;
        requiredFields.forEach(f => {
            if (!f.value) {
                const el = markFieldError(f.id, f.message);
                if (el && !firstInvalidEl) firstInvalidEl = el;
            }
        });
        if (firstInvalidEl) {
            showToast('فيه حقول مطلوبة ناقصة، مُعلّمة باللون الأحمر', '⚠️');
            firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalidEl.focus({ preventScroll: true });
            return;
        }

        const fullAddress = [district, street, city, getRegionName(region)].filter(Boolean).join('، ');

        const entry = {
            label, regionKey: region, region: getRegionName(region),
            city, district, street, building, postal, landmark, altPhone,
            address: selectedAddressText || fullAddress,
            lat: selectedLat, lng: selectedLng,
            isDefault: false
        };

        currentUser.addresses = currentUser.addresses || [];

        if (isDefault) {
            currentUser.addresses.forEach(a => a.isDefault = false);
            entry.isDefault = true;
        } else if (currentUser.addresses.length === 0) {
            entry.isDefault = true;
        }

        try {
            if (editingIndex !== null) {
                if (currentUser.email) {
                    const updated = await API.updateUserAddress(currentUser.email, editingIndex, entry);
                    if (updated?.addresses) currentUser.addresses = updated.addresses;
                    else currentUser.addresses[editingIndex] = entry;
                } else {
                    currentUser.addresses[editingIndex] = entry;
                }
                showToast('تم تحديث العنوان', '✅');
            } else {
                if (currentUser.email) {
                    const updated = await API.addUserAddress(currentUser.email, entry);
                    if (updated?.addresses) currentUser.addresses = updated.addresses;
                    else currentUser.addresses.push(entry);
                } else {
                    currentUser.addresses.push(entry);
                }
                showToast('تم حفظ العنوان', '✅');
            }

            localStorage.setItem('antika_user', JSON.stringify(currentUser));
            closeAddressModal();
            renderAddresses();
        } catch(err) {
            console.error(err);
            showToast('حدث خطأ أثناء الحفظ', '❌');
        }
    }

    // ====================================================
    // EDIT / DELETE / DEFAULT
    // ====================================================
    function editAddress(idx) { openAddressModal(idx); }

    async function deleteAddress(idx) {
        if (!confirm('هل تريد حذف هذا العنوان؟')) return;
        try {
            if (currentUser.email) {
                const updated = await API.deleteUserAddress(currentUser.email, idx);
                if (updated?.addresses) currentUser.addresses = updated.addresses;
                else currentUser.addresses.splice(idx, 1);
            } else {
                currentUser.addresses.splice(idx, 1);
            }
            localStorage.setItem('antika_user', JSON.stringify(currentUser));
            renderAddresses();
            showToast('تم حذف العنوان', '🗑️');
        } catch(err) {
            showToast('حدث خطأ أثناء الحذف', '❌');
        }
    }

    async function setDefault(idx) {
        currentUser.addresses = currentUser.addresses || [];
        currentUser.addresses.forEach((a, i) => a.isDefault = (i === idx));
        try {
            if (currentUser.email) {
                await API.upsertUser(currentUser.email, { addresses: currentUser.addresses });
            }
            localStorage.setItem('antika_user', JSON.stringify(currentUser));
            renderAddresses();
            showToast('تم تعيين العنوان الافتراضي', '⭐');
        } catch(err) {
            showToast('حدث خطأ', '❌');
        }
    }

    // ====================================================
    // HELPERS
    // ====================================================
    function getRegionName(key) {
        const map = { makkah:'منطقة مكة المكرمة', riyadh:'منطقة الرياض', eastern:'المنطقة الشرقية', madinah:'منطقة المدينة المنورة', asir:'منطقة عسير', tabuk:'منطقة تبوك', hail:'منطقة حائل', northern:'منطقة الحدود الشمالية', jazan:'منطقة جازان', najran:'منطقة نجران', baha:'منطقة الباحة', jouf:'منطقة الجوف', qassim:'منطقة القصيم' };
        return map[key] || key;
    }

    function showToast(msg, icon = '✅') {
        document.querySelectorAll('.toast').forEach(t => t.remove());
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = icon + ' ' + msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    function logout() {
        localStorage.removeItem('antika_user');
        localStorage.removeItem('antika_admin_token');
        window.location.href = 'index.html';
    }

    // Load Google Maps
    window.initGoogleMap = function() {};

// ====================================================
// LOAD GOOGLE MAPS API
// ====================================================
(async function loadMapsAPI() {
    try {
        const res = await fetch('/api/maps/config');
        const cfg = await res.json();
        if (cfg.googleMapsEnabled && cfg.googleMapsApiKey) {
            const s = document.createElement('script');
            s.src = `https://maps.googleapis.com/maps/api/js?key=${cfg.googleMapsApiKey}&libraries=places&language=ar&region=SA&callback=initGoogleMap`;
            s.async = true;
            document.head.appendChild(s);
        }
    } catch(e) { console.warn('Could not load Maps API', e); }
})();