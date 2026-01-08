// utils/api.ts
import { getCSRFToken } from '@/utils/app/csrf';
import { WorkflowI } from '../types/workflow';

const BASE_URL = '/api/workflow';

const getFetchOptions = async (
  method: string, 
  idToken: string, 
  validateAndRefreshToken?: (token: string) => Promise<string | null>, 
  body?: any
) => {
    let validToken = idToken;
    if (validateAndRefreshToken) {
        validToken = await validateAndRefreshToken(idToken) || idToken;
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${validToken || ''}`,
    };
  
    if (method !== 'GET') {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }
  
    return {
      method,
      headers,
      credentials: 'include' as RequestCredentials,
      body: body ? JSON.stringify(body) : undefined,
    };
};

export const fetchWorkflows = async (
    idToken: string, 
    validateAndRefreshToken?: (token: string) => Promise<string | null>,
    params?: {search?: string; type?: string; pagination?: boolean; page?: number; limit?: number; }
): Promise<any> => {
    try {
        const queryParams = new URLSearchParams(params as any).toString();
        const options = await getFetchOptions('GET', idToken, validateAndRefreshToken);
        const response = await fetch(`${BASE_URL}?${queryParams}`, options);
        if (!response.ok) {
            throw new Error(`Failed to fetch workflows: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching workflows:', error);
        return null;
    }
};

export const deleteWorkflowById = async (
    idToken: string,
    id: string,
    validateAndRefreshToken?: (token: string) => Promise<string | null>
): Promise<boolean> => {
    try {
        const options = await getFetchOptions('DELETE', idToken, validateAndRefreshToken);
        const response = await fetch(`${BASE_URL}/${id}`, options);
        if (!response.ok) {
            throw new Error(`Failed to delete workflow: ${response.statusText}`);
        }
        return true;
    } catch (error) {
        console.error('Error deleting workflow:', error);
        return false;
    }
};

export const updateWorkflowById = async (
    idToken: string,
    id: string,
    workflow: Partial<WorkflowI>,
    validateAndRefreshToken?: (token: string) => Promise<string | null>
): Promise<WorkflowI> => {
    try {
        const options = await getFetchOptions('PUT', idToken, validateAndRefreshToken, workflow);
        const response = await fetch(`${BASE_URL}/${id}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors ? errorData.errors.join(', ') : `Failed to update workflow: ${response.statusText}`);
        }
        const data = await response.json();
        return data.updatedWorkflow;
    } catch (error) {
        console.error('Error updating workflow:', error);
        throw error;
    }
};

export const addWorkflow = async (
    idToken: string,
    workflow: Partial<WorkflowI>,
    validateAndRefreshToken?: (token: string) => Promise<string | null>
): Promise<WorkflowI> => {
    try {
        const options = await getFetchOptions('POST', idToken, validateAndRefreshToken, workflow);
        const response = await fetch(BASE_URL, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors ? errorData.errors.join(', ') : `Failed to create workflow: ${response.statusText}`);
        }
        const data = await response.json();
        return data.newWorkflow;
    } catch (error) {
        console.error('Error creating workflow:', error);
        throw error;
    }
};

export const incrementWorkflowHitCount = async (
  idToken: string,
  id: string | string[],
  workflow: Partial<WorkflowI>,
  validateAndRefreshToken?: (token: string) => Promise<string | null>
): Promise<boolean> => {
  try {
      const body = {
          ...workflow,
          incrementHitCount: true
      };
      const options = await getFetchOptions('PUT', idToken, validateAndRefreshToken, body);
      const response = await fetch(`${BASE_URL}/${id}`, options);
      if (!response.ok) {
          throw new Error(`Failed to increment hit count: ${response.statusText}`);
      }
      return true;
  } catch (error) {
      console.error('Error incrementing hit count:', error);
      throw error;
  }
};

export const getWorkflowById = async (
  id: string,
  idToken: string | undefined,
  validateAndRefreshToken?: (token: string) => Promise<string | null>
): Promise<string | undefined> => {
  console.log('[getWorkflowById]: Called with ID:', id, 'Has token?', !!idToken);
  
  if (!id || !idToken) {
      console.error('[getWorkflowById]: Missing required params - ID:', !!id, 'Token:', !!idToken);
      return undefined;
  }

  try {
      const options = await getFetchOptions('GET', idToken, validateAndRefreshToken);
      console.log('[getWorkflowById]: Fetching from:', `${BASE_URL}/${id}`);
      const response = await fetch(`${BASE_URL}/${id}`, options);
      console.log('[getWorkflowById]: Response status:', response.status, response.statusText);
      
      if (!response.ok) {
          console.error('[getWorkflowById]: Response not OK:', response.status, response.statusText);
          throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      console.log('[getWorkflowById]: Response text length:', text?.length);
      return text;
  } catch (error: any) {
      console.error('[getWorkflowById]: Exception caught:', error);
      throw new Error(`Failed to fetch workflow: ${error.message}`);
  }
};