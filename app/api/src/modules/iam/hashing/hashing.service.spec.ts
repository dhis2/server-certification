import { HashingService } from './hashing.service';

class ConcreteHashingService extends HashingService {
  async hash(data: string | Buffer): Promise<string> {
    return `hashed:${data.toString()}`;
  }

  async compare(data: string | Buffer, encrypted: string): Promise<boolean> {
    return encrypted === `hashed:${data.toString()}`;
  }
}

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(() => {
    service = new ConcreteHashingService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have hash method', () => {
    expect(typeof service.hash).toBe('function');
  });

  it('should have compare method', () => {
    expect(typeof service.compare).toBe('function');
  });

  describe('concrete implementation', () => {
    it('should hash data', async () => {
      const result = await service.hash('test');
      expect(result).toBe('hashed:test');
    });

    it('should compare hashed data correctly', async () => {
      const hashed = await service.hash('test');
      const result = await service.compare('test', hashed);
      expect(result).toBe(true);
    });

    it('should return false for incorrect comparison', async () => {
      const result = await service.compare('test', 'wrong-hash');
      expect(result).toBe(false);
    });
  });
});
