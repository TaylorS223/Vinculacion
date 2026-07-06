import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../storage.service';
import { SyncService } from '../sync.service';
import { AuthService } from '../auth.service';
import { SavedResponse } from '../db.service';
import { ThemeService } from '../theme.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-listo-para-enviar',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './listo-para-enviar.component.html',
  styleUrls: ['./listo-para-enviar.component.css']
})
export class ListoParaEnviarComponent implements OnInit {
  private storage = inject(StorageService);
  private sync = inject(SyncService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  theme = inject(ThemeService);

  formularios: SavedResponse[] = [];
  seleccionados = new Set<number>();
  sending = false;
  totalToSend = 0;
  sentCount = 0;
  progressPercent = 0;
  isOnline = navigator.onLine;

  async ngOnInit() {
    this.formularios = (await this.storage.obtenerFormularios())
      .filter(f => f.estado === 'listo-para-enviar');
    this.cdr.detectChanges();
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  isSeleccionado(form: SavedResponse) {
    return form.id !== undefined && this.seleccionados.has(form.id);
  }

  toggleSeleccion(form: SavedResponse) {
    if (form.id === undefined) return;
    if (this.seleccionados.has(form.id)) {
      this.seleccionados.delete(form.id);
    } else {
      this.seleccionados.add(form.id);
    }
  }

  seleccionarTodo() {
    const ids = this.formularios.map(f => f.id!).filter(id => id !== undefined);
    if (this.seleccionados.size === ids.length) {
      this.seleccionados.clear();
      return;
    }
    ids.forEach(id => this.seleccionados.add(id));
  }

  async enviarSeleccionados() {
    if (this.seleccionados.size === 0) {
      alert('Selecciona al menos un formulario para enviar.');
      return;
    }

    if (this.auth.esModoDemo()) {
      const ids = Array.from(this.seleccionados);
      this.sending = true;
      this.totalToSend = ids.length;
      this.sentCount = 0;
      this.progressPercent = 0;

      for (const id of ids) {
        await new Promise(r => setTimeout(r, 700));
        await this.storage.eliminarFormulario(id);
        this.sentCount++;
        this.progressPercent = Math.round((this.sentCount / this.totalToSend) * 100);
        this.formularios = (await this.storage.obtenerFormularios())
          .filter(f => f.estado === 'listo-para-enviar');
        this.cdr.detectChanges();
      }

      this.seleccionados.clear();
      this.sending = false;
      alert(`Se enviaron ${this.sentCount} formulario(s) correctamente.`);
      return;
    }

    if (!this.isOnline) {
      alert('No hay conexión a internet. Los datos se enviarán cuando tengas conexión.');
      return;
    }

    this.sending = true;
    this.totalToSend = this.seleccionados.size;
    this.sentCount = 0;
    this.progressPercent = 0;
    this.cdr.detectChanges();

    const idsSeleccionados = Array.from(this.seleccionados);
    const { enviados, fallos } = await this.sync.enviarPendientes(idsSeleccionados);

    this.sentCount = enviados;
    this.sending = false;

    this.formularios = (await this.storage.obtenerFormularios())
      .filter(f => f.estado === 'listo-para-enviar');
    this.seleccionados.clear();
    this.cdr.detectChanges();

    if (fallos > 0) {
      alert(`Se enviaron ${enviados} formulario(s). ${fallos} fallaron.`);
    } else {
      alert(`Se enviaron ${enviados} formulario(s) correctamente.`);
    }
  }

  volver() {
    this.router.navigate(['/']);
  }
}
