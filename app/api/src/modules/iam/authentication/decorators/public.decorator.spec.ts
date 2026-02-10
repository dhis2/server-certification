import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public Decorator', () => {
  it('should set the IS_PUBLIC_KEY metadata to true on method', () => {
    const decorator = Public();

    const mockTarget = {};
    const mockPropertyKey = 'testMethod';
    const mockDescriptor: PropertyDescriptor = {
      value: () => undefined,
      writable: true,
      enumerable: false,
      configurable: true,
    };

    decorator(mockTarget, mockPropertyKey, mockDescriptor);

    const metadataValue = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      mockDescriptor.value,
    );
    expect(metadataValue).toBe(true);
  });

  it('should export IS_PUBLIC_KEY constant', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('should set IS_PUBLIC_KEY metadata to true on class', () => {
    const decorator = Public();

    class TestController {}
    decorator(TestController);

    const metadataValue = Reflect.getMetadata(IS_PUBLIC_KEY, TestController);
    expect(metadataValue).toBe(true);
  });

  it('should be callable without arguments', () => {
    expect(() => Public()).not.toThrow();
  });

  it('should return a decorator function', () => {
    const result = Public();
    expect(typeof result).toBe('function');
  });
});
