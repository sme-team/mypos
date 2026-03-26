import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Interface cho lỗi chuẩn hóa
export interface StandardizedError {
    message: string;
    statusCode?: number;
    originalError: any;
}

// Helper để xử lý lỗi axios chung
export const handleAxiosError = (error: any): StandardizedError => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;

        if (axiosError.response) {
            // Server trả về lỗi
            const errorMessage =
                axiosError.response.data?.message ||
                axiosError.response.data?.error ||
                axiosError.response.statusText ||
                'Unknown server error';

            return {
                message: `API Error: ${axiosError.response.status} - ${errorMessage}`,
                statusCode: axiosError.response.status,
                originalError: axiosError,
            };
        } else if (axiosError.request) {
            // Request gửi nhưng không nhận được response
            return {
                message: 'Network Error: No response from server',
                statusCode: undefined,
                originalError: axiosError,
            };
        }
    }

    // Lỗi chung không phải axios
    return {
        message: `Request Error: ${error?.message || 'Unknown error'}`,
        statusCode: undefined,
        originalError: error,
    };
};


import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001/api' : 'http://localhost:3001/api';

// Tạo axios instance với config chung cho React Native
export const createAxiosInstance = (baseURL: string = BASE_URL): AxiosInstance => {
    const instance = axios.create({
        baseURL, // Optional, cho phép override nếu cần
        timeout: 30000, // Default timeout 30s
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; React-Native-App)',
            // Default cho Excel, có thể override
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json', // Default cho API
        },
        httpsAgent: false, // Bỏ qua SSL validation cho React Native
        validateStatus: (status) => status >= 200 && status < 300, // Default success range
    });

    // Interceptors chung cho logging (có thể mở rộng cho error handling)
    instance.interceptors.request.use((config) => {
        console.log(` Axios Request: ${instance.getUri(config)}`);
        return config;
    });

    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            console.error(' Axios Error:', error.message);
            return Promise.reject(error);
        },
    );

    return instance;
};

// Export instance default nếu không cần baseURL
export const defaultAxios = createAxiosInstance();
export { AxiosError };
export type { AxiosInstance, AxiosResponse };
