class CustomError extends Error {
    public statusCode: number;
    
    constructor(message:string) {
        super(message);
        this.statusCode = 500;
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = this.constructor.name;
    }
} 

export default CustomError