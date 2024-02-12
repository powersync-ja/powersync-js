import { Component, Input } from '@angular/core';
import { List, type Todo, type Todos } from '../types';
import { CommonModule } from '@angular/common';
import { ItemComponent } from '../item/item.component';
import { FormBuilder } from '@angular/forms';
import { PowerSyncService, TODOS_TABLE } from '../powersync.service';
import { SupabaseService } from '../supabase.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-list',
  imports: [CommonModule, ItemComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent {
  todos!: Todos | null;
  userId: string | undefined;
  @Input()
  list!: List;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supabase: SupabaseService,
    private readonly powerSync: PowerSyncService,
    private readonly router: Router
  ) {
    this.list = JSON.parse(this.router.getCurrentNavigation()?.finalUrl?.queryParams['list']);
  }

  async ngOnInit() {
    this.userId = (await this.supabase.getSession())?.user.id;
    await this.fetchTodos();
  }

  async fetchTodos() {
    const iterator = this.getTodos();
    for await (const value of iterator) {
      this.todos = value;
    }
  }

  async *getTodos(): AsyncIterable<Todos> {
    for await (const result of this.powerSync.db.watch(
      `
      SELECT * FROM ${TODOS_TABLE} WHERE list_id = ?
      ORDER BY created_at DESC
    `,
      [this.list.id]
    )) {
      yield result.rows?._array || [];
    }
  }

  async addTodo(description: string) {
    if (!this.userId) {
      throw new Error('No user id');
    }
    await this.powerSync.db.execute(
      `
      INSERT INTO ${TODOS_TABLE} (id, created_at, created_by, description, list_id)
      VALUES (uuid(), datetime(), ?, ?, ?)
    `,
      [this.userId, description, this.list.id]
    );
  }

  async remove(todo: Todo) {
    await this.powerSync.db.execute(`DELETE FROM ${TODOS_TABLE} WHERE id = ?`, [todo.id]);
  }
}
