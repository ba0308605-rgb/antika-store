// Addresses page script - manages saved addresses (add/edit/delete, pick from map)
document.addEventListener('DOMContentLoaded', () => {
    initAddressesPage();
});

function initAddressesPage() {
    // Addresses
    const addAddressBtn = document.getElementById('add-address-btn');
    addAddressBtn?.addEventListener('click', () => openAddressEditor(false, null));
    
    // Locations
    // Quick map button (if present)
    const quickMapBtn = document.getElementById('quick-map-btn');
    quickMapBtn?.addEventListener('click', () => openLocationPicker());

    // Render unified saved list (locations + textual addresses)
    renderSavedList();

    // Global click handler to close any open menus (single handler, RTL-friendly)
    document.addEventListener('click', () => {
        document.querySelectorAll('.saved-menu').forEach(m => m.classList.add('hidden'));
    });
}

async function renderAddressesList() {
    const container = document.getElementById('addresses-list');
    const empty = document.getElementById('empty-state');
    container.innerHTML = '';

    let user = {};
    try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }

    // Try to fetch server copy if email exists
    if (user.email) {
        try {
            const serverUser = await API.getUser(user.email);
            if (serverUser && Object.keys(serverUser).length > 0) {
                user = Object.assign({}, serverUser);
                localStorage.setItem('antika_user', JSON.stringify(user));
            }
        } catch (e) {
            console.warn('Could not sync user addresses from server', e);
        }
    }

    const addresses = user.addresses || [];
    if (!addresses || addresses.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    addresses.forEach((a, idx) => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4 hover:border-antika-gold transition group';

        const left = document.createElement('div');
        left.className = 'flex-1';
        const title = document.createElement('div');
        title.className = 'font-bold text-gray-900 flex items-center gap-2';
        title.innerHTML = '<i class="fas fa-map text-antika-gold"></i>' + (a.label || ('العنوان ' + (idx+1)));
        const addr = document.createElement('div');
        addr.className = 'text-sm text-gray-600 mt-2';
        addr.textContent = a.address || (a.lat && a.lng ? `${a.lat.toFixed(6)}, ${a.lng.toFixed(6)}` : 'لا توجد تفاصيل');
        left.appendChild(title);
        left.appendChild(addr);

        // Default badge
        if (a.isDefault) {
            const defBadge = document.createElement('div');
            defBadge.className = 'text-xs text-white bg-green-600 px-2 py-1 rounded mt-2 inline-block';
            defBadge.innerHTML = '<i class="fas fa-check ml-1"></i>افتراضي';
            left.appendChild(defBadge);
        }

        const actions = document.createElement('div');
        actions.className = 'relative';

        // Menu button (three dots)
        const menuBtn = document.createElement('button');
        menuBtn.className = 'px-2 py-1 text-gray-600 hover:text-antika-teal hover:bg-gray-100 rounded transition text-lg';
        menuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        menuBtn.setAttribute('aria-label', 'خيارات');

        // Dropdown menu (RTL - align right)
        const menu = document.createElement('div');
        menu.className = 'hidden absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-max saved-menu';
        
        // Set as default option
        const defaultOption = document.createElement('button');
        defaultOption.className = 'w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100 transition text-gray-700';
        defaultOption.innerHTML = '<i class="fas fa-star text-antika-gold"></i>اجعل افتراضي';
        if (a.isDefault) {
            defaultOption.disabled = true;
            defaultOption.className += ' opacity-50 cursor-not-allowed';
        }
        defaultOption.addEventListener('click', async () => {
            try {
                await setDefaultAddress(idx);
                renderAddressesList();
            } catch (err) {
                console.error('Error setting default address:', err);
                alert('حدث خطأ');
            }
        });

        // Edit option
        const editOption = document.createElement('button');
        editOption.className = 'w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100 transition text-gray-700';
        editOption.innerHTML = '<i class="fas fa-pen text-blue-400"></i>تعديل';
        editOption.addEventListener('click', () => {
            menu.classList.add('hidden');
            openAddressEditor(true, idx);
        });

        // Delete option
        const deleteOption = document.createElement('button');
        deleteOption.className = 'w-full text-right px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-sm transition text-red-600';
        deleteOption.innerHTML = '<i class="fas fa-trash"></i>حذف';
        deleteOption.addEventListener('click', async () => {
            if (!confirm('حذف هذا العنوان؟')) return;
            try {
                if (user.email) {
                    const updated = await API.deleteUserAddress(user.email, idx);
                    user = updated || user;
                } else {
                    user.addresses.splice(idx, 1);
                }
                localStorage.setItem('antika_user', JSON.stringify(user));
                renderAddressesList();
            } catch (err) {
                console.error('Error deleting address:', err);
                alert('حدث خطأ أثناء الحذف');
            }
        });

        menu.appendChild(defaultOption);
        menu.appendChild(editOption);
        menu.appendChild(deleteOption);

        // Toggle menu
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });

        actions.appendChild(menuBtn);
        actions.appendChild(menu);

        card.appendChild(left);
        card.appendChild(actions);
        container.appendChild(card);
    });
}

function openAddressEditor(edit = false, index = null) {
    const existing = document.getElementById('address-editor-modal');
    if (existing) existing.remove();

    let user = {};
    try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }
    user.addresses = user.addresses || [];

    const modal = document.createElement('div');
    modal.id = 'address-editor-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';

    const entry = edit && typeof index === 'number' ? (user.addresses[index] || {}) : {};

    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-md p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold">${edit ? 'تعديل العنوان' : 'أضف عنواناً جديداً'}</h3>
                <button id="addr-modal-close" class="text-gray-400">×</button>
            </div>
            <div class="space-y-3">
                <input id="addr-label" placeholder="اسم العنوان (مثل: المنزل)" class="w-full border-2 border-gray-200 rounded-lg px-4 py-2" value="${escapeHtml(entry.label||'')}" />
                <textarea id="addr-text" rows="3" placeholder="المدينة، الحي، الشارع" class="w-full border-2 border-gray-200 rounded-lg px-4 py-2">${escapeHtml(entry.address||'')}</textarea>
                <div class="flex gap-2">
                    <button id="addr-pick-map" class="flex-1 border-2 border-antika-gold text-antika-gold rounded-lg px-4 py-2">اختر من الخريطة</button>
                    <button id="addr-save" class="flex-1 bg-antika-pink text-white rounded-lg px-4 py-2">حفظ العنوان</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('addr-modal-close')?.addEventListener('click', () => modal.remove());

    document.getElementById('addr-pick-map')?.addEventListener('click', () => {
        window.open('map.html','Map','width=900,height=700');
        const intv = setInterval(()=>{
            const s = localStorage.getItem('selectedLocation');
            if (s) {
                try {
                    const loc = JSON.parse(s);
                    document.getElementById('addr-text').value = `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
                    clearInterval(intv);
                } catch(e){}
            }
        },500);
    });

    document.getElementById('addr-save')?.addEventListener('click', async () => {
        const label = document.getElementById('addr-label').value.trim();
        const address = document.getElementById('addr-text').value.trim();
        const locRaw = localStorage.getItem('selectedLocation');
        const location = locRaw ? JSON.parse(locRaw) : null;

        if (!label || !address) {
            alert('الرجاء إدخال اسم العنوان وتفاصيله');
            return;
        }

        try {
            let user = {};
            try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }

            const entry = { label, address, location };

            if (edit && typeof index === 'number') {
                if (user.email) {
                    const updated = await API.updateUserAddress(user.email, index, entry);
                    user = updated || user;
                } else {
                    user.addresses[index] = entry;
                }
            } else {
                if (user.email) {
                    const updated = await API.addUserAddress(user.email, entry);
                    user = updated || user;
                } else {
                    user.addresses = user.addresses || [];
                    user.addresses.push(entry);
                }
            }

            localStorage.setItem('antika_user', JSON.stringify(user));
            modal.remove();
            renderAddressesList();
        } catch (err) {
            console.error('Error saving address:', err);
            alert('حدث خطأ أثناء الحفظ');
        }
    });
}

async function setDefaultAddress(index) {
    let user = {};
    try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }
    user.addresses = user.addresses || [];

    // Find previous default
    const prevIdx = user.addresses.findIndex(a => a.isDefault);

    // Update local copy
    user.addresses.forEach((a, i) => a.isDefault = (i === index));

    // If logged in, update server: update previous and new (if exist)
    if (user.email) {
        try {
            // If previous default exists and not same as new, clear it
            if (prevIdx !== -1 && prevIdx !== index) {
                const prev = user.addresses[prevIdx];
                await API.updateUserAddress(user.email, prevIdx, prev);
            }
            // Update the new default address
            const newAddr = user.addresses[index];
            await API.updateUserAddress(user.email, index, newAddr);
        } catch (err) {
            console.error('Error syncing default address to server:', err);
            throw err;
        }
    }

    localStorage.setItem('antika_user', JSON.stringify(user));
}

function escapeHtml(s){
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ==================== UNIFIED SAVED LIST (locations + addresses) ====================

async function renderSavedList() {
    const container = document.getElementById('saved-list');
    const empty = document.getElementById('empty-saved');
    if (!container) return;
    container.innerHTML = '';

    let user = {};
    try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }

    // Try to fetch server copy if email exists
    if (user.email) {
        try {
            const serverUser = await API.getUser(user.email);
            if (serverUser && Object.keys(serverUser).length > 0) {
                user = Object.assign({}, serverUser);
                localStorage.setItem('antika_user', JSON.stringify(user));
            }
        } catch (e) {
            console.warn('Could not sync user saved list from server', e);
        }
    }

    const locations = user.locations || [];
    const addresses = user.addresses || [];

    const combined = [];
    // Keep order: locations first then addresses
    locations.forEach((l, i) => combined.push(Object.assign({ _type: 'location', _idx: i }, l)));
    addresses.forEach((a, i) => combined.push(Object.assign({ _type: 'address', _idx: i }, a)));

    if (!combined || combined.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    combined.forEach((item, displayIdx) => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4 hover:border-antika-gold transition group';

        const left = document.createElement('div');
        left.className = 'flex-1';
        const title = document.createElement('div');
        title.className = 'font-bold text-gray-900 flex items-center gap-2';
        const iconHtml = item._type === 'location' ? '<i class="fas fa-location-dot text-antika-pink"></i>' : '<i class="fas fa-map text-antika-gold"></i>';
        title.innerHTML = iconHtml + ' ' + (item.label || (item._type === 'location' ? `الموقع ${item._idx+1}` : `العنوان ${item._idx+1}`));

        const addr = document.createElement('div');
        addr.className = 'text-sm text-gray-600 mt-2';
        if (item.address) addr.textContent = item.address;
        else if (item.lat && item.lng) addr.textContent = `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`;
        else addr.textContent = 'لا توجد تفاصيل';

        left.appendChild(title);
        left.appendChild(addr);

        // Default badge
        if (item.isDefault) {
            const defBadge = document.createElement('div');
            defBadge.className = 'text-xs text-white bg-green-600 px-2 py-1 rounded mt-2 inline-block';
            defBadge.innerHTML = '<i class="fas fa-check ml-1"></i>افتراضي';
            left.appendChild(defBadge);
        }

        const actions = document.createElement('div');
        actions.className = 'relative';

        // Menu button
        const menuBtn = document.createElement('button');
        menuBtn.className = 'px-2 py-1 text-gray-400 hover:text-antika-gold hover:bg-gray-600 rounded transition text-lg';
        menuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';

        const menu = document.createElement('div');
        menu.className = 'hidden absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-max saved-menu';

        // Set default option
        const defaultOption = document.createElement('button');
        defaultOption.className = 'w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100 transition text-gray-700';
        defaultOption.innerHTML = '<i class="fas fa-star text-antika-gold"></i>اجعل افتراضي';
        if (item.isDefault) {
            defaultOption.disabled = true;
            defaultOption.className += ' opacity-50 cursor-not-allowed';
        }
        defaultOption.addEventListener('click', async () => {
            try {
                if (item._type === 'location') {
                    await setDefaultLocation(item._idx);
                } else {
                    await setDefaultAddress(item._idx);
                }
                renderSavedList();
            } catch (err) {
                console.error('Error setting default:', err);
                alert('حدث خطأ');
            }
        });

        // Edit option
        const editOption = document.createElement('button');
        editOption.className = 'w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100 transition text-gray-700';
        editOption.innerHTML = '<i class="fas fa-pen text-blue-400"></i>تعديل';
        editOption.addEventListener('click', () => {
            menu.classList.add('hidden');
            if (item._type === 'location') openLocationEditor(true, item._idx);
            else openAddressEditor(true, item._idx);
        });

        // Delete option
        const deleteOption = document.createElement('button');
        deleteOption.className = 'w-full text-right px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-sm transition text-red-600';
        deleteOption.innerHTML = '<i class="fas fa-trash"></i>حذف';
        deleteOption.addEventListener('click', async () => {
            if (!confirm('حذف هذا العنصر؟')) return;
            try {
                let user = {};
                try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }
                if (item._type === 'location') {
                    user.locations = user.locations || [];
                    user.locations.splice(item._idx,1);
                } else {
                    user.addresses = user.addresses || [];
                    user.addresses.splice(item._idx,1);
                }
                localStorage.setItem('antika_user', JSON.stringify(user));
                if (user.email) {
                    // sync full locations+addresses to server
                    await fetch(`/api/users/${encodeURIComponent(user.email)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ locations: user.locations || [], addresses: user.addresses || [] })
                    });
                }
                renderSavedList();
            } catch (err) {
                console.error('Error deleting item:', err);
                alert('حدث خطأ أثناء الحذف');
            }
        });

        menu.appendChild(defaultOption);
        menu.appendChild(editOption);
        menu.appendChild(deleteOption);

        menuBtn.addEventListener('click', (e)=>{ e.stopPropagation(); menu.classList.toggle('hidden'); });

        actions.appendChild(menuBtn);
        actions.appendChild(menu);

        card.appendChild(left);
        card.appendChild(actions);
        container.appendChild(card);
    });
}

// ==================== LOCATIONS MANAGEMENT ====================
// ==================== LOCATIONS MANAGEMENT ====================

async function renderLocationsList() {
    const container = document.getElementById('locations-list');
    const empty = document.getElementById('empty-locations');
    if (!container) return;
    
    container.innerHTML = '';

    let user = {};
    try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }

    // Try to fetch server copy if email exists
    if (user.email) {
        try {
            const serverUser = await API.getUser(user.email);
            if (serverUser && Object.keys(serverUser).length > 0) {
                user = Object.assign({}, serverUser);
                localStorage.setItem('antika_user', JSON.stringify(user));
            }
        } catch (e) {
            console.warn('Could not sync user locations from server', e);
        }
    }

    const locations = user.locations || [];
    if (!locations || locations.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    locations.forEach((loc, idx) => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4 hover:border-antika-pink transition';

        const left = document.createElement('div');
        left.className = 'flex-1';
        
        const title = document.createElement('div');
        title.className = 'font-bold text-gray-900 flex items-center gap-2';
        const icon = document.createElement('i');
        icon.className = 'fas fa-location-dot text-antika-pink';
        title.appendChild(icon);
        title.appendChild(document.createTextNode(loc.label || `الموقع ${idx+1}`));
        
        const coords = document.createElement('div');
        coords.className = 'text-xs text-gray-600 mt-2 font-mono';
        coords.textContent = `📍 ${loc.lat?.toFixed(4)}, ${loc.lng?.toFixed(4)}`;
        
        left.appendChild(title);
        left.appendChild(coords);

        // Default badge
        if (loc.isDefault) {
            const defBadge = document.createElement('div');
            defBadge.className = 'text-xs text-white bg-green-600 px-2 py-1 rounded mt-2 inline-block';
            defBadge.innerHTML = '<i class="fas fa-check ml-1"></i>افتراضي';
            left.appendChild(defBadge);
        }

        const actions = document.createElement('div');
        actions.className = 'relative';

        // Menu button (three dots)
        const menuBtn = document.createElement('button');
        menuBtn.className = 'px-2 py-1 text-gray-600 hover:text-antika-gold hover:bg-gray-100 rounded transition text-lg';
        menuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        menuBtn.setAttribute('aria-label', 'خيارات');

        // Dropdown menu (RTL - align right)
        const menu = document.createElement('div');
        menu.className = 'hidden absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-max saved-menu';

        // Set as default option
        const defaultOption = document.createElement('button');
        defaultOption.className = 'w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100 transition text-gray-700';
        defaultOption.innerHTML = '<i class="fas fa-star text-antika-gold"></i>اجعل افتراضي';
        if (loc.isDefault) {
            defaultOption.disabled = true;
            defaultOption.className += ' opacity-50 cursor-not-allowed';
        }
        defaultOption.addEventListener('click', async () => {
            try {
                await setDefaultLocation(idx);
                renderLocationsList();
            } catch (err) {
                console.error('Error setting default location:', err);
                alert('حدث خطأ');
            }
        });

        // Edit option
        const editOption = document.createElement('button');
        editOption.className = 'w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100 transition text-gray-700';
        editOption.innerHTML = '<i class="fas fa-pen text-blue-400"></i>تعديل';
        editOption.addEventListener('click', () => {
            menu.classList.add('hidden');
            openLocationEditor(true, idx);
        });

        // Delete option
        const deleteOption = document.createElement('button');
        deleteOption.className = 'w-full text-right px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-sm transition text-red-600';
        deleteOption.innerHTML = '<i class="fas fa-trash"></i>حذف';
        deleteOption.addEventListener('click', async () => {
            if (!confirm('حذف هذا الموقع؟')) return;
            try {
                if (user.email) {
                    user.locations = user.locations || [];
                    const newLocs = user.locations.filter((_, i) => i !== idx);
                    user.locations = newLocs;
                    // Update server
                    const resp = await fetch(`/api/users/${encodeURIComponent(user.email)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ locations: newLocs })
                    });
                    if (!resp.ok) throw new Error('Failed to delete location');
                } else {
                    user.locations = user.locations || [];
                    user.locations.splice(idx, 1);
                }
                localStorage.setItem('antika_user', JSON.stringify(user));
                renderLocationsList();
            } catch (err) {
                console.error('Error deleting location:', err);
                alert('حدث خطأ أثناء الحذف');
            }
        });

        menu.appendChild(defaultOption);
        menu.appendChild(editOption);
        menu.appendChild(deleteOption);

        // Toggle menu
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });

        actions.appendChild(menuBtn);
        actions.appendChild(menu);

        card.appendChild(left);
        card.appendChild(actions);
        container.appendChild(card);
    });
}

async function setDefaultLocation(index) {
    let user = {};
    try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }
    user.locations = user.locations || [];

    // Update local copy
    user.locations.forEach((l, i) => l.isDefault = (i === index));

    // If logged in, update server
    if (user.email) {
        try {
            const resp = await fetch(`/api/users/${encodeURIComponent(user.email)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations: user.locations })
            });
            if (!resp.ok) throw new Error('Failed to set default location');
        } catch (err) {
            console.error('Error syncing default location to server:', err);
            throw err;
        }
    }

    localStorage.setItem('antika_user', JSON.stringify(user));
}

function openLocationPicker() {
    // Open map and wait for selectedLocation
    window.open('map.html', 'Map', 'width=900,height=700');
    
    const checkInterval = setInterval(() => {
        const saved = localStorage.getItem('selectedLocation');
        if (saved) {
            clearInterval(checkInterval);
            try {
                const loc = JSON.parse(saved);
                // Show modal to name and save this location
                openLocationEditor(false, null, loc);
            } catch (e) {
                console.error('Error parsing location:', e);
            }
        }
    }, 500);
}

function openLocationEditor(edit = false, index = null, initialLoc = null) {
    const existing = document.getElementById('location-editor-modal');
    if (existing) existing.remove();

    let user = {};
    try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }
    user.locations = user.locations || [];

    const entry = edit && typeof index === 'number' ? (user.locations[index] || {}) : (initialLoc || {});

    const modal = document.createElement('div');
    modal.id = 'location-editor-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';

    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-md p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-lg"><i class="fas fa-map-pin text-antika-pink ml-2"></i>${edit ? 'تعديل الموقع' : 'احفظ هذا الموقع'}</h3>
                <button id="loc-modal-close" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div class="space-y-3">
                <div class="bg-antika-lavender p-3 rounded text-sm text-antika-pink">
                    <i class="fas fa-info-circle ml-2"></i>أعط هذا الموقع اسماً مثل: "المنزل" أو "العمل"
                </div>
                <input id="loc-label" placeholder="اسم الموقع" class="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-antika-gold outline-none transition" value="${escapeHtml(entry.label||'')}" />
                <div class="bg-gray-100 p-3 rounded text-sm font-mono text-gray-700">
                    📍 خط العرض: <span id="loc-lat">${entry.lat?.toFixed(6) || '---'}</span><br>
                    📍 خط الطول: <span id="loc-lng">${entry.lng?.toFixed(6) || '---'}</span>
                </div>
                ${!edit ? '<button id="loc-pick-map" class="w-full border-2 border-antika-gold text-antika-gold rounded-lg px-4 py-3 hover:bg-antika-lavender transition"><i class="fas fa-map ml-1"></i>فتح الخريطة لاختيار موقع آخر</button>' : ''}
                <button id="loc-save" class="w-full bg-antika-pink text-white rounded-lg px-4 py-2 hover:bg-antika-pink-dark transition"><i class="fas fa-save ml-1"></i>احفظ الموقع</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('loc-modal-close')?.addEventListener('click', () => modal.remove());

    if (!edit) {
        document.getElementById('loc-pick-map')?.addEventListener('click', () => {
            window.open('map.html', 'Map', 'width=900,height=700');
            const intv = setInterval(() => {
                const s = localStorage.getItem('selectedLocation');
                if (s) {
                    try {
                        const loc = JSON.parse(s);
                        document.getElementById('loc-lat').textContent = loc.lat.toFixed(6);
                        document.getElementById('loc-lng').textContent = loc.lng.toFixed(6);
                        entry.lat = loc.lat;
                        entry.lng = loc.lng;
                        clearInterval(intv);
                    } catch (e) {}
                }
            }, 500);
        });
    }

    document.getElementById('loc-save')?.addEventListener('click', async () => {
        const label = document.getElementById('loc-label').value.trim();
        if (!label) {
            alert('الرجاء إدخال اسم الموقع');
            return;
        }
        if (!entry.lat || !entry.lng) {
            alert('الرجاء اختيار الموقع من الخريطة');
            return;
        }

        try {
            let user = {};
            try { user = JSON.parse(localStorage.getItem('antika_user') || '{}'); } catch(e){ user = {}; }
            user.locations = user.locations || [];

            const locEntry = { label, lat: entry.lat, lng: entry.lng, isDefault: user.locations.length === 0 };

            if (edit && typeof index === 'number') {
                user.locations[index] = locEntry;
            } else {
                user.locations.push(locEntry);
            }

            // Update server if logged in
            if (user.email) {
                try {
                    const resp = await fetch(`/api/users/${encodeURIComponent(user.email)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ locations: user.locations })
                    });
                    if (!resp.ok) throw new Error('Failed to save location');
                } catch (err) {
                    console.error('Error syncing location to server:', err);
                    // Continue even if sync fails
                }
            }

            localStorage.setItem('antika_user', JSON.stringify(user));
            localStorage.removeItem('selectedLocation');
            modal.remove();
            renderLocationsList();
        } catch (err) {
            console.error('Error saving location:', err);
            alert('حدث خطأ أثناء الحفظ');
        }
    });
}
