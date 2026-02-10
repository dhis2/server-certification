export class SessionExpiredError extends Error {
  constructor(message = 'Session has expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}
