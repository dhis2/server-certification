import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import {
  Connection,
  CursorPaginationOptions,
  PAGINATION_DEFAULTS,
} from './pagination.types';
import { encodeCursor, decodeCursor } from './cursor.utils';

export interface PaginateOptions extends CursorPaginationOptions {
  cursorField?: string;
  sortDirection?: 'ASC' | 'DESC';
  maxPageSize?: number;
  defaultPageSize?: number;
}

export interface PaginatedQueryResult<T extends ObjectLiteral> {
  queryBuilder: SelectQueryBuilder<T>;
  pageSize: number;
  afterId: string | null;
}

export function applyPagination<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  options: PaginateOptions = {},
): PaginatedQueryResult<T> {
  const {
    first,
    after,
    cursorField = 'id',
    sortDirection = 'DESC',
    maxPageSize = PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
    defaultPageSize = PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE,
  } = options;

  const pageSize = Math.min(Math.max(1, first ?? defaultPageSize), maxPageSize);
  const afterId = after ? decodeCursor(after) : null;

  if (afterId) {
    const operator = sortDirection === 'DESC' ? '<' : '>';
    qb.andWhere(`${alias}.${cursorField} ${operator} :afterId`, { afterId });
  }

  qb.orderBy(`${alias}.${cursorField}`, sortDirection).take(pageSize + 1);

  return { queryBuilder: qb, pageSize, afterId };
}

export function buildConnection<T extends { [key: string]: unknown }>(
  items: T[],
  totalCount: number,
  pageSize: number,
  cursorField: string = 'id',
): Connection<T> {
  const hasNextPage = items.length > pageSize;
  const edges = items.slice(0, pageSize).map((item) => ({
    node: item,
    cursor: encodeCursor(String(item[cursorField])),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    },
    totalCount,
  };
}

export interface PaginateExecuteOptions extends PaginateOptions {
  countQueryBuilder?: SelectQueryBuilder<ObjectLiteral>;
}

export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  options: PaginateExecuteOptions = {},
): Promise<Connection<T>> {
  const cursorField = options.cursorField ?? 'id';

  const { pageSize } = applyPagination(qb, alias, options);
  const [items, totalCount] = await qb.getManyAndCount();

  return buildConnection(items, totalCount, pageSize, cursorField);
}
