import axios, { AxiosResponse } from "axios";
import { Logger } from "../utils/logger";

interface CopperxResponse {
  error?: string;
  [key: string]: any;
}

export class CopperxService {
  constructor(private apiKey: string, private apiUrl: string) {}

  async request(
    method: "GET" | "POST",
    endpoint: string,
    data?: any,
    token?: string
  ): Promise<CopperxResponse> {
    const headers: { [key: string]: string } = {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : `Bearer ${this.apiKey}`,
    };
    const url = `${this.apiUrl}${endpoint}`;

    try {
      Logger.info(`Making ${method} request to ${url} with data:`, data);
      const response: AxiosResponse =
        method === "GET"
          ? await axios.get(url, { headers })
          : await axios.post(url, data, { headers });
      Logger.info(`Response from ${url}:`, response.data);
      return response.data;
    } catch (error: any) {
      Logger.error(`Error in request to ${url}:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return { error: error.response?.data?.message || error.message };
    }
  }
}
