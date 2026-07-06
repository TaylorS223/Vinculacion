import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DbService, FormDefinition } from '../db.service';
import { ThemeService } from '../theme.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-lista-encuestas',
  imports: [RouterLink, CommonModule, TranslatePipe],
  templateUrl: './lista-encuestas.component.html',
  styleUrls: ['./lista-encuestas.component.css']
})
export class ListaEncuestasComponent implements OnInit {
  private db = inject(DbService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  theme = inject(ThemeService);

  formularios: FormDefinition[] = [];
  cargando = true;
  errorCarga = '';

  async ngOnInit() {
    await this.cargarFormularios();
  }

  async cargarFormularios() {
    this.cargando = true;
    this.errorCarga = '';
    try {
      this.formularios = await this.db.forms.toArray();
    } catch {
      this.formularios = [];
    }
    this.cargando = false;
    if (this.formularios.length === 0) {
      this.errorCarga = 'No hay formularios descargados. Presiona "Descargar formulario" en el inicio para sincronizar.';
    }
    this.cdr.detectChanges();
  }

  irALlenar(formId: string) {
    this.router.navigate(['/llenar', formId]);
  }

  trackById(_index: number, form: FormDefinition) {
    return form.id;
  }
}
