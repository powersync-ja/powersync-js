export class ApiClient {
  private readonly baseUrl: string;
  private readonly headers: any;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  async authenticate(username: string, password: string): Promise<any> {
    // This demo contains plain text password, you should implement more secure methods here
    const requestBody = { username, password };
    const response = await fetch(`${this.baseUrl}/api/auth/`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: this.headers
    });
    if (response.status !== 200) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    return await response.json();
  }

  async register(username: string, password: string) {
    const requestBody = { username, password };
    const response = await fetch(`${this.baseUrl}/api/register/`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: this.headers
    });
    if (response.status !== 200) {
      throw new Error(`Server returned HTTP ${response.status}, ${await response.text()}`);
    }
    return await response.json();
  }

  async getToken(userId: string) {
    const response = await fetch(`${this.baseUrl}/api/get_powersync_token/`, {
      method: 'GET',
      headers: this.headers
    });
    if (response.status !== 200) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    return await response.json();
  }

  async getSession() {
    const response = await fetch(`${this.baseUrl}/api/get_session/`, {
      method: 'GET',
      headers: this.headers
    });
    if (response.status !== 200) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  }

  async update(data: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/upload_data/`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    if (response.status !== 200) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  }

  async upsert(data: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/upload_data/`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    if (response.status !== 200) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  }

  async delete(data: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/upload_data/`, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    if (response.status !== 200) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  }
}
