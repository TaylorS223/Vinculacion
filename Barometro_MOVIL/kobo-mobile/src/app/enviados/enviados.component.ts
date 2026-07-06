import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DbService, SavedResponse } from '../db.service';
import { ThemeService } from '../theme.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-enviados',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './enviados.component.html',
  styleUrls: ['./enviados.component.css']
})
export class EnviadosComponent implements OnInit {
  private db = inject(DbService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  theme = inject(ThemeService);

  enviados: SavedResponse[] = [];
  cargando = true;

  async ngOnInit() {
    this.enviados = await this.db.responses
      .where('estado')
      .equals('enviado')
      .toArray();
    this.cargando = false;
    this.cdr.detectChanges();
  }

  volver() {
    this.router.navigate(['/']);
  }
}
