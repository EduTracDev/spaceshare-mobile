import CustomError from "../custom-error";

export class NotFoundError extends CustomError {
  public statusCode: number = 404;

  constructor(message: string) {
    super(message);
  }
}

export default NotFoundError;