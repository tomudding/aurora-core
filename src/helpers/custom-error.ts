import { HttpStatusCode } from 'axios';

export { HttpStatusCode } from 'axios';

export class HttpApiException extends Error {
  public statusCode: number;
  public message: string;
  public name: string;

  constructor(statusCode: HttpStatusCode, message?: string) {
    const statusCodeMessage = HttpStatusCode[statusCode].replace(/([A-Z][a-z]*)/g, ' $1').trim();
    super(message ?? statusCodeMessage);

    this.name = statusCodeMessage;
    this.statusCode = statusCode;
    this.message = message ?? statusCodeMessage;
  }
}
