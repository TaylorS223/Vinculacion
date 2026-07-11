import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private formularios: any[] = [];

  obtenerCantidad() {
    return this.formularios.length;
  }

  obtenerFormularios() {
    return this.formularios;
  }

  agregarFormulario(formulario: any) {
    this.formularios.push(formulario);
  }

  limpiarFormularios() {
    this.formularios = [];
  }

  eliminarFormularios(ids: number[]) {
    this.formularios = this.formularios.filter(f => !ids.includes(f.id));
  }

  eliminarFormulario(id: number) {
    this.formularios = this.formularios.filter(f => f.id !== id);
  }
}