export class InvalidatedRefreshTokenError extends Error {
  constructor(message = 'Refresh token has been invalidated') {
    super(message);
    this.name = 'InvalidatedRefreshTokenError';
  }
}
