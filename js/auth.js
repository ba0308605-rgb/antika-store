// 🌸 Antika Store - Authentication Module
// Handles user authentication with Firebase and Admin login

// Admin credentials (hardcoded for admin access)
const ADMIN_CREDENTIALS = {
    username: 'BDR-FIRST',
    password: 'B1-a2d3e4r5',
    email: 'admin@antika-store.com',
    name: 'BDR-FIRST'
};

// Auth state management
const Auth = {
    // Current user data
    currentUser: null,
    authFlowStorageKey: 'antika_auth_in_progress',
    manualLogoutStorageKey: 'antika_manual_logout',
    googleProfileRequiredKey: 'antika_google_profile_required',

    setAuthInProgress(flag) {
        try {
            if (flag) sessionStorage.setItem(this.authFlowStorageKey, '1');
            else sessionStorage.removeItem(this.authFlowStorageKey);
        } catch (e) {}
    },

    isAuthInProgress() {
        try {
            return sessionStorage.getItem(this.authFlowStorageKey) === '1';
        } catch (e) {
            return false;
        }
    },

    setManualLogout(flag) {
        try {
            if (flag) sessionStorage.setItem(this.manualLogoutStorageKey, '1');
            else sessionStorage.removeItem(this.manualLogoutStorageKey);
        } catch (e) {}
    },

    wasManualLogout() {
        try {
            return sessionStorage.getItem(this.manualLogoutStorageKey) === '1';
        } catch (e) {
            return false;
        }
    },

    setGoogleProfileRequired(flag) {
        try {
            if (flag) localStorage.setItem(this.googleProfileRequiredKey, '1');
            else localStorage.removeItem(this.googleProfileRequiredKey);
        } catch (e) {}
    },

    isGoogleProfileRequired() {
        try {
            return localStorage.getItem(this.googleProfileRequiredKey) === '1';
        } catch (e) {
            return false;
        }
    },

    isGoogleProvider(firebaseUser) {
        try {
            const providers = Array.isArray(firebaseUser?.providerData) ? firebaseUser.providerData : [];
            return providers.some((p) => p && p.providerId === 'google.com');
        } catch (e) {
            return false;
        }
    },

    isProfileComplete(profile) {
        if (!profile || typeof profile !== 'object') return false;
        const firstName = String(profile.firstName || '').trim();
        const birthDate = String(profile.birthDate || '').trim();
        const gender = String(profile.gender || '').trim();
        const hasRequiredFields = Boolean(firstName && birthDate && gender);
        return profile.profileCompleted === true || hasRequiredFields;
    },

    maybeRedirectToGoogleProfileCompletion() {
        try {
            if (!this.currentUser || this.currentUser.isAdmin) return;
            const needsProfile =
                this.currentUser.provider === 'google' &&
                (this.currentUser.profileCompleted === false || this.isGoogleProfileRequired());
            if (!needsProfile) return;

            const page = (window.location.pathname.split('/').pop() || '').toLowerCase();
            const params = new URLSearchParams(window.location.search || '');
            const isOnGoogleProfilePage = page === 'register.html' && params.get('mode') === 'google-profile';
            if (!isOnGoogleProfilePage) {
                window.location.href = 'register.html?mode=google-profile';
            }
        } catch (e) {}
    },
    
    // Initialize auth system
    init() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('antika_user');
        
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                console.log('✅ User restored from localStorage:', this.currentUser.name);
            } catch (e) {
                console.error('Error parsing user data:', e);
                this.logout();
            }
        }
        
        // Setup Firebase auth listener if available
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    // Only restore Firebase user if we have saved user data
                    // This prevents auto-login after manual logout
                    const hasSavedUser = localStorage.getItem('antika_user') !== null;
                    if (!hasSavedUser) {
                        const isManualLogout = this.wasManualLogout();
                        const authInProgress = this.isAuthInProgress();
                        if (isManualLogout && !authInProgress) {
                            console.log('⚠️ Firebase user exists but no saved data - user logged out manually');
                            // Sign out from Firebase to sync state
                            firebase.auth().signOut();
                            return;
                        }
                    }
                    
                    // Firebase user is signed in
                    let savedProfile = {};
                    try {
                        savedProfile = JSON.parse(localStorage.getItem('antika_user') || '{}') || {};
                    } catch (e) {}
                    this.currentUser = {
                        ...savedProfile,
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || user.email.split('@')[0],
                        isAdmin: false, // Regular users are not admins
                        photoURL: user.photoURL,
                        provider: this.isGoogleProvider(user) ? 'google' : 'firebase'
                    };
                    this.saveUserToStorage();
                    this.setManualLogout(false);
                    this.maybeRedirectToGoogleProfileCompletion();
                    console.log('✅ Firebase user signed in:', user.email);
                } else {
                    if (this.isAuthInProgress()) {
                        return;
                    }
                    // If local user exists but Firebase session is gone, clear stale local auth
                    const savedUser = localStorage.getItem('antika_user');
                    if (savedUser) {
                        try {
                            const parsed = JSON.parse(savedUser);
                            if (parsed && parsed.uid && !parsed.isAdmin) {
                                console.warn('⚠️ Firebase session expired, clearing local user');
                                this.clearLocalUserSession();
                            }
                        } catch (e) {}
                    }
                }
            });
        }
    },

    // Try to recover current user from localStorage when Auth state is delayed.
    hydrateCurrentUserFromStorage() {
        if (this.currentUser && this.currentUser.uid) return true;
        try {
            const savedUser = localStorage.getItem('antika_user');
            if (!savedUser) return false;
            const parsed = JSON.parse(savedUser);
            if (parsed && parsed.uid) {
                this.currentUser = parsed;
                return true;
            }
        } catch (e) {}
        return false;
    },

    isPermissionDeniedError(err) {
        const code = err && err.code ? String(err.code).toLowerCase() : '';
        const message = err && err.message ? String(err.message).toLowerCase() : '';
        return code.includes('permission-denied') || message.includes('insufficient permissions');
    },

    clearLocalUserSession() {
        localStorage.removeItem('antika_user');
        localStorage.removeItem('antika_token');
        this.setGoogleProfileRequired(false);
        this.currentUser = null;
    },

    validateFirebaseSession() {
        if (!this.hydrateCurrentUserFromStorage()) {
            return { ok: false, error: 'يجب تسجيل الدخول أولا' };
        }

        if (this.currentUser && this.currentUser.isAdmin) {
            return { ok: false, error: 'حساب الادمن لا يستخدم المفضلة' };
        }

        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
            return { ok: false, error: 'خدمة الحساب غير متاحة حاليا' };
        }

        const firebaseUser = firebase.auth().currentUser;
        if (!firebaseUser || !this.currentUser || firebaseUser.uid !== this.currentUser.uid) {
            this.clearLocalUserSession();
            return { ok: false, error: 'انتهت جلسة تسجيل الدخول. سجل دخولك مرة اخرى' };
        }

        return { ok: true };
    },

    getWishlistStorageKey() {
        const scope = String(
            (this.currentUser && (this.currentUser.uid || this.currentUser.email)) || 'guest'
        ).toLowerCase();
        return `wishlist_${scope}`;
    },

    getLocalWishlistItems() {
        try {
            const ids = JSON.parse(localStorage.getItem(this.getWishlistStorageKey()) || '[]');
            if (!Array.isArray(ids)) return [];
            return ids.map(String).filter(Boolean).map((id) => ({
                id,
                productId: id,
                localOnly: true
            }));
        } catch (e) {
            return [];
        }
    },

    syncWishlistLocalFromRemote(items) {
        try {
            const ids = (Array.isArray(items) ? items : [])
                .map((item) => String(item.productId || item.id || ''))
                .filter(Boolean);
            localStorage.setItem(this.getWishlistStorageKey(), JSON.stringify(Array.from(new Set(ids))));
        } catch (e) {}
    },

    addToLocalWishlist(productId) {
        try {
            const key = this.getWishlistStorageKey();
            const current = JSON.parse(localStorage.getItem(key) || '[]');
            const list = Array.isArray(current) ? current.map(String) : [];
            const id = String(productId);
            if (!list.includes(id)) list.push(id);
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {}
    },

    removeFromLocalWishlist(productId) {
        try {
            const key = this.getWishlistStorageKey();
            const current = JSON.parse(localStorage.getItem(key) || '[]');
            const list = (Array.isArray(current) ? current : [])
                .map(String)
                .filter((id) => id !== String(productId));
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {}
    },
    
    // Admin login (for admin panel)
    async adminLogin(username, password) {
        // Check admin credentials
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            // Generate secure token
            const token = 'admin_' + btoa(Date.now() + '_' + Math.random().toString(36).substr(2, 9));
            
            this.currentUser = {
                name: ADMIN_CREDENTIALS.name,
                email: ADMIN_CREDENTIALS.email,
                username: ADMIN_CREDENTIALS.username,
                isAdmin: true,
                loginTime: new Date().toISOString(),
                provider: 'local'
            };
            
            // Save to localStorage
            localStorage.setItem('antika_token', token);
            localStorage.setItem('antika_user', JSON.stringify(this.currentUser));
            this.setManualLogout(false);
            
            console.log('✅ Admin logged in successfully');
            return { success: true, user: this.currentUser };
        }
        
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة!' };
    },
    
    // User login with Firebase
    async userLogin(email, password) {
        this.setAuthInProgress(true);
        this.setManualLogout(false);
        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                throw new Error('Firebase not initialized');
            }
            
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                isAdmin: false,
                photoURL: user.photoURL,
                provider: 'firebase'
            };
            
            this.saveUserToStorage();
            this.setManualLogout(false);
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'البريد الإلكتروني غير مسجل';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'كلمة المرور غير صحيحة';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'تم تعطيل الحساب';
                    break;
            }
            
            return { success: false, error: errorMessage };
        } finally {
            this.setAuthInProgress(false);
        }
    },
    
    // User registration with Firebase
    // originalEmail: the email the user actually entered (may be empty when registering with phone only)
    async userRegister(name, email, password, phone = '', originalEmail = null) {
        this.setAuthInProgress(true);
        this.setManualLogout(false);
        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                throw new Error('Firebase not initialized');
            }
            
            console.log('📝 Creating Firebase auth user...');
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ Auth user created:', user.uid);
            
            // Update profile with name
            await user.updateProfile({ displayName: name });
            
            // Keep currentUser.email as the auth-email
            const authEmail = originalEmail || user.email || email;
            this.currentUser = {
                uid: user.uid,
                email: authEmail,
                name: name,
                phone: phone,
                isAdmin: false,
                provider: 'firebase'
            };
            
            this.saveUserToStorage();
            this.setManualLogout(false);
            
            // Save to Firestore in background (async - don't wait)
            if (firebase.firestore) {
                const isPhoneOnly = !originalEmail;
                const emailToStore = originalEmail || null;
                firebase.firestore().collection('users').doc(user.uid).set({
                    name: name,
                    email: emailToStore,
                    phone: phone,
                    phoneOnly: !!isPhoneOnly,
                    createdAt: new Date().toISOString(),
                    isAdmin: false
                }).catch(err => {
                    console.warn('⚠️ Firestore save failed in background:', err.message);
                });
            }
            
            console.log('✅ User registration complete - redirecting now');
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('❌ Registration error:', error);
            let errorMessage = 'حدث خطأ أثناء التسجيل';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'كلمة المرور ضعيفة جداً (6 أحرف على الأقل)';
                    break;
            }
            
            return { success: false, error: errorMessage };
        } finally {
            this.setAuthInProgress(false);
        }
    },
    async googleLogin() {
        this.setAuthInProgress(true);
        this.setManualLogout(false);
        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                throw new Error('Firebase not initialized');
            }
            
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;

            let profileData = {};
            let requiresProfileCompletion = false;
            if (firebase.firestore) {
                const userRef = firebase.firestore().collection('users').doc(user.uid);
                const profileSnapshot = await userRef.get();
                if (profileSnapshot.exists) {
                    profileData = profileSnapshot.data() || {};
                }

                requiresProfileCompletion = !this.isProfileComplete(profileData);

                await userRef.set({
                    name: profileData.name || user.displayName || (user.email ? user.email.split('@')[0] : ''),
                    email: profileData.email || user.email || null,
                    photoURL: profileData.photoURL || user.photoURL || '',
                    provider: 'google',
                    firstName: profileData.firstName || '',
                    lastName: profileData.lastName || '',
                    phone: profileData.phone || '',
                    birthDate: profileData.birthDate || '',
                    gender: profileData.gender || '',
                    profileCompleted: requiresProfileCompletion ? false : true,
                    lastLoginAt: new Date().toISOString(),
                    createdAt: profileData.createdAt || new Date().toISOString()
                }, { merge: true });
            }
            
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                name: profileData.name || user.displayName || (user.email ? user.email.split('@')[0] : ''),
                photoURL: user.photoURL,
                isAdmin: false,
                provider: 'google',
                firstName: profileData.firstName || '',
                lastName: profileData.lastName || '',
                phone: profileData.phone || '',
                birthDate: profileData.birthDate || '',
                gender: profileData.gender || '',
                profileCompleted: !requiresProfileCompletion
            };
            
            this.saveUserToStorage();
            this.setManualLogout(false);
            this.setGoogleProfileRequired(requiresProfileCompletion);
            
            return { success: true, user: this.currentUser, requiresProfileCompletion };
        } catch (error) {
            console.error('Google login error:', error);
            return { success: false, error: 'فشل تسجيل الدخول بـ Google' };
        } finally {
            this.setAuthInProgress(false);
        }
    },
    
    // Logout
    async logout() {
        this.setAuthInProgress(false);
        this.setManualLogout(true);
        try {
            // Sign out from Firebase if available
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().signOut();
            }
        } catch (e) {
            console.warn('Firebase logout error:', e);
        }
        
        // Clear local storage
        localStorage.removeItem('antika_token');
        localStorage.removeItem('antika_user');
        this.setGoogleProfileRequired(false);
        
        this.currentUser = null;
        
        console.log('✅ User logged out');
        return { success: true };
    },

    // Delete account permanently (removes server-side data and Firebase account)
    async deleteAccount() {
        try {
            const user = this.getCurrentUser();
            if (!user || !user.email) return { success: false, error: 'No user logged in' };

            // Ask for confirmation
            const ok = window.confirm('هل أنت متأكد من حذف حسابك نهائياً؟ سيتم حذف جميع الطلبات والعناوين المرتبطة ولن يمكن استعادتها.');
            if (!ok) return { success: false, error: 'Cancelled' };

            // Call server endpoint to remove orders and user record
            try {
                const resp = await fetch('/api/users/' + encodeURIComponent(user.email), { method: 'DELETE' });
                if (!resp.ok) {
                    const j = await resp.json().catch(()=>({}));
                    console.warn('Server delete returned non-ok', j);
                }
            } catch (e) {
                console.warn('Error calling server delete:', e);
            }

            // Delete from Firebase if available and provider is firebase
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                try {
                    await firebase.auth().currentUser.delete();
                } catch (err) {
                    // If deletion requires recent login, sign out and ask user to re-login
                    console.warn('Firebase delete error:', err);
                    if (err.code === 'auth/requires-recent-login') {
                        alert('لحماية حسابك، يلزم إعادة تسجيل الدخول قبل حذف الحساب نهائيًا. يرجى تسجيل الخروج ثم تسجيل الدخول مجددًا والمحاولة.');
                        return { success: false, error: 'requires-recent-login' };
                    }
                }
            }

            // Clear local storage and tokens
            await this.logout();
            // Redirect to homepage
            window.location.href = 'index.html';
            return { success: true };
        } catch (e) {
            console.error('deleteAccount error', e);
            return { success: false, error: e.message };
        }
    },
    
    // Save user to localStorage
    saveUserToStorage() {
        if (this.currentUser) {
            localStorage.setItem('antika_user', JSON.stringify(this.currentUser));
            // Generate a simple token
            const token = 'token_' + btoa(Date.now() + '_' + Math.random().toString(36).substr(2, 9));
            localStorage.setItem('antika_token', token);
            // Attempt to sync basic user info (name, phone) to server if API is available
            try {
                if (this.currentUser.email && window.API && typeof API.upsertUser === 'function') {
                    // Fire-and-forget sync; do not block UI
                    API.upsertUser(this.currentUser.email, {
                        name: this.currentUser.name || '',
                        phone: this.currentUser.phone || this.currentUser.phoneNumber || ''
                    }).catch(err => {
                        console.warn('User sync to server failed:', err);
                    });
                }
            } catch (e) {
                console.warn('Error attempting to sync user to server:', e);
            }
        }
    },
    
    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    },
    
    // Check if current user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.isAdmin === true;
    },
    
    // Get current user
    getCurrentUser() {
        this.hydrateCurrentUserFromStorage();
        return this.currentUser;
    },
    
    // Auth state observer - mimics Firebase's onAuthStateChanged
    onAuthStateChanged(callback) {
        // Check localStorage first
        const savedUser = localStorage.getItem('antika_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                this.currentUser = user;
                callback(user);
            } catch (e) {
                callback(null);
            }
        } else {
            callback(null);
        }
        
        // Also listen to Firebase auth state if available
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged((firebaseUser) => {
                if (firebaseUser) {
                    // Only restore Firebase user if we have saved user data
                    const hasSavedUser = localStorage.getItem('antika_user') !== null;
                    if (!hasSavedUser) {
                        const isManualLogout = this.wasManualLogout();
                        const authInProgress = this.isAuthInProgress();
                        if (isManualLogout && !authInProgress) {
                            console.log('⚠️ Firebase user exists but no saved data - user logged out manually');
                            firebase.auth().signOut();
                            return;
                        }
                    }
                    
                    this.currentUser = {
                        ...(this.currentUser || {}),
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                        isAdmin: false,
                        photoURL: firebaseUser.photoURL,
                        provider: this.isGoogleProvider(firebaseUser) ? 'google' : 'firebase'
                    };
                    this.saveUserToStorage();
                    this.setManualLogout(false);
                    this.maybeRedirectToGoogleProfileCompletion();
                    callback(this.currentUser);
                } else {
                    if (this.isAuthInProgress()) {
                        return;
                    }
                    if (this.currentUser && this.currentUser.uid && !this.currentUser.isAdmin) {
                        this.clearLocalUserSession();
                    }
                    callback(null);
                }
            });
        }
        
        // Return unsubscribe function
        return () => {};
    },
    
    // Update user profile with additional fields (birthDate, gender, lastName)
    async updateUserProfile(updates) {
        try {
            if (!this.currentUser) return { success: false, error: 'No user logged in' };
            
            // Update in-memory current user
            this.currentUser = { ...this.currentUser, ...updates };
            this.saveUserToStorage();
            
            // Sync to server if API available
            if (this.currentUser.email && window.API && typeof API.upsertUser === 'function') {
                try {
                    await API.upsertUser(this.currentUser.email, {
                        firstName: updates.firstName || this.currentUser.firstName || '',
                        lastName: updates.lastName || this.currentUser.lastName || '',
                        phone: updates.phone || this.currentUser.phone || '',
                        birthDate: updates.birthDate || this.currentUser.birthDate || '',
                        gender: updates.gender || this.currentUser.gender || '',
                        name: this.currentUser.name
                    });
                } catch (e) {
                    console.warn('Failed to sync profile to server:', e);
                }
            }
            
            // Also update Firebase if available
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentUser.uid) {
                try {
                    await firebase.firestore().collection('users').doc(this.currentUser.uid).set(updates, { merge: true });
                } catch (e) {
                    console.warn('Failed to update Firebase profile:', e);
                }
            }

            if (updates && updates.profileCompleted === true) {
                this.setGoogleProfileRequired(false);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Profile update error:', error);
            return { success: false, error: error.message };
        }
    },

    async completeGoogleProfile(profileUpdates) {
        try {
            if (!this.currentUser || !this.currentUser.uid) {
                return { success: false, error: 'يجب تسجيل الدخول أولا' };
            }

            const payload = {
                firstName: (profileUpdates.firstName || '').trim(),
                lastName: (profileUpdates.lastName || '').trim(),
                birthDate: profileUpdates.birthDate || '',
                gender: profileUpdates.gender || '',
                name: profileUpdates.name || '',
                phone: profileUpdates.phone || this.currentUser.phone || '',
                email: this.currentUser.email || null,
                provider: 'google',
                profileCompleted: true,
                profileCompletedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.currentUser = { ...this.currentUser, ...payload };
            this.saveUserToStorage();
            this.setGoogleProfileRequired(false);

            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser && payload.name) {
                try {
                    await firebase.auth().currentUser.updateProfile({ displayName: payload.name });
                } catch (e) {
                    console.warn('Failed to update Firebase display name:', e);
                }
            }

            if (typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore()
                    .collection('users')
                    .doc(this.currentUser.uid)
                    .set(payload, { merge: true });
            }

            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('completeGoogleProfile error:', error);
            return { success: false, error: error.message || 'فشل حفظ بيانات الحساب' };
        }
    },
    
    
    // Reset password
    async resetPassword(email) {
        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                throw new Error('Firebase not initialized');
            }
            
            await firebase.auth().sendPasswordResetEmail(email);
            return { success: true, message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك' };
        } catch (error) {
            console.error('Reset password error:', error);
            let errorMessage = 'فشل إرسال رابط إعادة التعيين';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'البريد الإلكتروني غير مسجل';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
            }
            
            return { success: false, error: errorMessage };
        }
    },

    // ============================================
    // USER DATA MANAGEMENT (Addresses, Wishlist, Orders)
    // ============================================

    // Get user's addresses
    async getAddresses() {
        if (!this.hydrateCurrentUserFromStorage()) {
            console.warn('⚠️ No logged-in user');
            return [];
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                console.warn('⚠️ Firestore not available');
                return [];
            }

            const snapshot = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('addresses')
                .get();

            const addresses = [];
            snapshot.forEach(doc => {
                addresses.push({ id: doc.id, ...doc.data() });
            });

            console.log('✅ Addresses loaded:', addresses.length);
            return addresses;
        } catch (err) {
            console.error('Error loading addresses:', err);
            return [];
        }
    },

    // Add new address for user
    async addAddress(address) {
        if (!this.hydrateCurrentUserFromStorage()) {
            return { success: false, error: 'يجب تسجيل الدخول أولاً' };
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                throw new Error('Firestore not initialized');
            }

            const addressRef = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('addresses')
                .add({
                    label: address.label || 'العنوان',
                    address: address.address,
                    location: {
                        lat: address.lat || null,
                        lng: address.lng || null
                    },
                    createdAt: new Date().toISOString()
                });

            console.log('✅ Address added:', addressRef.id);
            return { success: true, id: addressRef.id };
        } catch (err) {
            console.error('Error adding address:', err);
            return { success: false, error: err.message };
        }
    },

    // Delete address
    async deleteAddress(addressId) {
        if (!this.hydrateCurrentUserFromStorage()) {
            return { success: false, error: 'يجب تسجيل الدخول أولاً' };
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                throw new Error('Firestore not initialized');
            }

            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('addresses')
                .doc(addressId)
                .delete();

            console.log('✅ Address deleted:', addressId);
            return { success: true };
        } catch (err) {
            console.error('Error deleting address:', err);
            return { success: false, error: err.message };
        }
    },

    // Get user's wishlist
    async getWishlist() {
        const session = this.validateFirebaseSession();
        if (!session.ok) {
            console.warn('⚠️', session.error);
            return [];
        }

        try {
            const snapshot = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('wishlist')
                .get();

            const wishlist = [];
            snapshot.forEach(doc => {
                wishlist.push({ id: doc.id, ...doc.data() });
            });

            this.syncWishlistLocalFromRemote(wishlist);
            console.log('✅ Wishlist loaded:', wishlist.length);
            return wishlist;
        } catch (err) {
            if (this.isPermissionDeniedError(err)) {
                console.warn('⚠️ Wishlist permission denied - using local fallback');
                return this.getLocalWishlistItems();
            }
            console.error('Error loading wishlist:', err);
            return [];
        }
    },

    // Add product to wishlist
    async addToWishlist(productId, productName, productImage, productPrice) {
        const session = this.validateFirebaseSession();
        if (!session.ok) {
            return { success: false, error: session.error };
        }

        try {
            // If product details are not provided, try to fetch them from API or localStorage
            if (!productName || productImage === undefined || productPrice === undefined) {
                try {
                    if (typeof API !== 'undefined' && typeof API.getProduct === 'function') {
                        const prod = await API.getProduct(productId);
                        if (prod) {
                            productName = productName || prod.name || prod.title || '';
                            productImage = productImage === undefined ? (Array.isArray(prod.images) ? prod.images[0] : prod.image || '') : productImage;
                            productPrice = productPrice === undefined ? (prod.discountPrice || prod.price || null) : productPrice;
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch product details for wishlist:', e);
                }

            }

            // Check if product already in wishlist
            const existing = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('wishlist')
                .doc(productId)
                .get();

            if (existing.exists) {
                return { success: false, error: 'المنتج موجود بالفعل في المفضلة' };
            }

            // Build payload without undefined values (Firestore rejects undefined)
            const payload = { productId: productId, addedAt: new Date().toISOString() };
            if (productName !== undefined) payload.name = productName || '';
            if (productImage !== undefined) payload.image = productImage || '';
            if (productPrice !== undefined) payload.price = productPrice === null ? null : productPrice;

            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('wishlist')
                .doc(productId)
                .set(payload);

            this.addToLocalWishlist(productId);
            console.log('✅ Product added to wishlist:', productId);
            return { success: true };
        } catch (err) {
            if (this.isPermissionDeniedError(err)) {
                this.addToLocalWishlist(productId);
                return { success: true, localOnly: true };
            }
            console.error('Error adding to wishlist:', err);
            return { success: false, error: err.message };
        }
    },

    // Remove product from wishlist
    async removeFromWishlist(productId) {
        const session = this.validateFirebaseSession();
        if (!session.ok) {
            return { success: false, error: session.error };
        }

        try {
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('wishlist')
                .doc(productId)
                .delete();

            this.removeFromLocalWishlist(productId);
            console.log('✅ Product removed from wishlist:', productId);
            return { success: true };
        } catch (err) {
            if (this.isPermissionDeniedError(err)) {
                this.removeFromLocalWishlist(productId);
                return { success: true, localOnly: true };
            }
            console.error('Error removing from wishlist:', err);
            return { success: false, error: err.message };
        }
    },

    // Get user's orders
    async getOrders() {
        if (!this.hydrateCurrentUserFromStorage()) {
            console.warn('⚠️ No logged-in user');
            return [];
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                console.warn('⚠️ Firestore not available');
                return [];
            }

            const snapshot = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('orders')
                .orderBy('createdAt', 'desc')
                .get();

            const orders = [];
            snapshot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            console.log('✅ Orders loaded:', orders.length);
            return orders;
        } catch (err) {
            console.error('Error loading orders:', err);
            return [];
        }
    },

    // Add order for user
    async addOrder(orderData) {
        if (!this.hydrateCurrentUserFromStorage()) {
            return { success: false, error: 'يجب تسجيل الدخول أولاً' };
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                throw new Error('Firestore not initialized');
            }

            const orderRef = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('orders')
                .add({
                    ...orderData,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

            console.log('✅ Order created:', orderRef.id);
            return { success: true, id: orderRef.id };
        } catch (err) {
            console.error('Error creating order:', err);
            return { success: false, error: err.message };
        }
    }

};

// Initialize auth on script load
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

// Export for global use
// Make Auth available globally
window.Auth = Auth;

