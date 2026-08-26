import CustomError from "../custom-error";

export class BadRequestError extends CustomError {
  public statusCode: number = 400;

  constructor(message: string) {
    super(message);
  }
}

export default BadRequestError;