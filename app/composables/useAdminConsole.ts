export function useAdminConsole() {
  const provisionKey = useState('admin-console-key', () => '');
  const keyUnlocked = useState('admin-console-unlocked', () => false);

  function restore() {
    if (import.meta.client) {
      const stored = sessionStorage.getItem('provision-key');
      if (stored) {
        provisionKey.value = stored;
        keyUnlocked.value = true;
      }
    }
  }

  function unlock(key: string) {
    if (!key.trim()) return;
    provisionKey.value = key.trim();
    keyUnlocked.value = true;
    if (import.meta.client) sessionStorage.setItem('provision-key', key.trim());
  }

  function lock() {
    provisionKey.value = '';
    keyUnlocked.value = false;
    if (import.meta.client) sessionStorage.removeItem('provision-key');
  }

  function authHeaders() {
    return { 'x-provision-key': provisionKey.value };
  }

  return { provisionKey, keyUnlocked, restore, unlock, lock, authHeaders };
}
