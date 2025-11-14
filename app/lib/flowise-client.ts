import axios, { AxiosInstance } from 'axios';
import { FlowisePredictionResponse, FlowiseConfig } from '@/app/types/flowise';

export class FlowiseClient {
  private axiosInstance: AxiosInstance;
  private config: FlowiseConfig;

  constructor(config: FlowiseConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
  }

  /**
   * Send a message to Flowise chatflow
   */
  async sendMessage(
    message: string,
    sessionId?: string,
    overrideConfig?: Record<string, any>
  ): Promise<FlowisePredictionResponse> {
    try {
      const endpoint = `/api/v1/prediction/${this.config.chatflowId}`;

      const payload = {
        question: message,
        ...(sessionId && { sessionId }),
        ...(overrideConfig && { overrideConfig })
      };

      const response = await this.axiosInstance.post<FlowisePredictionResponse>(
        endpoint,
        payload
      );

      return response.data;
    } catch (error) {
      console.error('Error sending message to Flowise:', error);
      throw error;
    }
  }

  /**
   * Stream messages from Flowise chatflow
   */
  async streamMessage(
    message: string,
    sessionId?: string,
    onMessage?: (data: string) => void,
    overrideConfig?: Record<string, any>
  ): Promise<void> {
    try {
      const endpoint = `/api/v1/prediction/${this.config.chatflowId}`;

      const payload = {
        question: message,
        ...(sessionId && { sessionId }),
        ...(overrideConfig && { overrideConfig })
      };

      const response = await this.axiosInstance.post(endpoint, payload, {
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          if (onMessage) {
            onMessage(text);
          }
        });

        response.data.on('end', () => {
          resolve();
        });

        response.data.on('error', (error: Error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error streaming message from Flowise:', error);
      throw error;
    }
  }

  /**
   * Upload files to Flowise
   */
  async uploadFiles(files: File[], chatflowId?: string): Promise<string[]> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const endpoint = `/api/v1/get-upload-file`;
      const response = await this.axiosInstance.post<{ data: string[] }>(
        endpoint,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error uploading files to Flowise:', error);
      throw error;
    }
  }
}