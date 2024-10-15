class SDKNavigator extends Navigator {
  private static instance: SDKNavigator | null = null;

  constructor() {
    super();
    Object.setPrototypeOf(this, SDKNavigator.prototype);
  }

  public static getInstance(): SDKNavigator {
    if (!SDKNavigator.instance) {
      SDKNavigator.instance = new SDKNavigator();
    }
    return SDKNavigator.instance;
  }

  get locks(): LockManager {
    if (!super.locks) {
    throw new Error('Navigator locks are not available in this context. ' +
                    'This may be due to running in an unsecure context. ' +
                    'Consider using HTTPS or a secure context for full functionality.');
    }
    return new Proxy(super.locks, {
      get(target: LockManager, prop: keyof LockManager) {
        return target[prop];
      }
    });
  }
}

export const sdkNavigator = SDKNavigator.getInstance();
