export const getNavigatorLocks = (): LockManager => {
  if ('locks' in navigator && navigator.locks) {
    return navigator.locks;
  }

  throw new Error(
    'Navigator locks are not available in an insecure context. Use a secure context such as HTTPS or http://localhost.'
  );
};
