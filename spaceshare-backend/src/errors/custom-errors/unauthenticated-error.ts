import CustomError from "../custom-error";

export class UnauthenticatedError extends CustomError {
  public statusCode: number = 401;

  constructor(message: string) {
    super(message);
  }
}

export default UnauthenticatedError;