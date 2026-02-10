import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();
    const errorMessage = this.extractErrorMessage(errorResponse);
    const errorDetails = this.extractErrorDetails(errorResponse);

    this.logError(status, errorMessage, request);

    response.status(status).json({
      status: 'error',
      statusCode: status,
      message: errorMessage,
      errors: errorDetails,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractErrorMessage(errorResponse: string | object): string {
    if (typeof errorResponse === 'string') {
      return errorResponse;
    }

    const response = errorResponse as Record<string, unknown>;

    if (response.message) {
      if (Array.isArray(response.message)) {
        return response.message[0] as string;
      }
      return response.message as string;
    }

    return 'An error occurred';
  }

  private extractErrorDetails(
    errorResponse: string | object,
  ): string[] | undefined {
    if (typeof errorResponse === 'string') {
      return [errorResponse];
    }

    const response = errorResponse as Record<string, unknown>;

    if (response.message && Array.isArray(response.message)) {
      return response.message as string[];
    }

    return undefined;
  }

  private logError(status: number, message: string, request: Request): void {
    const method = request.method;
    const url = request.url;
    const user = (request as unknown as Record<string, unknown>)['user'];
    const userInfo = user ? `User: ${JSON.stringify(user)}` : 'Unauthenticated';

    const logMessage = `[${method}] ${url} - ${message} - ${userInfo}`;

    if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
      this.logger.error(logMessage);
    } else if (status >= (HttpStatus.BAD_REQUEST as number)) {
      this.logger.warn(logMessage);
    } else {
      this.logger.log(logMessage);
    }
  }
}
