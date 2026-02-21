// ًںŒ¸ Antika Store - Authentication Module
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
    
    // Initialize auth system
    init() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('antika_user');
        
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                console.log('âœ… User restored from localStorage:', this.currentUser.name);
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
                        console.log('âڑ ï¸ڈ Firebase user exists but no saved data - user logged out manually');
                        // Sign out from Firebase to sync state
                        firebase.auth().signOut();
                        return;
                    }
                    
                    // Firebase user is signed in
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || user.email.split('@')[0],
                        isAdmin: false, // Regular users are not admins
                        photoURL: user.photoURL,
                        provider: 'firebase'
                    };
                    this.saveUserToStorage();
                    console.log('âœ… Firebase user signed in:', user.email);
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
            
            console.log('âœ… Admin logged in successfully');
            return { success: true, user: this.currentUser };
        }
        
        return { success: false, error: 'ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ… ط£ظˆ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± طµط­ظٹط­ط©!' };
    },
    
    // User login with Firebase
    async userLogin(email, password) {
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
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط؛ظٹط± ظ…ط³ط¬ظ„';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± طµط­ظٹط­ط©';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط؛ظٹط± طµط§ظ„ط­';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'طھظ… طھط¹ط·ظٹظ„ ط§ظ„ط­ط³ط§ط¨';
                    break;
            }
            
            return { success: false, error: errorMessage };
        }
    },
    
    // User registration with Firebase
    // originalEmail: the email the user actually entered (may be empty when registering with phone only)
    async userRegister(name, email, password, phone = '', originalEmail = null) {
        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                throw new Error('Firebase not initialized');
            }
            
            console.log('ًں“‌ Creating Firebase auth user...');
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('âœ… Auth user created:', user.uid);
            
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
                    console.warn('âڑ ï¸ڈ Firestore save failed in background:', err.message);
                });
            }
            
            console.log('âœ… User registration complete - redirecting now');
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('â‌Œ Registration error:', error);
            let errorMessage = 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھط³ط¬ظٹظ„';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ط³طھط®ط¯ظ… ط¨ط§ظ„ظپط¹ظ„';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط؛ظٹط± طµط§ظ„ط­';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط¶ط¹ظٹظپط© ط¬ط¯ط§ظ‹ (6 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„)';
                    break;
            }
            
            return { success: false, error: errorMessage };
        }
    },
    async googleLogin() {
        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                throw new Error('Firebase not initialized');
            }
            
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;
            
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                name: user.displayName,
                photoURL: user.photoURL,
                isAdmin: false,
                provider: 'google'
            };
            
            this.saveUserToStorage();
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Google login error:', error);
            return { success: false, error: 'ظپط´ظ„ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¨ظ€ Google' };
        }
    },
    
    // Logout
    async logout() {
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
        
        this.currentUser = null;
        
        console.log('âœ… User logged out');
        return { success: true };
    },

    // Delete account permanently (removes server-side data and Firebase account)
    async deleteAccount() {
        try {
            const user = this.getCurrentUser();
            if (!user || !user.email) return { success: false, error: 'No user logged in' };

            // Ask for confirmation
            const ok = window.confirm('ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ط­ط³ط§ط¨ظƒ ظ†ظ‡ط§ط¦ظٹط§ظ‹طں ط³ظٹطھظ… ط­ط°ظپ ط¬ظ…ظٹط¹ ط§ظ„ط·ظ„ط¨ط§طھ ظˆط§ظ„ط¹ظ†ط§ظˆظٹظ† ط§ظ„ظ…ط±طھط¨ط·ط© ظˆظ„ظ† ظٹظ…ظƒظ† ط§ط³طھط¹ط§ط¯طھظ‡ط§.');
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
                        alert('ظ„ط­ظ…ط§ظٹط© ط­ط³ط§ط¨ظƒطŒ ظٹظ„ط²ظ… ط¥ط¹ط§ط¯ط© طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ظ‚ط¨ظ„ ط­ط°ظپ ط§ظ„ط­ط³ط§ط¨ ظ†ظ‡ط§ط¦ظٹظ‹ط§. ظٹط±ط¬ظ‰ طھط³ط¬ظٹظ„ ط§ظ„ط®ط±ظˆط¬ ط«ظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ظ…ط¬ط¯ط¯ظ‹ط§ ظˆط§ظ„ظ…ط­ط§ظˆظ„ط©.');
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
                        console.log('âڑ ï¸ڈ Firebase user exists but no saved data - user logged out manually');
                        firebase.auth().signOut();
                        return;
                    }
                    
                    this.currentUser = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                        isAdmin: false,
                        photoURL: firebaseUser.photoURL,
                        provider: 'firebase'
                    };
                    this.saveUserToStorage();
                    callback(this.currentUser);
                } else if (!this.currentUser) {
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
                    await firebase.firestore().collection('users').doc(this.currentUser.uid).update(updates);
                } catch (e) {
                    console.warn('Failed to update Firebase profile:', e);
                }
            }
            
            return { success: true };
        } catch (error) {
            console.error('Profile update error:', error);
            return { success: false, error: error.message };
        }
    },
    
    
    // Reset password
    async resetPassword(email) {
        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                throw new Error('Firebase not initialized');
            }
            
            await firebase.auth().sendPasswordResetEmail(email);
            return { success: true, message: 'طھظ… ط¥ط±ط³ط§ظ„ ط±ط§ط¨ط· ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط¥ظ„ظ‰ ط¨ط±ظٹط¯ظƒ' };
        } catch (error) {
            console.error('Reset password error:', error);
            let errorMessage = 'ظپط´ظ„ ط¥ط±ط³ط§ظ„ ط±ط§ط¨ط· ط¥ط¹ط§ط¯ط© ط§ظ„طھط¹ظٹظٹظ†';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط؛ظٹط± ظ…ط³ط¬ظ„';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط؛ظٹط± طµط§ظ„ط­';
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
            console.warn('âڑ ï¸ڈ No logged-in user');
            return [];
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                console.warn('âڑ ï¸ڈ Firestore not available');
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

            console.log('âœ… Addresses loaded:', addresses.length);
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
                    label: address.label || 'ط§ظ„ط¹ظ†ظˆط§ظ†',
                    address: address.address,
                    location: {
                        lat: address.lat || null,
                        lng: address.lng || null
                    },
                    createdAt: new Date().toISOString()
                });

            console.log('âœ… Address added:', addressRef.id);
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

            console.log('âœ… Address deleted:', addressId);
            return { success: true };
        } catch (err) {
            console.error('Error deleting address:', err);
            return { success: false, error: err.message };
        }
    },

    // Get user's wishlist
    async getWishlist() {
        if (!this.hydrateCurrentUserFromStorage()) {
            console.warn('âڑ ï¸ڈ No logged-in user');
            return [];
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                console.warn('âڑ ï¸ڈ Firestore not available');
                return [];
            }

            const snapshot = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('wishlist')
                .get();

            const wishlist = [];
            snapshot.forEach(doc => {
                wishlist.push({ id: doc.id, ...doc.data() });
            });

            console.log('âœ… Wishlist loaded:', wishlist.length);
            return wishlist;
        } catch (err) {
            console.error('Error loading wishlist:', err);
            return [];
        }
    },

    // Add product to wishlist
    async addToWishlist(productId, productName, productImage, productPrice) {
        if (!this.hydrateCurrentUserFromStorage()) {
            return { success: false, error: 'يجب تسجيل الدخول أولاً' };
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                throw new Error('Firestore not initialized');
            }

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

                // Fallback to localStorage backup
                if ((!productName || productImage === undefined || productPrice === undefined) && localStorage.getItem('products_backup')) {
                    try {
                        const backup = JSON.parse(localStorage.getItem('products_backup')) || [];
                        const prod = backup.find(p => (p._id || p.id) == productId);
                        if (prod) {
                            productName = productName || prod.name || prod.title || '';
                            productImage = productImage === undefined ? (Array.isArray(prod.images) ? prod.images[0] : prod.image || '') : productImage;
                            productPrice = productPrice === undefined ? (prod.discountPrice || prod.price || null) : productPrice;
                        }
                    } catch (e) {
                        console.warn('Error reading products_backup for wishlist:', e);
                    }
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
                return { success: false, error: 'ط§ظ„ظ…ظ†طھط¬ ظ…ظˆط¬ظˆط¯ ط¨ط§ظ„ظپط¹ظ„ ظپظٹ ط§ظ„ظ…ظپط¶ظ„ط©' };
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

            console.log('âœ… Product added to wishlist:', productId);
            return { success: true };
        } catch (err) {
            console.error('Error adding to wishlist:', err);
            return { success: false, error: err.message };
        }
    },

    // Remove product from wishlist
    async removeFromWishlist(productId) {
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
                .collection('wishlist')
                .doc(productId)
                .delete();

            console.log('âœ… Product removed from wishlist:', productId);
            return { success: true };
        } catch (err) {
            console.error('Error removing from wishlist:', err);
            return { success: false, error: err.message };
        }
    },

    // Get user's orders
    async getOrders() {
        if (!this.hydrateCurrentUserFromStorage()) {
            console.warn('âڑ ï¸ڈ No logged-in user');
            return [];
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                console.warn('âڑ ï¸ڈ Firestore not available');
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

            console.log('âœ… Orders loaded:', orders.length);
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

            console.log('âœ… Order created:', orderRef.id);
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

