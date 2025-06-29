import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DisposeManager, type Disposer } from '../../src/utils/DisposeManager.js';

describe('DisposeManager', () => {
  let disposeManager: DisposeManager;
  let mockDisposer1: Disposer;
  let mockDisposer2: Disposer;

  beforeEach(() => {
    mockDisposer1 = vi.fn();
    mockDisposer2 = vi.fn();

    disposeManager = new DisposeManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should create an empty DisposeManager by default', () => {
      disposeManager = new DisposeManager();

      expect(disposeManager.isDisposed()).toBe(false);
    });

    it('should create DisposeManager with initial disposers', () => {
      disposeManager = new DisposeManager({
        disposers: [mockDisposer1, mockDisposer2]
      });

      expect(disposeManager.isDisposed()).toBe(false);

      disposeManager.dispose();

      expect(mockDisposer1).toHaveBeenCalledOnce();
      expect(mockDisposer2).toHaveBeenCalledOnce();
      expect(disposeManager.isDisposed()).toBe(true);
    });

    it('should add disposers after construction', () => {
      disposeManager.add(mockDisposer1);
      disposeManager.add(mockDisposer2);

      disposeManager.dispose();

      expect(mockDisposer1).toHaveBeenCalledOnce();
      expect(mockDisposer2).toHaveBeenCalledOnce();
    });

    it('should correctly report disposal state', () => {
      expect(disposeManager.isDisposed()).toBe(false);

      disposeManager.dispose();

      expect(disposeManager.isDisposed()).toBe(true);
    });

    it('should handle empty disposer array', () => {
      disposeManager.dispose();
      expect(disposeManager.isDisposed()).toBe(true);
    });
  });

  describe('Disposal Behavior', () => {
    it('should call disposers in order they were added', () => {
      const callOrder = new Array<number>();
      const disposer1 = vi.fn(() => callOrder.push(1));
      const disposer2 = vi.fn(() => callOrder.push(2));
      const disposer3 = vi.fn(() => callOrder.push(3));

      disposeManager.add(disposer1);
      disposeManager.add(disposer2);
      disposeManager.add(disposer3);

      disposeManager.dispose();

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('should handle multiple dispose calls (idempotent)', () => {
      disposeManager.add(mockDisposer1);

      disposeManager.dispose();
      disposeManager.dispose();
      disposeManager.dispose();

      expect(mockDisposer1).toHaveBeenCalledOnce();
      expect(disposeManager.isDisposed()).toBe(true);
    });

    it('should not add disposers after disposal', () => {
      disposeManager.dispose();

      expect(disposeManager.isDisposed()).toBe(true);

      disposeManager.add(mockDisposer1);

      // Should not be called since manager is already disposed
      disposeManager.dispose();

      expect(mockDisposer1).not.toHaveBeenCalled();
    });

    it('should stop execution if disposer throws an error', () => {
      const errorDisposer = vi.fn(() => {
        throw new Error('Test Error');
      });
      const workingDisposer = vi.fn();

      disposeManager.add(errorDisposer);
      disposeManager.add(workingDisposer);

      expect(() => disposeManager.dispose()).toThrow();
      expect(errorDisposer).toHaveBeenCalledOnce();
      expect(workingDisposer).not.toHaveBeenCalled();
      expect(disposeManager.isDisposed()).toBe(true);
    });
  });

  describe('AbortSignal Integration', () => {
    it('should dispose when AbortSignal is aborted', () => {
      const controller = new AbortController();

      disposeManager.add(mockDisposer1);
      disposeManager.disposeOnAbort(controller.signal);

      expect(disposeManager.isDisposed()).toBe(false);

      controller.abort();

      expect(mockDisposer1).toHaveBeenCalledOnce();
      expect(disposeManager.isDisposed()).toBe(true);
    });

    it('should dispose immediately if AbortSignal is already aborted', () => {
      const controller = new AbortController();
      controller.abort(); // Abort before setting up listener

      disposeManager.add(mockDisposer1);
      expect(disposeManager.isDisposed()).toBe(false);

      disposeManager.disposeOnAbort(controller.signal);
      expect(disposeManager.isDisposed()).toBe(true);

      expect(mockDisposer1).toHaveBeenCalledOnce();
    });

    it('should dispose immediately if AbortSignal is already aborted', () => {
      const controller = new AbortController();
      controller.abort(); // Abort before setting up listener

      disposeManager.disposeOnAbort(controller.signal);
      expect(disposeManager.isDisposed()).toBe(true);

      // Disposer added after adding aborted signal which
      // would already have disposed the manager, so this won't be called.
      disposeManager.add(mockDisposer1);
      expect(disposeManager.isDisposed()).toBe(true);

      expect(mockDisposer1).not.toHaveBeenCalledOnce();
    });

    it('should handle multiple abort signals', () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      disposeManager.add(mockDisposer1);
      disposeManager.disposeOnAbort(controller1.signal);
      disposeManager.disposeOnAbort(controller2.signal);

      controller1.abort();

      expect(mockDisposer1).toHaveBeenCalledOnce();
      expect(disposeManager.isDisposed()).toBe(true);

      // Second abort should have no effect
      controller2.abort();

      expect(mockDisposer1).toHaveBeenCalledOnce();
    });

    it('should not set up listeners on already disposed manager', () => {
      const controller = new AbortController();

      const addEventListenerSpy = vi.spyOn(controller.signal, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

      disposeManager.dispose();

      expect(disposeManager.isDisposed()).toBe(true);

      // Should be a no-op
      disposeManager.disposeOnAbort(controller.signal);

      controller.abort();

      // No additional effects should occur
      expect(addEventListenerSpy).not.toHaveBeenCalled();
      expect(removeEventListenerSpy).not.toHaveBeenCalled();
    });

    it('should clean up event listeners to prevent memory leaks', () => {
      const controller = new AbortController();

      const addEventListenerSpy = vi.spyOn(controller.signal, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

      disposeManager.disposeOnAbort(controller.signal);
      disposeManager.dispose();

      expect(addEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
      expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });

  describe('Async Disposal', () => {
    it('should handle async disposers with disposeAsync', async () => {
      const asyncDisposer = vi.fn().mockResolvedValue(undefined);

      disposeManager.add(asyncDisposer);

      await disposeManager.disposeAsync();

      expect(asyncDisposer).toHaveBeenCalledOnce();
      expect(disposeManager.isDisposed()).toBe(true);
    });

    it('should wait for async disposers in sequence', async () => {
      const callOrder = new Array<number>();
      const asyncDisposer1 = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        callOrder.push(1);
      });
      const asyncDisposer2 = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        callOrder.push(2);
      });

      disposeManager.add(asyncDisposer1);
      disposeManager.add(asyncDisposer2);

      await disposeManager.disposeAsync();

      expect(callOrder).toEqual([1, 2]);
      expect(asyncDisposer1).toHaveBeenCalledOnce();
      expect(asyncDisposer2).toHaveBeenCalledOnce();
    });

    it('should handle mixed sync and async disposers', async () => {
      const callOrder = new Array<number>();
      const syncDisposer = vi.fn(() => {
        callOrder.push(1);
      });
      const asyncDisposer = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        callOrder.push(2);
      });

      disposeManager.add(syncDisposer);
      disposeManager.add(asyncDisposer);

      await disposeManager.disposeAsync();

      expect(callOrder).toEqual([1, 2]);
    });

    it('should handle mixed async and sync disposers', async () => {
      const callOrder = new Array<number>();
      const asyncDisposer = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        callOrder.push(1);
      });
      const syncDisposer = vi.fn(() => {
        callOrder.push(2);
      });

      disposeManager.add(asyncDisposer);
      disposeManager.add(syncDisposer);

      await disposeManager.disposeAsync();

      expect(callOrder).toEqual([1, 2]);
    });

    it('should not await async disposers with sync dispose', () => {
      const callOrder = new Array<number>();
      const asyncDisposer = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        callOrder.push(1);
      });

      disposeManager.add(asyncDisposer);

      disposeManager.dispose(); // Sync dispose

      expect(callOrder).toEqual([]); // Async disposer won't have gotten this far yet
      expect(asyncDisposer).toHaveBeenCalled();
      expect(disposeManager.isDisposed()).toBe(true);
    });

    it('should handle async disposer rejections gracefully', async () => {
      const errorAsyncDisposer = vi.fn().mockRejectedValue(new Error('Test Error'));
      const workingDisposer = vi.fn();

      disposeManager.add(errorAsyncDisposer);
      disposeManager.add(workingDisposer);

      await expect(disposeManager.disposeAsync()).rejects.toThrow();

      expect(errorAsyncDisposer).toHaveBeenCalledOnce();
      expect(workingDisposer).not.toHaveBeenCalled();
      expect(disposeManager.isDisposed()).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined/null disposers gracefully', () => {
      disposeManager = new DisposeManager();

      // These should be no-ops and not throw
      disposeManager.add(undefined as any);
      disposeManager.add(null as any);
      disposeManager.add(mockDisposer1);

      expect(() => disposeManager.dispose()).not.toThrow();
      expect(mockDisposer1).toHaveBeenCalledOnce();
    });

    it('should maintain state consistency after errors', () => {
      const errorDisposer = vi.fn(() => {
        throw new Error('Test Error');
      });

      disposeManager = new DisposeManager();
      disposeManager.add(errorDisposer);

      expect(() => disposeManager.dispose()).toThrow();
      expect(disposeManager.isDisposed()).toBe(true);

      // Subsequent operations should be no-ops
      disposeManager.add(mockDisposer1);
      disposeManager.dispose();

      expect(mockDisposer1).not.toHaveBeenCalled();
    });
  });
});
