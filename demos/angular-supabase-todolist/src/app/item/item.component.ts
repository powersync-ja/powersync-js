import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type Todo } from '../types';
import { PowerSyncService, TODOS_TABLE } from '../powersync.service';

@Component({
  selector: 'app-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item.component.html',
  styleUrl: './item.component.scss'
})
export class ItemComponent {
  @Input()
  userId!: string;
  @Input()
  todo!: Todo;

  @Output() remove = new EventEmitter<Todo>();

  editable = false;

  constructor(private readonly powerSync: PowerSyncService) {}

  saveTodo(description: string) {
    if (!description) return;
    this.editable = false;
    this.todo.description = description;
  }

  async editTodo(description: string, completed: boolean) {
    if (!description) return;
    this.editable = false;
    const completed_at = this.todo.completed !== completed ? 'completed_at = datetime()' : '';
    await this.powerSync.db.execute(
      `
      UPDATE ${TODOS_TABLE}
      SET description = ?, completed = ?, ${completed_at}
      WHERE id = ?
    `,
      [description, completed, this.todo.id]
    );
  }
}
