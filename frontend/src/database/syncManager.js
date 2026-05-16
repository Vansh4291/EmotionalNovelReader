import NetInfo from '@react-native-community/netinfo';

let realmInstance = null;
let isOnline = false;

export const initSyncManager = (realm) => {
  realmInstance = realm;
  
  NetInfo.addEventListener(state => {
    isOnline = state.isConnected;
    if (isOnline && realmInstance) {
      syncWhenOnline();
    }
  });
  
  NetInfo.fetch().then(state => {
    isOnline = state.isConnected;
  });
};

const syncWhenOnline = async () => {
  if (!realmInstance) return;
  
  try {
    if (realmInstance.syncSession) {
      await realmInstance.syncSession.resume();
      console.log('Atlas sync resumed');
    }
  } catch (e) {
    console.log('Sync failed silently, will retry later:', e.message);
  }
};

export const getConnectivityStatus = () => isOnline;

export const forceSyncNow = async () => {
  if (!isOnline || !realmInstance) {
    return { success: false, message: 'Offline or no realm' };
  }
  await syncWhenOnline();
  return { success: true };
};