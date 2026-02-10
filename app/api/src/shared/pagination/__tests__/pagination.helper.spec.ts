import { applyPagination, buildConnection } from '../pagination.helper';
import { encodeCursor } from '../cursor.utils';
import { PAGINATION_DEFAULTS } from '../pagination.types';

describe('pagination.helper', () => {
  describe('applyPagination', () => {
    let mockQueryBuilder: {
      andWhere: jest.Mock;
      orderBy: jest.Mock;
      take: jest.Mock;
    };

    beforeEach(() => {
      mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
      };
    });

    it('should apply default pagination', () => {
      const result = applyPagination(mockQueryBuilder as any, 'entity', {});

      expect(result.pageSize).toBe(PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE);
      expect(result.afterId).toBeNull();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'entity.id',
        'DESC',
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(
        PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE + 1,
      );
    });

    it('should respect custom first parameter', () => {
      const result = applyPagination(mockQueryBuilder as any, 'entity', {
        first: 50,
      });

      expect(result.pageSize).toBe(50);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(51);
    });

    it('should enforce max page size', () => {
      const result = applyPagination(mockQueryBuilder as any, 'entity', {
        first: 500,
      });

      expect(result.pageSize).toBe(PAGINATION_DEFAULTS.MAX_PAGE_SIZE);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(
        PAGINATION_DEFAULTS.MAX_PAGE_SIZE + 1,
      );
    });

    it('should enforce minimum page size of 1', () => {
      const result = applyPagination(mockQueryBuilder as any, 'entity', {
        first: 0,
      });

      expect(result.pageSize).toBe(1);
    });

    it('should decode and apply cursor filter', () => {
      const id = 'test-id-123';
      const cursor = encodeCursor(id);

      const result = applyPagination(mockQueryBuilder as any, 'entity', {
        after: cursor,
      });

      expect(result.afterId).toBe(id);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entity.id < :afterId',
        { afterId: id },
      );
    });

    it('should handle invalid cursor gracefully', () => {
      const result = applyPagination(mockQueryBuilder as any, 'entity', {
        after: '',
      });

      expect(result.afterId).toBeNull();
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should use ASC operator when sortDirection is ASC', () => {
      const id = 'test-id';
      const cursor = encodeCursor(id);

      applyPagination(mockQueryBuilder as any, 'entity', {
        after: cursor,
        sortDirection: 'ASC',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entity.id > :afterId',
        { afterId: id },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('entity.id', 'ASC');
    });

    it('should support custom cursor field', () => {
      const id = 'test-id';
      const cursor = encodeCursor(id);

      applyPagination(mockQueryBuilder as any, 'user', {
        after: cursor,
        cursorField: 'createdAt',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.createdAt < :afterId',
        { afterId: id },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'user.createdAt',
        'DESC',
      );
    });

    it('should allow custom page size limits', () => {
      const result = applyPagination(mockQueryBuilder as any, 'entity', {
        first: 200,
        maxPageSize: 50,
        defaultPageSize: 10,
      });

      expect(result.pageSize).toBe(50);
    });
  });

  describe('buildConnection', () => {
    const mockItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ];

    it('should build connection with edges', () => {
      const connection = buildConnection(mockItems, 3, 20);

      expect(connection.edges).toHaveLength(3);
      expect(connection.edges[0].node).toEqual(mockItems[0]);
      expect(connection.edges[0].cursor).toBe(encodeCursor('1'));
    });

    it('should detect hasNextPage when items exceed pageSize', () => {
      const items = [...mockItems, { id: '4', name: 'Item 4' }];
      const connection = buildConnection(items, 10, 3);

      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.edges).toHaveLength(3); // Excludes extra item
    });

    it('should set hasNextPage to false when no more items', () => {
      const connection = buildConnection(mockItems, 3, 20);

      expect(connection.pageInfo.hasNextPage).toBe(false);
    });

    it('should set endCursor to last edge cursor', () => {
      const connection = buildConnection(mockItems, 3, 20);

      expect(connection.pageInfo.endCursor).toBe(encodeCursor('3'));
    });

    it('should set endCursor to null for empty results', () => {
      const connection = buildConnection([], 0, 20);

      expect(connection.pageInfo.endCursor).toBeNull();
      expect(connection.edges).toHaveLength(0);
    });

    it('should include totalCount', () => {
      const connection = buildConnection(mockItems, 100, 20);

      expect(connection.totalCount).toBe(100);
    });

    it('should use custom cursor field', () => {
      const items = [
        { id: '1', email: 'a@test.com' },
        { id: '2', email: 'b@test.com' },
      ];
      const connection = buildConnection(items, 2, 20, 'email');

      expect(connection.edges[0].cursor).toBe(encodeCursor('a@test.com'));
      expect(connection.edges[1].cursor).toBe(encodeCursor('b@test.com'));
    });
  });
});
