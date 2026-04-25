import {BaseService} from '../services/BaseService';

export const generateSequentialId = async (
  svc: BaseService,
  prefix: string,
  offset: number = 0,
): Promise<string> => {
  const rows = await svc.findAll();

  let max = 0;
  for (const row of rows) {
    const id: string = row.id;
    const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) {max = num;}
    }
  }

  return `${prefix}-${String(max + 1 + offset).padStart(3, '0')}`;
};

// Export code generators
export {
  generateCustomerCode,
  generateContractCode,
  generateBillNumber,
  generateReceivableCode,
} from './codeGenerator';
