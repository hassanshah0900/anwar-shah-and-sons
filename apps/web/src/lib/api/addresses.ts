import 'server-only';
import {
  addressListSchema,
  addressSchema,
  type Address,
  type AddressInputParsed,
  type AddressUpdate,
} from '@repo/shared';
import { apiCommand, apiRequest } from './server';

export async function getAddresses(): Promise<Address[]> {
  return (await apiRequest('/api/v1/addresses', addressListSchema)).addresses;
}

export function createAddress(input: AddressInputParsed): Promise<Address> {
  return apiRequest('/api/v1/addresses', addressSchema, { method: 'POST', body: input });
}

export function updateAddress(id: string, input: AddressUpdate): Promise<Address> {
  return apiRequest(`/api/v1/addresses/${encodeURIComponent(id)}`, addressSchema, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteAddress(id: string): Promise<void> {
  return apiCommand(`/api/v1/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
