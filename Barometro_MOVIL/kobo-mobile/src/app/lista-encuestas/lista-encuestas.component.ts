import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../storage.service';

@Component({
  selector: 'app-lista-encuestas',
  imports: [RouterLink, CommonModule],
  templateUrl: './lista-encuestas.component.html',
  styleUrls: ['./lista-encuestas.component.css']
})
export class ListaEncuestasComponent implements OnInit {
  formularios: any[] = [];
  seleccionados = new Set<number>();

  constructor(private storage: StorageService) {}

  ngOnInit() {
    this.formularios = this.storage.obtenerFormularios();
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

  enviarSeleccionados() {
    if (this.seleccionados.size === 0) {
      alert('Selecciona al menos un formulario para enviar.');
      return;
    }

    alert(`Se enviaron ${this.seleccionados.size} formulario(s).`);
    this.seleccionados.clear();
  }
}
