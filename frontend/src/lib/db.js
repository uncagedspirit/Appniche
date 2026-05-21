import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  deleteDoc, query, where, orderBy, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from './firebase.js';

// Collections
export const dbOps = {
  // Saved searches
  async saveSearch(userId, data) {
    return addDoc(collection(db, 'users', userId, 'searches'), {
      ...data,
      createdAt: serverTimestamp()
    });
  },

  async getSearches(userId) {
    const q = query(
      collection(db, 'users', userId, 'searches'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async deleteSearch(userId, searchId) {
    return deleteDoc(doc(db, 'users', userId, 'searches', searchId));
  },

  // Saved app collections
  async saveCollection(userId, data) {
    return addDoc(collection(db, 'users', userId, 'collections'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  async getCollections(userId) {
    const q = query(
      collection(db, 'users', userId, 'collections'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async updateCollection(userId, collectionId, data) {
    return updateDoc(doc(db, 'users', userId, 'collections', collectionId), {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteCollection(userId, collectionId) {
    return deleteDoc(doc(db, 'users', userId, 'collections', collectionId));
  },

  // Tracked apps
  async trackApp(userId, appData) {
    const id = `${appData.platform}_${appData.appId}`;
    return setDoc(doc(db, 'users', userId, 'tracked', id), {
      ...appData,
      trackedAt: serverTimestamp()
    });
  },

  async getTrackedApps(userId) {
    const snap = await getDocs(collection(db, 'users', userId, 'tracked'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async untrackApp(userId, appId, platform) {
    return deleteDoc(doc(db, 'users', userId, 'tracked', `${platform}_${appId}`));
  },

  // Saved gap analyses
  async saveAnalysis(userId, data) {
    return addDoc(collection(db, 'users', userId, 'analyses'), {
      ...data,
      createdAt: serverTimestamp()
    });
  },

  async getAnalyses(userId) {
    const q = query(
      collection(db, 'users', userId, 'analyses'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Saved app ideas
  async saveIdea(userId, data) {
    return addDoc(collection(db, 'users', userId, 'ideas'), {
      ...data,
      createdAt: serverTimestamp()
    });
  },

  async getIdeas(userId) {
    const q = query(
      collection(db, 'users', userId, 'ideas'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async deleteIdea(userId, ideaId) {
    return deleteDoc(doc(db, 'users', userId, 'ideas', ideaId));
  },

  // User profile
  async setUserProfile(userId, data) {
    return setDoc(doc(db, 'users', userId, 'profile', 'data'), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async getUserProfile(userId) {
    const snap = await getDoc(doc(db, 'users', userId, 'profile', 'data'));
    return snap.exists() ? snap.data() : null;
  }
};
