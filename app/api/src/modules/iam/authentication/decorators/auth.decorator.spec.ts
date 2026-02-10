import { AUTH_TYPE_KEY, Auth } from './auth.decorator';
import { AuthType } from '../enums/auth-type.enum';

describe('Auth Decorator', () => {
  it('should set AUTH_TYPE_KEY metadata with single auth type on method', () => {
    const decorator = Auth(AuthType.Bearer);

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
      AUTH_TYPE_KEY,
      mockDescriptor.value,
    );
    expect(metadataValue).toEqual([AuthType.Bearer]);
  });

  it('should set AUTH_TYPE_KEY metadata with multiple auth types', () => {
    const decorator = Auth(AuthType.Bearer, AuthType.None);

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
      AUTH_TYPE_KEY,
      mockDescriptor.value,
    );
    expect(metadataValue).toEqual([AuthType.Bearer, AuthType.None]);
  });

  it('should export AUTH_TYPE_KEY constant', () => {
    expect(AUTH_TYPE_KEY).toBe('authType');
  });

  it('should set AUTH_TYPE_KEY metadata on class', () => {
    const decorator = Auth(AuthType.Bearer);

    class TestController {}
    decorator(TestController);

    const metadataValue = Reflect.getMetadata(AUTH_TYPE_KEY, TestController);
    expect(metadataValue).toEqual([AuthType.Bearer]);
  });

  it('should have string values for AuthType enum', () => {
    expect(AuthType.Bearer).toBe('bearer');
    expect(AuthType.None).toBe('none');
  });

  it('should return a decorator function', () => {
    const result = Auth(AuthType.Bearer);
    expect(typeof result).toBe('function');
  });
});
