import { Request, Response, NextFunction } from 'express';
import { assertCanAccessClient } from '../services/accessControl.service';

interface ClientAccessOptions {
  allowBillingView?: boolean;
  source?: 'params' | 'body' | 'query';
}

export const requireClientAccess = (
  key: string,
  options: ClientAccessOptions = {}
) => {
  const { allowBillingView = false, source = 'params' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const container =
        source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const clientId = container[key];

      if (typeof clientId !== 'string' || !clientId) {
        return next();
      }

      await assertCanAccessClient(req.user, { clientId, allowBillingView });
      next();
    } catch (error) {
      next(error);
    }
  };
};

