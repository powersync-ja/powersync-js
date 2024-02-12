import { Component, NgZone, OnInit } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login/login.component';
import { PowerSyncService } from './powersync.service';
import { ListsComponent } from './lists/lists.component';
import { Router, RouterOutlet } from '@angular/router';
import { fromEvent, map, merge } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginComponent, ListsComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'angular-user-management';
  isLoggedIn = false;
  _isOnline = window.navigator.onLine;

  constructor(
    private supabase: SupabaseService,
    private readonly powerSync: PowerSyncService,
    private readonly router: Router,
    private readonly ngZone: NgZone
  ) {}

  async ngOnInit() {
    // Subscribe to online/offline events
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));
    merge(online$, offline$).subscribe((isOnline) => this.ngZone.run(() => (this._isOnline = isOnline)));

    this.supabase.authChanges(async (_, session) => {
      this.supabase.setSession(session);
      this.isLoggedIn = !!session?.access_token;
      if (session?.access_token) {
        if (!this.powerSync.db.connected) {
          await this.powerSync.setupPowerSync(this.supabase);
        }
      }
    });
  }

  async signOut() {
    await this.supabase.signOut();
    this.isLoggedIn = false;
    this.router.navigate(['/login']);
  }
}
