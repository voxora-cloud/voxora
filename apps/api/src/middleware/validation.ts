import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { sendError } from '../utils/response';

export const validateRequest = (schema: ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req[property]);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      sendError(res, 400, 'Validation error', errorMessage);
      return;
    }
    
    next();
  };
};
