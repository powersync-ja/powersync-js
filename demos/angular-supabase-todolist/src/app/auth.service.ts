import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  async isAuthenticated() {
    return !!(await this.supabase.getSession())?.access_token;
  }
}
