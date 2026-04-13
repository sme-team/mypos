/**
 * Tạo UID ngẫu nhiên với prefix và timestamp
 * @param prefix Tiền tố UID (Vd: CUST, BILL, RES...)
 * @returns Chuỗi UID (Vd: CUST-1678234567-abcd)
 */
export const generateUID = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 5);
  return `${prefix ? prefix + '-' : ''}${timestamp}-${randomStr}`.toUpperCase();
};

// Export code generators
export {
  generateCustomerCode,
  generateContractCode,
  generateBillNumber,
  generateReceivableCode,
} from './codeGenerator';
