import { vi, type Mocked } from 'vitest';
import {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosInstance,
  AxiosHeaders,
  AxiosError,
} from 'axios';

/**
 * Creates a fully typed mocked Axios instance.
 */
export function createMockAxios(): Mocked<AxiosInstance> {
  const mock = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    head: vi.fn(),
    options: vi.fn(),
    request: vi.fn(),
    getUri: vi.fn(),
    uri: vi.fn(),
    
    interceptors: {
      request: { use: vi.fn(() => 0), eject: vi.fn(), clear: vi.fn() },
      response: { use: vi.fn(() => 0), eject: vi.fn(), clear: vi.fn() },
    },
    defaults: {
      headers: new AxiosHeaders(),
      timeout: 10000,
      baseURL: 'http://localhost:8080',
    } as any,
  } as unknown as Mocked<AxiosInstance>;

  return mock;
}

/**
 * Creates a mock success response
 */
export function createMockResponse<T>(
  data: T, 
  status = 200, 
  config = {}
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Created',
    headers: {},
    config: { headers: new AxiosHeaders(), ...config } as InternalAxiosRequestConfig,
  };
}

/**
 * Creates a mock Axios Error that passes "isAxiosError" checks
 */
export function createMockError(status: number, data?: any): AxiosError {
  const error = new AxiosError('Mock Error') as any;
  error.response = {
    status,
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  error.isAxiosError = true;
  return error;
}

/**
 * Module-level mock setup
 */
export function mockAxiosModule() {
  const instance = createMockAxios();
  
  vi.mock('axios', () => ({
    default: {
      create: vi.fn(() => instance),
      isAxiosError: (err: any) => err?.isAxiosError === true,
      AxiosHeaders: vi.fn(() => ({})),
    },
    AxiosError: class extends Error {
      isAxiosError = true;
    },
    AxiosHeaders: vi.fn(() => ({})),
  }));

  return instance;
}