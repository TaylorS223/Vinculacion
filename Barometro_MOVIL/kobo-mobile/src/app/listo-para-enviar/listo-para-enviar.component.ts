import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StorageService } from '../storage.service';

@Component({
  selector: 'app-listo-para-enviar',
  imports: [RouterLink, CommonModule],
  templateUrl: './listo-para-enviar.component.html',
  styleUrls: ['./listo-para-enviar.component.css']
})
export class ListoParaEnviarComponent implements OnInit {
  formularios: any[] = [];
  seleccionados = new Set<number>();
  sending: boolean = false;
  totalToSend: number = 0;
  sentCount: number = 0;
  progressPercent: number = 0;

  constructor(private storage: StorageService, private router: Router) {}

  ngOnInit() {
    this.formularios = this.storage.obtenerFormularios().filter(f => f.estado === 'listo-para-enviar');
  }

  isSeleccionado(formulario: any) {
    return this.seleccionados.has(formulario.id);
  }

  toggleSeleccion(formulario: any) {
    if (this.seleccionados.has(formulario.id)) {
      this.seleccionados.delete(formulario.id);
    } else {
      this.seleccionados.add(formulario.id);
    }
  }

  seleccionarTodo() {
    if (this.seleccionados.size === this.formularios.length) {
      this.seleccionados.clear();
      return;
    }

    this.formularios.forEach(form => this.seleccionados.add(form.id));
  }

  async enviarSeleccionados() {
    if (this.seleccionados.size === 0) {
      alert('Selecciona al menos un formulario para enviar.');
      return;
    }

    const ids = Array.from(this.seleccionados);
    this.sending = true;
    this.totalToSend = ids.length;
    this.sentCount = 0;
    this.progressPercent = 0;

    for (const id of ids) {
      // Simular envío (aquí reemplazar por llamada real si se integra servidor)
      await this.simulateSend(id);

      // Eliminar cada formulario al enviarlo
      this.storage.eliminarFormulario(id);
      this.sentCount++;
      this.progressPercent = Math.round((this.sentCount / this.totalToSend) * 100);
      this.formularios = this.storage.obtenerFormularios().filter(f => f.estado === 'listo-para-enviar');
    }

    this.seleccionados.clear();
    this.sending = false;
    alert(`Se enviaron ${this.sentCount} formulario(s) correctamente.`);
  }

  simulateSend(id: number) {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), 700));
  }

  volver() {
    this.router.navigate(['/']);
  }
}
