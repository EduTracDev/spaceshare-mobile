import CustomError from "../custom-error";

export class ForbiddenError extends CustomError {
  public statusCode: number = 403;

  constructor(message: string) {
    super(message);
  }
}

export default ForbiddenError;