import { Component, Input, OnInit } from '@angular/core';
import { type List, type Lists } from '../types';
import { CommonModule } from '@angular/common';
import { AuthSession } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase.service';
import { FormBuilder } from '@angular/forms';
import { LISTS_TABLE, PowerSyncService } from '../powersync.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.scss'
})
export class ListsComponent implements OnInit {
  lists!: Lists | null;
  @Input()
  session!: AuthSession;
  userId: string | undefined;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly formBuilder: FormBuilder,
    private readonly powerSync: PowerSyncService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    this.userId = (await this.supabase.getSession())?.user.id;
    await this.fetchLists();
  }

  async fetchLists() {
    const iterator = this.getLists();
    for await (const value of iterator) {
      this.lists = value;
    }
  }

  async *getLists(): AsyncIterable<Lists> {
    for await (const result of this.powerSync.db.watch('SELECT * FROM lists ORDER BY created_at DESC')) {
      yield result.rows?._array || [];
    }
  }

  async addList(name: string) {
    if (!name) return;

    if (!this.userId) {
      throw new Error('No user id');
    }

    await this.powerSync.db.execute(
      `INSERT INTO ${LISTS_TABLE} (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?) RETURNING *`,
      [name, this.userId]
    );
  }

  goToTodoList(list: List) {
    this.router.navigate(['/list'], { queryParams: { list: JSON.stringify(list) } });
  }

  async remove(item: List) {
    await this.powerSync.db.execute(`DELETE FROM ${LISTS_TABLE} WHERE id = ?`, [item.id]);
  }
}
